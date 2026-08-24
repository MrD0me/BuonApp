import { Router, Request, Response } from 'express';
import { getDatabase, now, parseRowJson, withTxn } from '../db';
import { randomUUID } from 'crypto';
import { requireRole } from '../middleware/security';
import { notifyKdsUpdate } from '../services/kds';
import { cloudSync } from '../services/cloud-sync';
import {
  defaultTableSize, isTableShape, DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_HEIGHT, ROOM_MARGIN, TABLE_GAP,
} from '../lib/table-geometry';

const router = Router();

const ACTIVE_ORDER_STATUS_SQL = "status NOT IN ('completed', 'cancelled')";

function activeOrderForTable(db: ReturnType<typeof getDatabase>, tableId: string, orderId?: number | string) {
  const whereOrder = orderId ? ' AND id = ?' : '';
  const params = orderId ? [tableId, orderId] : [tableId];
  const order = parseRowJson(db.prepare(`
    SELECT * FROM orders
    WHERE table_id = ? AND ${ACTIVE_ORDER_STATUS_SQL}${whereOrder}
    ORDER BY created_at DESC LIMIT 1
  `).get(...params) as any);
  if (!order?.customer_id) return order;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id);
  return { ...order, customer: customer || null };
}

function tableShape(table: any, activeOrder?: any) {
  const currentOrder = activeOrder || null;
  return {
    ...table,
    name: table.number,
    activeOrder: currentOrder,
    current_order: currentOrder,
  };
}

/** Fields on `tables` a caller may set, beyond the table number itself. */
const OPTIONAL_TABLE_FIELDS = [
  'capacity', 'section', 'room_id', 'position_x', 'position_y', 'width', 'height', 'shape', 'kitchen_station_id',
] as const;
/** Numeric map geometry, validated as finite and non-negative before it is written. */
const NUMERIC_TABLE_FIELDS = new Set(['capacity', 'position_x', 'position_y', 'width', 'height']);

function hasField(body: any, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body || {}, field);
}

/**
 * The table an order was served at. Prefers the live row, so a rename shows up
 * immediately, and falls back to the labels the order captured at creation once
 * the table has been deleted — routine here, since the room gets rebuilt daily.
 * Returns null only for orders that never had a table (takeaway, delivery).
 * See docs/table-management.md.
 */
export function resolveOrderTable(order: any, tableRow?: any | null) {
  if (tableRow) return { ...tableRow, name: tableRow.number };
  if (order?.table_label) {
    return {
      id: null,
      number: order.table_label,
      name: order.table_label,
      floor: order.room_label ?? null,
      is_deleted: true,
    };
  }
  return null;
}

/**
 * The name of the room a table sits in. Rooms superseded the free-text `floor`
 * in phase 2, but a database restored from an older backup can still be carrying
 * the old value, so fall back to it rather than labelling an order with nothing.
 */
export function tableRoomName(db: ReturnType<typeof getDatabase>, table: any): string | null {
  if (!table) return null;
  if (table.room_id) {
    const room = db.prepare('SELECT name FROM rooms WHERE id = ?').get(table.room_id) as { name?: string } | undefined;
    if (room?.name) return room.name;
  }
  return table.floor ?? null;
}

/** A table's number and room name, as an order should record them. */
export function tableLabelSource(db: ReturnType<typeof getDatabase>, tableId: string): { number: string; room: string | null } | null {
  const row = db.prepare('SELECT number, room_id, floor FROM tables WHERE id = ?').get(tableId) as any;
  if (!row) return null;
  return { number: row.number, room: tableRoomName(db, row) };
}

/**
 * Attach each table's active order (and its customer) in three queries instead
 * of two per table. The map draws every table in a room at once, so the old
 * per-row lookup turned one screen into a hundred queries per refresh.
 */
