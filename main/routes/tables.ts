import { Router, Request, Response } from 'express';
import { getDatabase, now, parseRowJson, withTxn } from '../db';
import { randomUUID } from 'crypto';
import { requireRole } from '../middleware/security';
import { notifyKdsUpdate } from '../services/kds';
import { cloudSync } from '../services/cloud-sync';
import {
  defaultTableSize, isTableShape, DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_HEIGHT, ROOM_MARGIN, TABLE_GAP,
} from '../lib/table-geometry';
import {
  activeReservationForTable, activeReservationsByTable, reserveTable, cancelReservationForTable,
  normalizeBookedTime,
} from '../services/reservations';
import {
  ACTIVE_ORDER_STATUS_SQL, tableRoomName, tableLabelSource, tableDeletionBlocker, deleteTableRow,
  resolveRoomForNewTable, findFreeSlot, tableMergeBlocker, mergeTables, splitTableGroup, groupCapacity,
} from '../services/tables';
import { getOrOpenServiceDay } from '../services/service-day';

// Re-exported so existing importers of the table domain keep working.
export { tableRoomName, tableLabelSource, tableDeletionBlocker, deleteTableRow, resolveRoomForNewTable, findFreeSlot };
export { tableMergeBlocker, mergeTables, splitTableGroup, groupCapacity };
export type { TableDeletionBlocker } from '../services/tables';

const router = Router();

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

function tableShape(table: any, activeOrder?: any, reservation?: any) {
  const currentOrder = activeOrder || null;
  return {
    ...table,
    name: table.number,
    activeOrder: currentOrder,
    current_order: currentOrder,
    reservation: reservation || null,
  };
}

/** Fields on `tables` a caller may set, beyond the table number itself. */
const OPTIONAL_TABLE_FIELDS = [
  'capacity', 'section', 'room_id', 'position_x', 'position_y', 'width', 'height', 'shape', 'kitchen_station_id',
] as const;
/** Why a table refused to be folded in, in words the floor can act on. */
const MERGE_REASONS: Record<string, string> = {
  table_has_open_order: 'is serving an order',
  table_has_held_cart: 'has a held cart',
  table_has_reservation: 'has a booking',
  table_already_merged: 'is already part of a group',
  table_leads_group: 'already leads a group',
};

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
 * Attach each table's active order (and its customer) in three queries instead
 * of two per table. The map draws every table in a room at once, so the old
 * per-row lookup turned one screen into a hundred queries per refresh.
 */
export function hydrateTables(db: ReturnType<typeof getDatabase>, rows: any[]): any[] {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (ids.length === 0) return rows.map((row) => tableShape(row));
  const reservationsByTable = activeReservationsByTable(db, ids);

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
    const reservation = reservationsByTable.get(String(row.id)) || null;
    const order = orderByTable.get(String(row.id));
    if (!order) return tableShape(row, null, reservation);
    const withCustomer = order.customer_id
      ? { ...order, customer: customersById.get(String(order.customer_id)) || null }
      : order;
    return tableShape(row, withCustomer, reservation);
  });
}

/** A finite, non-negative number, or null when the value is not one. */
function positiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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
    const reservation = activeReservationForTable(db, req.params.id as string);

    // Normalize: frontend expects `name`, schema column is `number`
    res.json({ table: tableShape(table as any, activeOrder, reservation) });
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

/**
 * Join tables for one party. The table in the path leads the group and is where
 * the order goes; the others are folded into it until they are split off.
 */
