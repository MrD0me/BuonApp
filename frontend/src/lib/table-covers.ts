import type { Table } from './types';

/**
 * Where the covers of a new order start, on the till and on the handheld.
 *
 * They used to start at one on every table, so the floor corrected the
 * counter on every order — and an order sent before anyone did counted, and
 * charged, a table of four as one cover. The table already says how many it
 * is laid for, and a booking says how many are coming.
 */

/** What an order accepts: `POST /orders` refuses anything outside it. */
const MIN_COVERS = 1;
const MAX_COVERS = 99;

/** A head count an order would accept, or null when the value is not one. */
export function validCovers(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= MIN_COVERS && count <= MAX_COVERS ? count : null;
}

/**
 * How many covers a new order on this table starts from.
 *
 * The booking when there is one, because it names the party that is coming;
 * otherwise the seats the table was laid for, counting the tables joined to
 * it, since their party orders at this one. It is where the counter starts,
 * not a decision: the floor corrects it for whoever actually sat down.
 *
 * Pure: mountable on the handheld unchanged.
 */
export function coversForNewOrder(
  table: Pick<Table, 'id' | 'capacity' | 'reservation'>,
  tables: Pick<Table, 'capacity' | 'merged_into'>[],
): number {
  const booked = validCovers(table.reservation?.guests);
  if (booked !== null) return booked;
  const seats = tables
    .filter((other) => other.merged_into != null && String(other.merged_into) === String(table.id))
    .reduce((sum, member) => sum + (Number(member.capacity) || 0), Number(table.capacity) || 0);
  return Math.min(MAX_COVERS, Math.max(MIN_COVERS, Math.floor(seats)));
}