export function hydrateTables(db: ReturnType<typeof getDatabase>, rows: any[]): any[] {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (ids.length === 0) return rows.map((row) => tableShape(row));

  const placeholders = ids.map(() => '?').join(',');
  // Ascending, overwriting as we go, leaves the most recent open order per
  // table — the same row the single-table query picked with DESC LIMIT 1.
  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE table_id IN (${placeholders}) AND ${ACTIVE_ORDER_STATUS_SQL}
    ORDER BY created_at ASC, id ASC
  `).all(...ids) as any[];

  const orderByTable = new Map<string, any>();
  for (const order of orders) orderByTable.set(String(order.table_id), parseRowJson(order));

  const customerIds = Array.from(new Set([...orderByTable.values()].map((order) => order.customer_id).filter(Boolean)));
  const customersById = new Map<string, any>();
  if (customerIds.length > 0) {
    const customerPlaceholders = customerIds.map(() => '?').join(',');
    const customers = db.prepare(`SELECT * FROM customers WHERE id IN (${customerPlaceholders})`).all(...customerIds) as any[];
    for (const customer of customers) customersById.set(String(customer.id), customer);
  }

  return rows.map((row) => {
    const order = orderByTable.get(String(row.id));
    if (!order) return tableShape(row);
    const withCustomer = order.customer_id
      ? { ...order, customer: customersById.get(String(order.customer_id)) || null }
      : order;
    return tableShape(row, withCustomer);
  });
}

/** A finite, non-negative number, or null when the value is not one. */
function positiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * The room a new table belongs to: the one asked for, else the first room, else
 * a freshly created one. A table always has somewhere to be drawn.
 */
export function resolveRoomForNewTable(db: ReturnType<typeof getDatabase>, requestedRoomId?: unknown): string {
  if (typeof requestedRoomId === 'string' && requestedRoomId) {
    const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(requestedRoomId) as { id?: string } | undefined;
    if (room?.id) return room.id;
  }
  const first = db.prepare('SELECT id FROM rooms WHERE is_active = 1 ORDER BY sort_order, name LIMIT 1').get() as { id?: string } | undefined;
  if (first?.id) return first.id;

  const id = `room-${randomUUID().slice(0, 8)}`;
  const stamp = now();
  db.prepare(`
    INSERT INTO rooms (id, name, sort_order, width, height, created_at, updated_at)
    VALUES (?, 'Main room', 0, ?, ?, ?, ?)
  `).run(id, DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_HEIGHT, stamp, stamp);
  return id;
}

/**
 * First spot in the room where a table of this size does not sit on top of
 * another one. Scanning beats appending to a grid, because after any dragging
 * the existing tables are nowhere near grid order.
 */
export function findFreeSlot(
  db: ReturnType<typeof getDatabase>,
  roomId: string,
  width: number,
  height: number,
): { x: number; y: number } {
  const room = db.prepare('SELECT width, height FROM rooms WHERE id = ?').get(roomId) as { width?: number; height?: number } | undefined;
  const roomWidth = room?.width || DEFAULT_ROOM_WIDTH;
  const roomHeight = room?.height || DEFAULT_ROOM_HEIGHT;
  const occupied = db.prepare(`
    SELECT COALESCE(position_x, 0) AS x, COALESCE(position_y, 0) AS y,
           COALESCE(width, 150) AS w, COALESCE(height, 110) AS h
    FROM tables WHERE room_id = ?
  `).all(roomId) as { x: number; y: number; w: number; h: number }[];

  const breathing = TABLE_GAP / 2;
  const collides = (x: number, y: number) => occupied.some((other) => (
    x < other.x + other.w + breathing
    && x + width + breathing > other.x
    && y < other.y + other.h + breathing
    && y + height + breathing > other.y
  ));

  const step = 20;
  for (let y = ROOM_MARGIN; y + height + ROOM_MARGIN <= roomHeight; y += step) {
    for (let x = ROOM_MARGIN; x + width + ROOM_MARGIN <= roomWidth; x += step) {
      if (!collides(x, y)) return { x, y };
    }
  }
  // Room is full at this size. Drop it in the corner rather than refusing to
  // create the table — the floor can drag it or make the room bigger.
  return { x: ROOM_MARGIN, y: ROOM_MARGIN };
}

export type TableDeletionBlocker = 'table_has_open_order' | 'table_has_held_cart';

/**
 * Why this table cannot be deleted yet, or null if it can go. Live surfaces —
 * KDS, checkout, held carts — resolve a table through its live row, so anything
 * still pointing at it has to be settled first. History does not count: orders
 * carry their own label snapshot.
 */
export function tableDeletionBlocker(
  db: ReturnType<typeof getDatabase>,
  tableId: string,
): TableDeletionBlocker | null {
  const activeOrder = db.prepare(`SELECT id FROM orders WHERE table_id = ? AND ${ACTIVE_ORDER_STATUS_SQL}`).get(tableId);
  if (activeOrder) return 'table_has_open_order';
  const heldOrder = db.prepare('SELECT id FROM held_orders WHERE table_id = ?').get(tableId);
  if (heldOrder) return 'table_has_held_cart';
  return null;
}

/**
 * Delete a table row, releasing its history first. Callers must have checked
 * `tableDeletionBlocker()` and must already be inside a transaction.
 */
export function deleteTableRow(db: ReturnType<typeof getDatabase>, table: any): void {
  // Stamp any history that predates the snapshot columns before the link is
  // cut, so no past order is left without a table to name.
  db.prepare(`
    UPDATE orders SET
      table_label = COALESCE(table_label, ?),
      room_label = COALESCE(room_label, ?)
    WHERE table_id = ?
  `).run(table.number, tableRoomName(db, table), table.id);
  db.prepare('UPDATE orders SET table_id = NULL, updated_at = ? WHERE table_id = ?').run(now(), table.id);
  db.prepare('DELETE FROM tables WHERE id = ?').run(table.id);
}

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    let query = 'SELECT * FROM tables WHERE 1=1';
    const params: any[] = [];

    if (req.query.status) {
      query += ' AND status = ?';
      params.push(req.query.status);
    }
    if (req.query.room_id) {
      query += ' AND room_id = ?';
      params.push(req.query.room_id);
    }
    if (req.query.section) {
      query += ' AND section = ?';
      params.push(req.query.section);
    }
    if (req.query.kitchen_station_id) {
      query += ' AND kitchen_station_id = ?';
      params.push(req.query.kitchen_station_id);
    }
    if (req.query.active === 'true' || req.query.active === '1') {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY number';

    const rows = db.prepare(query).all(...params) as any[];
    // Normalize: frontend expects `name`, schema column is `number`
    res.json({ tables: hydrateTables(db, rows) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const activeOrder = activeOrderForTable(db, req.params.id as string);

    // Normalize: frontend expects `name`, schema column is `number`
    res.json({ table: tableShape(table as any, activeOrder) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    // Accept `number` (schema column) or `name` (legacy frontend field)
    const body = req.body || {};
    const tableNumber = String(body.number ?? body.name ?? '').trim();

    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }

    const capacity = body.capacity === undefined || body.capacity === null || body.capacity === ''
      ? 4
      : Number(body.capacity);
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 99) {
      return res.status(400).json({ error: 'capacity must be a whole number between 1 and 99' });
    }
    if (body.shape !== undefined && !isTableShape(body.shape)) {
      return res.status(400).json({ error: 'shape must be rect or round' });
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM tables WHERE number = ?').get(tableNumber) as any;
    if (existing) {
      if (existing.is_active === 0) {
        return res.status(400).json({ error: `Table ${tableNumber} already exists but is deactivated. Please reactivate it from the list.` });
      } else {
        return res.status(400).json({ error: 'Table number already exists' });
      }
    }

    const shape = isTableShape(body.shape) ? body.shape : 'rect';
    const fallbackSize = defaultTableSize(capacity, shape);
    const width = positiveNumber(body.width) ?? fallbackSize.width;
    const height = positiveNumber(body.height) ?? fallbackSize.height;

    const tableId = `tbl-${randomUUID().slice(0, 8)}`;
    const created = withTxn(() => {
      const roomId = resolveRoomForNewTable(db, body.room_id);
      // An unplaced table would be invisible under whatever sits at the origin,
      // so give it the first free spot in the room it joins.
      const requestedX = positiveNumber(body.position_x);
      const requestedY = positiveNumber(body.position_y);
      const slot = requestedX !== null && requestedY !== null
        ? { x: requestedX, y: requestedY }
        : findFreeSlot(db, roomId, width, height);

      const stamp = now();
      db.prepare(`
        INSERT INTO tables (id, number, capacity, room_id, section, position_x, position_y, width, height, shape,
          kitchen_station_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tableId, tableNumber, capacity, roomId, body.section || null,
        slot.x, slot.y, width, height, shape, body.kitchen_station_id || null, stamp, stamp,
      );
      return db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as any;
    });

    res.status(201).json({ table: tableShape(created) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put('/:id', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const db = getDatabase();

    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Accept `number` (schema column) or `name` (legacy frontend field).
    const renaming = hasField(body, 'number') || hasField(body, 'name');
    const tableNumber = String((hasField(body, 'number') ? body.number : body.name) ?? '').trim();
    if (renaming) {
      if (!tableNumber) {
        return res.status(400).json({ error: 'Table number is required' });
      }
      const clash = db.prepare('SELECT id FROM tables WHERE number = ? AND id != ?').get(tableNumber, req.params.id);
      if (clash) {
        return res.status(400).json({ error: 'Table number already exists' });
      }
    }

    if (hasField(body, 'capacity')) {
      const capacity = Number(body.capacity);
      if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 99) {
        return res.status(400).json({ error: 'capacity must be a whole number between 1 and 99' });
      }
    }
    if (hasField(body, 'shape') && !isTableShape(body.shape)) {
      return res.status(400).json({ error: 'shape must be rect or round' });
    }
    if (hasField(body, 'room_id') && body.room_id) {
      const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(body.room_id);
      if (!room) {
        return res.status(400).json({ error: 'Room not found' });
      }
    }
    for (const field of ['position_x', 'position_y', 'width', 'height'] as const) {
      if (hasField(body, field) && body[field] !== null && positiveNumber(body[field]) === null) {
        return res.status(400).json({ error: `${field} must be a non-negative number` });
      }
    }

    // Only touch what the caller actually sent. The previous COALESCE(?, col)
    // form turned every null into a no-op, so a floor or a section could be set
    // once and never cleared again.
    const assignments: string[] = [];
    const values: any[] = [];
    if (renaming) {
      assignments.push('number = ?');
      values.push(tableNumber);
    }
    for (const field of OPTIONAL_TABLE_FIELDS) {
      if (!hasField(body, field)) continue;
      assignments.push(`${field} = ?`);
      const raw = body[field] === '' ? null : body[field];
      values.push(NUMERIC_TABLE_FIELDS.has(field) && raw !== null ? Number(raw) : raw);
    }

    if (assignments.length === 0) {
      return res.json({ table: tableShape(table, activeOrderForTable(db, req.params.id as string)) });
    }

    const updated = withTxn(() => {
      const nowStr = now();
      db.prepare(`UPDATE tables SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`)
        .run(...values, nowStr, req.params.id);
      const row = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
      // An order still in service follows its table's new name; a closed one
      // keeps the label it was actually served under, which is the whole point
      // of the snapshot. See docs/table-management.md.
      db.prepare(`
        UPDATE orders SET table_label = ?, room_label = ?, updated_at = ?
        WHERE table_id = ? AND ${ACTIVE_ORDER_STATUS_SQL}
      `).run(row.number, tableRoomName(db, row), nowStr, req.params.id);
      return row;
    });

    res.json({ table: tableShape(updated, activeOrderForTable(db, req.params.id as string)) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Delete a table for real. Safe because every order carries its own
 * `table_label`/`room_label` snapshot: cutting `table_id` releases the row
 * without blanking the table out of history. Blocked while anything live still
 * points at the table, since those surfaces (KDS, checkout, held carts) resolve
 * it through the live row.
 */
router.delete('/:id', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tableId = req.params.id as string;

    const deleted = withTxn(() => {
      const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as any;
      if (!table) {
        throw Object.assign(new Error('Table not found'), { status: 404 });
      }

      const blocker = tableDeletionBlocker(db, tableId);
      if (blocker === 'table_has_open_order') {
        throw Object.assign(new Error('Cannot delete a table with an open order. Close or move the order first.'), {
          status: 409,
          code: blocker,
        });
      }
      if (blocker === 'table_has_held_cart') {
        throw Object.assign(new Error('Cannot delete a table with a held cart. Clear the held cart first.'), {
          status: 409,
          code: blocker,
        });
      }

      deleteTableRow(db, table);
      return table;
    });

    res.json({ deleted: { id: deleted.id, name: deleted.number } });
  } catch (error: any) {
    const statusCode = error.status || 500;
    if (statusCode >= 500) console.error('[API] Table delete failed:', error);
    res.status(statusCode).json({
      error: statusCode >= 500 ? 'Internal server error' : error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
});

router.post('/:id/deactivate', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    if (table.is_active === 0) {
      return res.status(400).json({ error: 'Already deactivated' });
    }

    const activeOrder = db.prepare(`
      SELECT * FROM orders WHERE table_id = ? AND ${ACTIVE_ORDER_STATUS_SQL}
    `).get(req.params.id);
    if (activeOrder) {
      return res.status(400).json({ error: 'Cannot deactivate table with active orders' });
    }

    db.prepare('UPDATE tables SET is_active = 0, updated_at = ? WHERE id = ?').run(now(), req.params.id);
    const updated = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    res.json({ table: tableShape(updated as any) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/:id/reactivate', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    if (table.is_active === 1) {
      return res.status(400).json({ error: 'Already active' });
    }

    db.prepare('UPDATE tables SET is_active = 1, updated_at = ? WHERE id = ?').run(now(), req.params.id);
    const updated = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    res.json({ table: tableShape(updated as any) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/:id/move-order', requireRole('owner', 'manager', 'cashier', 'server'), (req: Request, res: Response) => {
  try {
    const sourceTableId = req.params.id as string;
    const { target_table_id, order_id } = req.body;

    if (!target_table_id) {
      return res.status(400).json({ error: 'target_table_id is required' });
    }
    if (target_table_id === sourceTableId) {
      return res.status(400).json({ error: 'Order is already on this table' });
    }

    const db = getDatabase();
    const moved = withTxn(() => {
      const sourceTable = db.prepare('SELECT * FROM tables WHERE id = ?').get(sourceTableId) as any;
      if (!sourceTable) {
        const error: any = new Error('Source table not found');
        error.status = 404;
        throw error;
      }

      const targetTable = db.prepare('SELECT * FROM tables WHERE id = ?').get(target_table_id) as any;
      if (!targetTable) {
        const error: any = new Error('Target table not found');
        error.status = 404;
        throw error;
      }

      const order = activeOrderForTable(db, sourceTableId, order_id) as any;
      if (!order) {
        const error: any = new Error(order_id ? 'Active order not found on source table' : 'Source table has no active order');
        error.status = 404;
        throw error;
      }

      const targetActiveOrder = activeOrderForTable(db, target_table_id) as any;
      if (targetActiveOrder) {
        const error: any = new Error('Target table already has an active order');
        error.status = 409;
        throw error;
      }

      const nowStr = now();
      // The label snapshot moves with the order, otherwise a reprint after the
      // source table is gone would still name the table the guests left.
      db.prepare('UPDATE orders SET table_id = ?, table_label = ?, room_label = ?, type = ?, updated_at = ? WHERE id = ?')
        .run(target_table_id, targetTable.number, tableRoomName(db, targetTable), order.type, nowStr, order.id);
      db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ?")
        .run(nowStr, sourceTableId);
      db.prepare("UPDATE tables SET status = 'occupied', updated_at = ? WHERE id = ?")
        .run(nowStr, target_table_id);

      const updatedOrder = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as any);
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      const updatedSource = db.prepare('SELECT * FROM tables WHERE id = ?').get(sourceTableId) as any;
      const updatedTarget = db.prepare('SELECT * FROM tables WHERE id = ?').get(target_table_id) as any;

      return {
        order: {
          ...updatedOrder,
          items,
          table: { ...updatedTarget, name: updatedTarget.number },
        },
        sourceTable: tableShape(updatedSource, activeOrderForTable(db, sourceTableId)),
        targetTable: tableShape(updatedTarget, activeOrderForTable(db, target_table_id)),
      };
    });

    cloudSync.recordOrderChanged(moved.order.id, 'order.table_moved');
    notifyKdsUpdate();

    res.json({
      order: moved.order,
      sourceTable: moved.sourceTable,
      targetTable: moved.targetTable,
    });
  } catch (error: any) {
    const statusCode = error.status || 500;
    console.error('[API] Table move failed:', error);
    res.status(statusCode).json({ error: statusCode >= 500 ? 'Table move failed' : error.message });
  }
});

router.patch('/:id/status', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'held'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` });
    }

    const db = getDatabase();
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    db.prepare('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now(), req.params.id);

    const updated = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    res.json({ table: updated });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const tableRoutes = router;