router.post('/:id/merge', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const leaderId = req.params.id as string;
    const requested: unknown = (req.body || {}).table_ids;
    const childIds = Array.isArray(requested) ? requested.map(String).filter((id) => id && id !== leaderId) : [];
    if (childIds.length === 0) {
      return res.status(400).json({ error: 'table_ids must list at least one other table', code: 'merge_needs_tables' });
    }

    const merged = withTxn(() => {
      const leader = db.prepare('SELECT * FROM tables WHERE id = ?').get(leaderId) as any;
      if (!leader) throw Object.assign(new Error('Table not found'), { status: 404 });
      if (leader.merged_into) {
        throw Object.assign(new Error('This table is already part of a group. Split it first.'), {
          status: 409, code: 'table_already_merged',
        });
      }

      for (const childId of childIds) {
        const child = db.prepare('SELECT * FROM tables WHERE id = ?').get(childId) as any;
        if (!child) throw Object.assign(new Error(`Table ${childId} not found`), { status: 404 });
        const blocker = tableMergeBlocker(db, childId);
        if (blocker) {
          throw Object.assign(new Error(`${child.number} ${MERGE_REASONS[blocker]}.`), { status: 409, code: blocker });
        }
      }

      mergeTables(db, leaderId, childIds);
      return db.prepare('SELECT * FROM tables WHERE id = ?').get(leaderId) as any;
    });

    res.json({
      table: tableShape(merged, activeOrderForTable(db, leaderId), activeReservationForTable(db, leaderId)),
      group_capacity: groupCapacity(db, leaderId),
      merged: childIds.length,
    });
  } catch (error: any) {
    const status = error.status || 500;
    if (status >= 500) console.error('[API] Table merge failed:', error);
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
});

/** Break a group up. Works from the leader or from any member. */
router.post('/:id/split', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const released = withTxn(() => splitTableGroup(db, req.params.id as string));
    if (released === 0) {
      return res.status(400).json({ error: 'This table is not part of a group.', code: 'not_merged' });
    }
    res.json({ released });
  } catch (error: any) {
    console.error('[API] Table split failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Book a table for the service being run now. Re-posting replaces the standing
 * booking, which is how a name or a head count gets corrected.
 */
router.post('/:id/reserve', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const db = getDatabase();

    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const name = String(body.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'A name is required to reserve a table.', code: 'reservation_name_required' });

    const guests = body.guests === undefined || body.guests === null || body.guests === '' ? 2 : Number(body.guests);
    if (!Number.isSafeInteger(guests) || guests < 1 || guests > 99) {
      return res.status(400).json({ error: 'guests must be a whole number between 1 and 99' });
    }

    const bookedTime = normalizeBookedTime(body.booked_time);
    if (bookedTime === undefined) {
      return res.status(400).json({ error: 'booked_time must be HH:MM', code: 'reservation_time_invalid' });
    }

    const activeOrder = db.prepare(`SELECT id FROM orders WHERE table_id = ? AND ${ACTIVE_ORDER_STATUS_SQL}`).get(req.params.id);
    if (activeOrder) {
      return res.status(409).json({ error: 'This table is already serving an order.', code: 'table_has_open_order' });
    }

    const reservation = withTxn(() => {
      const serviceDay = getOrOpenServiceDay(db, (req as any).user?.userId);
      return reserveTable(db, req.params.id as string, serviceDay.id, {
        name: name.slice(0, 120),
        guests,
        bookedTime,
        phone: typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) || null : null,
        notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) || null : null,
        customerId: body.customer_id ? String(body.customer_id) : null,
        createdBy: (req as any).user?.userId || null,
      });
    });

    const updated = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    res.status(201).json({ reservation, table: tableShape(updated, null, reservation) });
  } catch (error: any) {
    console.error('[API] Table reserve failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** Drop the standing booking on a table. */
router.delete('/:id/reserve', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const cancelled = withTxn(() => cancelReservationForTable(db, req.params.id as string));
    if (!cancelled) return res.status(404).json({ error: 'This table has no booking.', code: 'no_reservation' });

    const updated = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    res.json({ reservation: cancelled, table: tableShape(updated, activeOrderForTable(db, req.params.id as string)) });
  } catch (error: any) {
    console.error('[API] Table reservation cancel failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['available', 'occupied', 'cleaning', 'held'];
    if (status === 'reserved') {
      // Reserved is not a state you assert, it is what having a booking looks
      // like. Setting it here used to leave tables marked reserved with nothing
      // behind them, which is exactly what migration v76 had to clean up.
      return res.status(400).json({
        error: 'Use POST /tables/:id/reserve to reserve a table.',
        code: 'reserve_via_booking',
      });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` });
    }

    const db = getDatabase();
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const updated = withTxn(() => {
      // Freeing a reserved table means the party is not coming, or is already
      // seated; either way the booking stops standing.
      if (status === 'available') cancelReservationForTable(db, req.params.id as string);
      db.prepare('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, now(), req.params.id);
      return db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id) as any;
    });

    res.json({ table: tableShape(updated, activeOrderForTable(db, req.params.id as string)) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const tableRoutes = router;
