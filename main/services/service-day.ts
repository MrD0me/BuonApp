/**
 * Service days — the business-day cycle (phase 3 of docs/table-management.md).
 *
 * A restaurant's day is not the UTC date. A service that opens at 19:00 and
 * takes its last order at 01:30 is one evening, and reports that bucket by
 * `date(created_at)` split it in two. Every order is therefore stamped with the
 * id of the day that was open when it was placed, and the day itself is opened
 * and closed explicitly.
 *
 * The close is a ritual, not a flag flip: it refuses to run while anything is
 * unsettled, freezes the day's totals so a later edit cannot rewrite history,
 * snapshots the room, and resets the floor for tomorrow.
 */

import { getDatabase, now, businessDateToday, parseRowJson } from '../db';
import { randomUUID } from 'crypto';
import { tableDeletionBlocker, deleteTableRow } from './tables';
import { expireOpenReservations } from './reservations';

type Db = ReturnType<typeof getDatabase>;

export interface ServiceDayRow {
  id: string;
  business_date: string;
  status: 'open' | 'closed';
  opened_at: string;
  opened_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  summary: string | null;
  layout_snapshot: string | null;
}

export interface ServiceDaySummary {
  orders: { total: number; completed: number; cancelled: number };
  covers: number;
  bills: { count: number; paid: number; unpaid: number };
  takings: { total: number; byMethod: { method: string; count: number; total: number }[] };
  discounts: number;
  topProducts: { name: string; quantity: number; total: number }[];
}

export interface ServiceDayBlockers {
  openOrders: { id: number; order_number: string; status: string; table_label: string | null }[];
  unpaidBills: { id: number; bill_number: string; total: number; paid_amount: number }[];
}

const OPEN_ORDER_SQL = "status NOT IN ('completed', 'cancelled')";

/** Money coming back out of SQL SUM() over REAL columns, trimmed to cents. */
function money(value: unknown): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export function getOpenServiceDay(db: Db): ServiceDayRow | null {
  return (db.prepare("SELECT * FROM service_days WHERE status = 'open' LIMIT 1").get() as ServiceDayRow) || null;
}

export function getServiceDay(db: Db, id: string): ServiceDayRow | null {
  return (db.prepare('SELECT * FROM service_days WHERE id = ?').get(id) as ServiceDayRow) || null;
}

/**
 * The day orders should be filed under, opening one if none is running.
 *
 * Opening implicitly is deliberate: an offline-first till must never refuse an
 * order because nobody pressed a button this morning. The explicit open exists
 * so the day can be started with an operator attached, not to gate service.
 */
export function getOrOpenServiceDay(db: Db, userId?: string | null): ServiceDayRow {
  const existing = getOpenServiceDay(db);
  if (existing) return existing;

  const stamp = now();
  const businessDate = businessDateToday();
  const id = `sd-${businessDate.replace(/-/g, '')}-${randomUUID().slice(0, 6)}`;
  try {
    db.prepare(`
      INSERT INTO service_days (id, business_date, status, opened_at, opened_by, created_at, updated_at)
      VALUES (?, ?, 'open', ?, ?, ?, ?)
    `).run(id, businessDate, stamp, userId || null, stamp, stamp);
  } catch (error) {
    // The partial unique index on status='open' is the authority on "one day at
    // a time". If something opened one between the read and the write, take it.
    const raced = getOpenServiceDay(db);
    if (!raced) throw error;
    return raced;
  }
  return getServiceDay(db, id) as ServiceDayRow;
}

/** Orders and bills that must be settled before the day can close. */
export function getServiceDayBlockers(db: Db, serviceDayId: string): ServiceDayBlockers {
  const openOrders = db.prepare(`
    SELECT id, order_number, status, table_label
    FROM orders WHERE service_day_id = ? AND ${OPEN_ORDER_SQL}
    ORDER BY created_at
  `).all(serviceDayId) as ServiceDayBlockers['openOrders'];

  const unpaidBills = db.prepare(`
    SELECT b.id, b.bill_number, b.total, b.paid_amount
    FROM bills b JOIN orders o ON o.id = b.order_id
    WHERE o.service_day_id = ? AND b.payment_status != 'paid'
    ORDER BY b.created_at
  `).all(serviceDayId) as ServiceDayBlockers['unpaidBills'];

  return { openOrders, unpaidBills };
}

