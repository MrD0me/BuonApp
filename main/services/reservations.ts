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

export type ReservationStatus = 'booked' | 'seated' | 'cancelled' | 'no_show' | 'expired';

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

/** A booking that is not `booked` is history: it cannot be moved or edited. */
function requireBooked(db: Db, reservationId: string): ReservationRow {
  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as ReservationRow | undefined;
  if (!row) throw Object.assign(new Error('Reservation not found'), { status: 404 });
  if (row.status !== 'booked') {
    throw Object.assign(new Error('This booking is no longer pending.'), {
      status: 409, code: 'reservation_not_pending',
    });
  }
  return row;
}

/** Free a table that was only being held, leaving a working one alone. */
function releaseTableIfHeld(db: Db, tableId: string | null, stamp: string): void {
  if (!tableId) return;
  db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ? AND status = 'reserved'")
    .run(stamp, tableId);
}

export interface AssignResult {
  reservation: ReservationRow;
  /** The booking that was on the target table and had to go somewhere. */
  displaced: ReservationRow | null;
}

/**
 * Put a booking on a table — or take it off one, with `tableId` null.
 *
 * Modelled as an exchange of places rather than four separate operations: the
 * booking takes the table, and whatever was on that table inherits what the
 * booking had, which may be nothing. Assign, reassign, swap and unassign all
 * fall out of that one rule, so the swap the floor actually does every evening
 * stops being a special case.
 *
 * Caller must already be inside a transaction.
 */
export function assignReservation(db: Db, reservationId: string, tableId: string | null): AssignResult {
  const booking = requireBooked(db, reservationId);
  const previousTableId = booking.table_id;
  const stamp = now();

  if (!tableId) {
    db.prepare('UPDATE reservations SET table_id = NULL, updated_at = ? WHERE id = ?').run(stamp, reservationId);
    releaseTableIfHeld(db, previousTableId, stamp);
    return {
      reservation: db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as ReservationRow,
      displaced: null,
    };
  }

  const target = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as any;
  if (!target) throw Object.assign(new Error('Table not found'), { status: 404 });
  if (target.merged_into) {
    throw Object.assign(new Error('This table is joined to another one. Book the table leading the group.'), {
      status: 409, code: 'table_is_merged', leader_table_id: target.merged_into,
    });
  }
  const working = db.prepare(
    "SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')",
  ).get(tableId);
  if (working) {
    throw Object.assign(new Error('This table is already serving an order.'), {
      status: 409, code: 'table_has_open_order',
    });
  }

  if (previousTableId === tableId) return { reservation: booking, displaced: null };

  const occupant = db.prepare(
    "SELECT * FROM reservations WHERE table_id = ? AND status = 'booked' LIMIT 1",
  ).get(tableId) as ReservationRow | undefined;

  // Order matters: let go of the old table first so the occupant can take it,
  // then step onto the target it has just left. Any other order trips the
  // unique index that keeps one booking per table.
  db.prepare('UPDATE reservations SET table_id = NULL, updated_at = ? WHERE id = ?').run(stamp, reservationId);
  if (occupant) {
    db.prepare('UPDATE reservations SET table_id = ?, updated_at = ? WHERE id = ?')
      .run(previousTableId, stamp, occupant.id);
  }
  db.prepare('UPDATE reservations SET table_id = ?, updated_at = ? WHERE id = ?').run(tableId, stamp, reservationId);

  db.prepare("UPDATE tables SET status = 'reserved', updated_at = ? WHERE id = ?").run(stamp, tableId);
  if (previousTableId) {
    if (occupant) {
      db.prepare("UPDATE tables SET status = 'reserved', updated_at = ? WHERE id = ?").run(stamp, previousTableId);
    } else {
      releaseTableIfHeld(db, previousTableId, stamp);
    }
  }

  return {
    reservation: db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as ReservationRow,
    displaced: occupant
      ? db.prepare('SELECT * FROM reservations WHERE id = ?').get(occupant.id) as ReservationRow
      : null,
  };
}

/** Take a booking down before any table has been chosen for it. */
export function createReservation(db: Db, serviceDayId: string, input: ReservationInput): ReservationRow {
  const stamp = now();
  const id = `res-${randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO reservations (id, service_day_id, table_id, customer_id, name, guests, booked_time, phone, notes,
      status, created_by, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?)
  `).run(
    id, serviceDayId, input.customerId || null, input.name, input.guests,
    input.bookedTime || null, input.phone || null, input.notes || null,
    input.createdBy || null, stamp, stamp,
  );
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as ReservationRow;
}

/** Edit the details of a pending booking. Its table moves via `assignReservation`. */
export function updateReservation(db: Db, reservationId: string, input: Partial<ReservationInput>): ReservationRow {
  requireBooked(db, reservationId);
  const assignments: string[] = [];
  const values: any[] = [];
  const set = (column: string, value: unknown) => { assignments.push(`${column} = ?`); values.push(value); };

  if (input.name !== undefined) set('name', input.name);
  if (input.guests !== undefined) set('guests', input.guests);
  if (input.bookedTime !== undefined) set('booked_time', input.bookedTime);
  if (input.phone !== undefined) set('phone', input.phone);
  if (input.notes !== undefined) set('notes', input.notes);
  if (input.customerId !== undefined) set('customer_id', input.customerId);

  if (assignments.length > 0) {
    db.prepare(`UPDATE reservations SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`)
      .run(...values, now(), reservationId);
  }
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as ReservationRow;
}

/** Close a booking: cancelled when it is called off, no_show when nobody came. */
export function closeReservation(db: Db, reservationId: string, status: 'cancelled' | 'no_show'): ReservationRow {
  const booking = requireBooked(db, reservationId);
  const stamp = now();
  db.prepare('UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?').run(status, stamp, reservationId);
  releaseTableIfHeld(db, booking.table_id, stamp);
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as ReservationRow;
}

/**
 * Undo a seating. Any order on a held table marks its booking as seated, so a
 * walk-in taking that table closes the wrong booking — this puts it back in the
 * pool. It returns with no table, because the one it had is now busy with
 * somebody elses order.
 */
export function reopenReservation(db: Db, reservationId: string): ReservationRow {
  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as ReservationRow | undefined;
  if (!row) throw Object.assign(new Error('Reservation not found'), { status: 404 });
  if (row.status === 'booked') return row;
  if (row.status !== 'seated') {
    throw Object.assign(new Error('Only a seated booking can be reopened.'), {
      status: 409, code: 'reservation_not_seated',
    });
  }
  db.prepare("UPDATE reservations SET status = 'booked', table_id = NULL, updated_at = ? WHERE id = ?")
    .run(now(), reservationId);
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as ReservationRow;
}

/** Everything taken down for a day, ordered the way the evening will run. */
export function listReservationsForDay(db: Db, serviceDayId: string): ReservationRow[] {
  return db.prepare(`
    SELECT * FROM reservations WHERE service_day_id = ?
    ORDER BY CASE WHEN booked_time IS NULL OR booked_time = '' THEN 1 ELSE 0 END, booked_time, created_at
  `).all(serviceDayId) as ReservationRow[];
}
