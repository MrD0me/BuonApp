/**
 * Service runs — which wave of the meal a dish leaves the kitchen in.
 *
 * A table orders everything at once and still eats in three goes: the starters,
 * then the pasta, then the mains. The kitchen needs to be told which, and until
 * now the only way to say it was to hold the ticket back and send a second one,
 * or to write "with the starters" in the notes and hope a cook read it between
 * "no garlic" and "well done".
 *
 * A run is **not** a kitchen round. `kot_batch` records what has already been
 * sent; a run records when it should come out. They are independent on purpose:
 * pressing Send still sends everything pending, exactly as before, and the
 * ticket comes out sectioned by run so the pass can read the waves off it.
 *
 * The number comes off the dish's own category — starters 1, pasta 2, mains 3 —
 * so on an ordinary table nobody touches it. A dish inside a fixed menu takes
 * its run from its category too, and not from the menu's course: a primo inside
 * a menu is a primo and goes out with the primi. That is the same reason the
 * menu writes real rows in the first place.
 */

import { getDatabase } from '../db';

type Db = ReturnType<typeof getDatabase>;

/** Nine is past what any kitchen calls out, and keeps the printed label short. */
export const MAX_SERVICE_RUNS = 9;
export const DEFAULT_SERVICE_RUN = 1;

/** A run the floor asked for, or null when it is not one. */
export function normalizeServiceRun(value: unknown): number | null {
  const run = Number(value);
  if (!Number.isSafeInteger(run) || run < 1 || run > MAX_SERVICE_RUNS) return null;
  return run;
}

/** The run a dish goes out in when nobody says otherwise. */
export function defaultServiceRunForProduct(db: Db, productId: string): number {
  const row = db.prepare(`
    SELECT c.default_service_run AS run
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(productId) as { run?: number | null } | undefined;
  return normalizeServiceRun(row?.run) ?? DEFAULT_SERVICE_RUN;
}

/**
 * What to write on a new row: what the floor asked for, or the category's
 * default. A number out of range falls back rather than being refused — a run
 * is a hint to the kitchen, and no order should fail to be taken over one.
 */
export function resolveServiceRun(db: Db, productId: string, requested: unknown): number {
  return normalizeServiceRun(requested) ?? defaultServiceRunForProduct(db, productId);
}

/**
 * The rows of one ticket, split into waves and put in order.
 *
 * A missing or nonsense value lands in run 1 rather than in a wave of its own:
 * the print endpoint accepts caller-supplied rows on its ad-hoc path, and a
 * ticket is the wrong place to discover that.
 */
export function groupItemsByServiceRun<T extends { service_run?: unknown }>(
  items: T[],
): { run: number; items: T[] }[] {
  const byRun = new Map<number, T[]>();
  for (const item of items) {
    const run = normalizeServiceRun(item?.service_run) ?? DEFAULT_SERVICE_RUN;
    const bucket = byRun.get(run);
    if (bucket) bucket.push(item);
    else byRun.set(run, [item]);
  }
  return [...byRun.keys()]
    .sort((left, right) => left - right)
    .map((run) => ({ run, items: byRun.get(run)! }));
}