/**
 * Payment split for one day's bills. Mirrors the range-scoped breakdown in
 * `main/routes/reports.ts` — same JSON1 expansion, tolerating both the current
 * array shape and legacy top-level objects — but scoped by service day, which
 * is a link rather than a time window and so cannot be expressed as a range.
 */
function paymentBreakdown(db: Db, serviceDayId: string) {
  return db.prepare(`
    WITH payment_lines AS (
      SELECT je.value AS line
      FROM bills b
      JOIN orders o ON o.id = b.order_id
      JOIN json_each(CASE
        WHEN json_valid(b.payment_details) AND json_type(b.payment_details) = 'array'
          THEN b.payment_details
        WHEN json_valid(b.payment_details)
          THEN json_array(b.payment_details)
        ELSE '[]'
      END) je
      WHERE o.service_day_id = ?
        AND b.payment_details IS NOT NULL
        AND b.payment_status = 'paid'
        AND json_type(je.value) = 'object'
    ), normalized AS (
      SELECT
        COALESCE(NULLIF(json_extract(line, '$.method'), ''), 'unknown') AS method,
        CAST(json_extract(line, '$.payment_method_id') AS INTEGER) AS payment_method_id,
        json_extract(line, '$.amount') AS amount
      FROM payment_lines
    )
    SELECT COALESCE(pm.name, normalized.method) AS method, COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN typeof(amount) IN ('integer', 'real') THEN amount ELSE 0 END), 0) AS total
    FROM normalized LEFT JOIN payment_methods pm ON pm.id = normalized.payment_method_id
    GROUP BY COALESCE(pm.name, normalized.method)
    ORDER BY total DESC
  `).all(serviceDayId) as { method: string; count: number; total: number }[];
}

/** Totals computed live from the day's linked rows. */
export function computeServiceDaySummary(db: Db, serviceDayId: string): ServiceDaySummary {
  const orders = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
      COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN COALESCE(guest_count, 0) ELSE 0 END), 0) AS covers,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN COALESCE(discount_amount, 0) ELSE 0 END), 0) AS discounts
    FROM orders WHERE service_day_id = ?
  `).get(serviceDayId) as any;

  const bills = db.prepare(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid,
      COALESCE(SUM(CASE WHEN b.payment_status != 'paid' THEN 1 ELSE 0 END), 0) AS unpaid,
      COALESCE(SUM(b.paid_amount), 0) AS takings
    FROM bills b JOIN orders o ON o.id = b.order_id
    WHERE o.service_day_id = ?
  `).get(serviceDayId) as any;

  const topProducts = db.prepare(`
    SELECT oi.product_name AS name, SUM(oi.quantity) AS quantity, COALESCE(SUM(oi.total), 0) AS total
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.service_day_id = ?
      AND o.status != 'cancelled'
      AND oi.status NOT IN ('cancelled', 'voided')
    GROUP BY oi.product_name
    ORDER BY quantity DESC, total DESC
    LIMIT 10
  `).all(serviceDayId) as { name: string; quantity: number; total: number }[];

  return {
    orders: {
      total: Number(orders?.total || 0),
      completed: Number(orders?.completed || 0),
      cancelled: Number(orders?.cancelled || 0),
    },
    covers: Number(orders?.covers || 0),
    bills: {
      count: Number(bills?.count || 0),
      paid: Number(bills?.paid || 0),
      unpaid: Number(bills?.unpaid || 0),
    },
    takings: {
      total: money(bills?.takings),
      byMethod: paymentBreakdown(db, serviceDayId).map((row) => ({
        method: row.method,
        count: Number(row.count || 0),
        total: money(row.total),
      })),
    },
    discounts: money(orders?.discounts),
    topProducts: topProducts.map((row) => ({
      name: row.name,
      quantity: Number(row.quantity || 0),
      total: money(row.total),
    })),
  };
}

/**
 * The day's totals: the snapshot frozen at close when there is one, computed
 * live otherwise. A day is only frozen once, so reopening and re-closing it
 * recomputes rather than resurrecting stale numbers.
 */
