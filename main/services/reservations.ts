/**
 * Reservations for the service being run right now (phase 4 of
 * docs/table-management.md).
 *
 * A booking belongs to a service day and to a table that already exists. That
 * is a consequence of the rest of the design, not a shortcut: the room is
 * rebuilt every day and its tables really are deleted, so "table 12 on
 * Saturday" names something that will not exist until Saturday's map is built.
 *
 * What the floor needs is a name and a head count. The time and the phone are
 * recorded when they are given and never demanded.
 */

import { getDatabase, now } from '../db';
import { randomUUID } from 'crypto';

type Db = ReturnType<typeof getDatabase>;

export type ReservationStatus = 'booked' | 'seated' | 'cancelled' | 'expired';

export interface ReservationRow {
  id: string;
  service_day_id: string;
  table_id: string | null;
  customer_id: string | null;
  name: string;
  guests: number;
  booked_time: string | null;
  phone: string | null;
  notes: string | null;
  status: ReservationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationInput {
  name: string;
  guests: number;
  bookedTime?: string | null;
  phone?: string | null;
  notes?: string | null;
  customerId?: string | null;
  createdBy?: string | null;
}

/** `HH:MM` on a 24-hour clock, or null. Anything else is rejected outright. */
export function normalizeBookedTime(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return undefined;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function activeReservationForTable(db: Db, tableId: string): ReservationRow | null {
  return (db.prepare(
    "SELECT * FROM reservations WHERE table_id = ? AND status = 'booked' LIMIT 1",
  ).get(tableId) as ReservationRow) || null;
}

/** Bookings still standing across a set of tables, in one query for the map. */
export function activeReservationsByTable(db: Db, tableIds: string[]): Map<string, ReservationRow> {
  const byTable = new Map<string, ReservationRow>();
  if (tableIds.length === 0) return byTable;
  const placeholders = tableIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM reservations WHERE status = 'booked' AND table_id IN (${placeholders})`,
  ).all(...tableIds) as ReservationRow[];
  for (const row of rows) {
    if (row.table_id) byTable.set(String(row.table_id), row);
  }
  return byTable;
}

/**
 * Book a table. Replaces any standing booking on it rather than refusing:
 * re-reserving a table is how the floor corrects a name or a head count, and a
 * unique index would otherwise turn that into an error the user has to decode.
 * Caller must already be inside a transaction.
 */
export function reserveTable(
  db: Db,
  tableId: string,
  serviceDayId: string,
  input: ReservationInput,
): ReservationRow {
  const stamp = now();
  const existing = activeReservationForTable(db, tableId);
  if (existing) {
    db.prepare("UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?").run(stamp, existing.id);
  }

  const id = `res-${randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO reservations (id, service_day_id, table_id, customer_id, name, guests, booked_time, phone, notes,
      status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?)
  `).run(
    id, serviceDayId, tableId, input.customerId || null, input.name, input.guests,
    input.bookedTime || null, input.phone || null, input.notes || null,
    input.createdBy || null, stamp, stamp,
  );
  db.prepare("UPDATE tables SET status = 'reserved', updated_at = ? WHERE id = ?").run(stamp, tableId);

  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as ReservationRow;
}

/**
 * Drop the booking on a table. Frees the table only if it was being held for
 * that booking — a table that has meanwhile been seated keeps its status.
 * Caller must already be inside a transaction.
 */
export function cancelReservationForTable(db: Db, tableId: string): ReservationRow | null {
  const existing = activeReservationForTable(db, tableId);
  if (!existing) return null;

  const stamp = now();
  db.prepare("UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?").run(stamp, existing.id);
  db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ? AND status = 'reserved'")
    .run(stamp, tableId);
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(existing.id) as ReservationRow;
}

/**
 * The party arrived and an order went on the table. Closes the booking without
 * touching the table status, which the order flow has already set to occupied.
 */
export function seatReservationForTable(db: Db, tableId: string): void {
  db.prepare("UPDATE reservations SET status = 'seated', updated_at = ? WHERE table_id = ? AND status = 'booked'")
    .run(now(), tableId);
}

/** At close, bookings nobody showed up for stop being pending. */
export function expireOpenReservations(db: Db, serviceDayId: string): number {
  return db.prepare(
    "UPDATE reservations SET status = 'expired', updated_at = ? WHERE service_day_id = ? AND status = 'booked'",
  ).run(now(), serviceDayId).changes;
}

/** Release bookings pointing at a table that is about to be deleted. */
export function releaseReservationsForTable(db: Db, tableId: string): void {
  db.prepare("UPDATE reservations SET table_id = NULL, status = CASE WHEN status = 'booked' THEN 'cancelled' ELSE status END, updated_at = ? WHERE table_id = ?")
    .run(now(), tableId);
}
