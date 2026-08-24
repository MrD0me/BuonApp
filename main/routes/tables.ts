import { Router, Request, Response } from 'express';
import { getDatabase, now, parseRowJson, withTxn } from '../db';
import { randomUUID } from 'crypto';
import { requireRole } from '../middleware/security';
import { notifyKdsUpdate } from '../services/kds';
import { cloudSync } from '../services/cloud-sync';

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
const OPTIONAL_TABLE_FIELDS = ['capacity', 'floor', 'section', 'position_x', 'position_y', 'kitchen_station_id'] as const;

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
  `).run(table.number, table.floor, table.id);
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
    if (req.query.floor) {
      query += ' AND floor = ?';
      params.push(req.query.floor);
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

    const rows = db.prepare(query).all(...params);
    // Normalize: frontend expects `name`, schema column is `number`
    const tables = rows.map((t: any) => tableShape(t, activeOrderForTable(db, t.id)));
    res.json({ tables });
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
    const { number, name, capacity, floor, section, position_x, position_y, kitchen_station_id } = req.body;
    const tableNumber = number || name;

    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
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

    const tableId = `tbl-${randomUUID().slice(0, 8)}`;
    const result = db.prepare(`
      INSERT INTO tables (id, number, capacity, floor, section, position_x, position_y, kitchen_station_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tableId, tableNumber, capacity || 4, floor || null, section || null,
      position_x || null, position_y || null, kitchen_station_id || null, now(), now()
    );

    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as any;
    res.status(201).json({ table: tableShape(table) });
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
      values.push(field === 'capacity' ? Number(body[field]) : (body[field] === '' ? null : body[field]));
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
      `).run(row.number, row.floor, nowStr, req.params.id);
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
        .run(target_table_id, targetTable.number, targetTable.floor, order.type, nowStr, order.id);
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