export function readServiceDaySummary(db: Db, day: ServiceDayRow): ServiceDaySummary {
  if (day.summary) {
    try {
      return JSON.parse(day.summary) as ServiceDaySummary;
    } catch {
      // A corrupted snapshot is worth less than the rows it summarizes.
    }
  }
  return computeServiceDaySummary(db, day.id);
}

/** Rooms and tables as they stood, so a past day can be read back in context. */
function captureLayout(db: Db) {
  const tables = db.prepare(`
    SELECT id, number, capacity, floor, section, position_x, position_y
    FROM tables ORDER BY number
  `).all() as any[];
  return {
    captured_at: now(),
    tables: tables.map((table) => ({
      id: table.id,
      name: table.number,
      capacity: table.capacity,
      room: table.floor,
      section: table.section,
      position_x: table.position_x,
      position_y: table.position_y,
    })),
  };
}

export interface CloseServiceDayOptions {
  /** Wipe the room so tomorrow starts from a blank map. */
  clearTables?: boolean;
  /** Close despite open orders or unpaid bills. Owner-only, and recorded. */
  force?: boolean;
  reason?: string | null;
  closedBy?: string | null;
}

export interface CloseServiceDayResult {
  day: ServiceDayRow;
  summary: ServiceDaySummary;
  tablesCleared: number;
  tablesKept: number;
  heldCartsCleared: number;
  reservationsExpired: number;
}

/**
 * Close the day. Caller must already be inside a transaction, and must have
 * authorized `force` against the caller's role before passing it.
 *
 * Throws with `status`/`code` set when it refuses, so the route can pass the
 * reason straight through to the floor.
 */
export function closeServiceDay(
  db: Db,
  day: ServiceDayRow,
  options: CloseServiceDayOptions = {},
): CloseServiceDayResult {
  if (day.status !== 'open') {
    throw Object.assign(new Error('This day is already closed.'), { status: 409, code: 'service_day_not_open' });
  }

  const blockers = getServiceDayBlockers(db, day.id);
  const hasBlockers = blockers.openOrders.length > 0 || blockers.unpaidBills.length > 0;
  if (hasBlockers && !options.force) {
    throw Object.assign(new Error('The day still has open orders or unpaid bills.'), {
      status: 409,
      code: 'service_day_has_blockers',
      blockers,
    });
  }

  // Freeze before touching anything: the summary must describe the day as it
  // was served, not as the reset below leaves it.
  const summary = computeServiceDaySummary(db, day.id);
  const layout = captureLayout(db);
  const stamp = now();

  // Held carts are unsent baskets parked on a table. They do not survive the
  // service they belong to, and they would otherwise block the wipe below.
  const heldCartsCleared = db.prepare('DELETE FROM held_orders').run().changes;
  // Bookings nobody turned up for stop being pending when the service ends.
  const reservationsExpired = expireOpenReservations(db, day.id);
  db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE status != 'available'").run(stamp);

  let tablesCleared = 0;
  let tablesKept = 0;
  if (options.clearTables) {
    const tables = db.prepare('SELECT * FROM tables').all() as any[];
    for (const table of tables) {
      // A force-closed day can still hold a live order; its table stays.
      if (tableDeletionBlocker(db, table.id)) {
        tablesKept++;
        continue;
      }
      deleteTableRow(db, table);
      tablesCleared++;
    }
  }

  const notes = options.force
    ? `${options.reason ? `${options.reason} — ` : ''}force-closed with ${blockers.openOrders.length} open order(s) and ${blockers.unpaidBills.length} unpaid bill(s)`
    : options.reason || null;

  db.prepare(`
    UPDATE service_days SET
      status = 'closed',
      closed_at = ?,
      closed_by = ?,
      notes = ?,
      summary = ?,
      layout_snapshot = ?,
      updated_at = ?
    WHERE id = ?
  `).run(stamp, options.closedBy || null, notes, JSON.stringify(summary), JSON.stringify(layout), stamp, day.id);

  return {
    day: getServiceDay(db, day.id) as ServiceDayRow,
    summary,
    tablesCleared,
    tablesKept,
    heldCartsCleared,
    reservationsExpired,
  };
}

