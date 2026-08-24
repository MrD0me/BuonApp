/**
 * Table lifecycle rules that outlive any one HTTP route (phases 1-4 of
 * docs/table-management.md).
 *
 * These live in a service rather than in `main/routes/tables.ts` because the
 * day-close ritual needs them too, and having the route and the service import
 * each other was a cycle waiting to bite at module-init time.
 */

import { getDatabase, now } from '../db';
import { randomUUID } from 'crypto';
import { releaseReservationsForTable } from './reservations';
import { DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_HEIGHT, ROOM_MARGIN, TABLE_GAP } from '../lib/table-geometry';

/** An order that still has something to do with its table. */
export const ACTIVE_ORDER_STATUS_SQL = "status NOT IN ('completed', 'cancelled')";

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
  releaseReservationsForTable(db, table.id);
  // Members of a group led by this table would otherwise point at a row that no
  // longer exists, and could never be split off again.
  db.prepare("UPDATE tables SET merged_into = NULL, status = 'available', updated_at = ? WHERE merged_into = ?")
    .run(now(), table.id);
  db.prepare('DELETE FROM tables WHERE id = ?').run(table.id);
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

export type TableMergeBlocker =
  | TableDeletionBlocker
  | 'table_has_reservation'
  | 'table_already_merged'
  | 'table_leads_group';

/**
 * Why a table cannot be folded into another one. Joining is something you do to
 * an idle table before the party sits down, so anything already attached to it
 * — an order, a held cart, a booking, another group — has to be settled first.
 */
export function tableMergeBlocker(
  db: ReturnType<typeof getDatabase>,
  tableId: string,
): TableMergeBlocker | null {
  const inUse = tableDeletionBlocker(db, tableId);
  if (inUse) return inUse;
  if (db.prepare("SELECT id FROM reservations WHERE table_id = ? AND status = 'booked'").get(tableId)) {
    return 'table_has_reservation';
  }
  const row = db.prepare('SELECT merged_into FROM tables WHERE id = ?').get(tableId) as { merged_into?: string } | undefined;
  if (row?.merged_into) return 'table_already_merged';
  if (db.prepare('SELECT id FROM tables WHERE merged_into = ?').get(tableId)) return 'table_leads_group';
  return null;
}

/**
 * Fold tables into one. The leader keeps its own identity and is where the
 * order goes; the others point at it until they are split off again. Deliberately
 * one level deep — a child can never itself lead a group, so there are no chains
 * to walk and splitting is always one step. Caller must be inside a transaction.
 */
export function mergeTables(db: ReturnType<typeof getDatabase>, leaderId: string, childIds: string[]): void {
  const stamp = now();
  const update = db.prepare('UPDATE tables SET merged_into = ?, status = ?, updated_at = ? WHERE id = ?');
  for (const childId of childIds) {
    update.run(leaderId, 'held', stamp, childId);
  }
}

/**
 * Break a group up. Accepts either the leader or one of its members, so the
 * floor does not have to remember which table was the leader.
 */
export function splitTableGroup(db: ReturnType<typeof getDatabase>, tableId: string): number {
  const row = db.prepare('SELECT id, merged_into FROM tables WHERE id = ?').get(tableId) as { id: string; merged_into: string | null } | undefined;
  if (!row) return 0;
  const leaderId = row.merged_into || row.id;
  const stamp = now();
  return db.prepare(
    "UPDATE tables SET merged_into = NULL, status = 'available', updated_at = ? WHERE merged_into = ?",
  ).run(stamp, leaderId).changes;
}

/** Seats a group offers: the leader plus everyone folded into it. */
export function groupCapacity(db: ReturnType<typeof getDatabase>, leaderId: string): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(capacity), 0) AS seats FROM tables
    WHERE id = ? OR merged_into = ?
  `).get(leaderId, leaderId) as { seats: number };
  return Number(row?.seats || 0);
}

/** The table an order should actually be placed on: a member defers to its leader. */
export function tableGroupLeader(db: ReturnType<typeof getDatabase>, tableId: string): string {
  const row = db.prepare('SELECT merged_into FROM tables WHERE id = ?').get(tableId) as { merged_into?: string } | undefined;
  return row?.merged_into || tableId;
}
