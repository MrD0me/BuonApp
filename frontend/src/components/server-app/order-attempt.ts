/**
 * The one order the handheld is in the middle of opening.
 *
 * A phone reloads more readily than a till: a tap on the wrong thing, a
 * screen that locks, a browser that decides to refresh. If that happens
 * between the request leaving and the answer arriving, the order may be
 * committed with nobody on this side knowing. The key and the payload are
 * written here before the request goes out, and replayed with the same key
 * on the next load: the backend recognises the key and hands back the order
 * it already made instead of opening a second one on the same table.
 *
 * Appending to an existing order has the same problem and is covered by
 * `lib/append-attempt.ts`, which the till already uses; this is the twin for
 * a brand-new order, kept small because the store is one record.
 */
const STORAGE_KEY = 'buonapp:server-app-order-attempt';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface OrderAttempt {
  userId: string;
  fingerprint: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export function readOrderAttempt(userId: string, now = Date.now()): OrderAttempt | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const attempt = JSON.parse(raw) as Partial<OrderAttempt>;
    if (
      attempt.userId !== userId
      || typeof attempt.idempotencyKey !== 'string'
      || typeof attempt.fingerprint !== 'string'
      || !attempt.payload
      || typeof attempt.createdAt !== 'number'
      || now - attempt.createdAt >= MAX_AGE_MS
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return attempt as OrderAttempt;
  } catch {
    return null;
  }
}

/** Written before the request leaves; false when the browser refuses to keep it. */
export function saveOrderAttempt(attempt: OrderAttempt): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
    return true;
  } catch {
    return false;
  }
}

export function clearOrderAttempt(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* nothing to clear */ }
}