/**
 * Reopen a closed day so a mistake can be undone. The frozen summary is dropped
 * on purpose: the day is live again, so its totals go back to being computed.
 */
export function reopenServiceDay(db: Db, day: ServiceDayRow, userId?: string | null): ServiceDayRow {
  if (day.status === 'open') {
    throw Object.assign(new Error('This day is already open.'), { status: 409, code: 'service_day_already_open' });
  }
  const alreadyOpen = getOpenServiceDay(db);
  if (alreadyOpen) {
    throw Object.assign(new Error(`Close ${alreadyOpen.business_date} before reopening another day.`), {
      status: 409,
      code: 'service_day_another_open',
    });
  }

  const stamp = now();
  db.prepare(`
    UPDATE service_days SET
      status = 'open',
      closed_at = NULL,
      closed_by = NULL,
      summary = NULL,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `).run(`${day.notes ? `${day.notes} — ` : ''}reopened${userId ? ` by ${userId}` : ''}`, stamp, day.id);
  return getServiceDay(db, day.id) as ServiceDayRow;
}

export interface ServiceDayTotals {
  orders_count: number;
  covers: number;
  takings: number;
}

/**
 * Headline numbers for a page of days, in two grouped queries rather than a
 * full summary per row. Days closed with a frozen summary report those numbers;
 * open and backfilled days are aggregated live. Without this the day list cost
 * four queries per row, which a store with a year of backfilled history feels.
 */
export function getServiceDayTotals(db: Db, days: ServiceDayRow[]): Map<string, ServiceDayTotals> {
  const totals = new Map<string, ServiceDayTotals>();
  if (days.length === 0) return totals;

  const live: string[] = [];
  for (const day of days) {
    if (day.summary) {
      try {
        const frozen = JSON.parse(day.summary) as ServiceDaySummary;
        totals.set(day.id, {
          orders_count: frozen.orders?.total ?? 0,
          covers: frozen.covers ?? 0,
          takings: frozen.takings?.total ?? 0,
        });
        continue;
      } catch {
        // Fall through and recompute rather than reporting nothing.
      }
    }
    live.push(day.id);
    totals.set(day.id, { orders_count: 0, covers: 0, takings: 0 });
  }
  if (live.length === 0) return totals;

  const placeholders = live.map(() => '?').join(',');
  const orderRows = db.prepare(`
    SELECT service_day_id AS day_id,
      COUNT(*) AS orders_count,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN COALESCE(guest_count, 0) ELSE 0 END), 0) AS covers
    FROM orders WHERE service_day_id IN (${placeholders})
    GROUP BY service_day_id
  `).all(...live) as { day_id: string; orders_count: number; covers: number }[];
  for (const row of orderRows) {
    const entry = totals.get(row.day_id);
    if (!entry) continue;
    entry.orders_count = Number(row.orders_count || 0);
    entry.covers = Number(row.covers || 0);
  }

  const billRows = db.prepare(`
    SELECT o.service_day_id AS day_id, COALESCE(SUM(b.paid_amount), 0) AS takings
    FROM bills b JOIN orders o ON o.id = b.order_id
    WHERE o.service_day_id IN (${placeholders})
    GROUP BY o.service_day_id
  `).all(...live) as { day_id: string; takings: number }[];
  for (const row of billRows) {
    const entry = totals.get(row.day_id);
    if (entry) entry.takings = money(row.takings);
  }

  return totals;
}

/** The day's orders, newest first, with items attached for review. */
export function getServiceDayOrders(db: Db, serviceDayId: string) {
  const orders = db.prepare(`
    SELECT * FROM orders WHERE service_day_id = ? ORDER BY created_at DESC, id DESC
  `).all(serviceDayId).map(parseRowJson) as any[];
  if (orders.length === 0) return [];

  const placeholders = orders.map(() => '?').join(',');
  const items = db.prepare(`
    SELECT order_id, product_name, quantity, total, status
    FROM order_items WHERE order_id IN (${placeholders}) ORDER BY order_id, id
  `).all(...orders.map((order) => order.id)) as any[];

  const itemsByOrder = new Map<number, any[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }
  return orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) || [] }));
}
