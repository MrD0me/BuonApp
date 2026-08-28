import type { Bill, Order } from '@/lib/types';

/**
 * A split check fetched on its own comes back without the order it belongs to.
 * Printing needs the lines, so fall back to the order already loaded in the
 * list — but never override an order the bill carried itself, which is the
 * one scoped to that specific check.
 */
export function preferChildScopedBill(bill: Bill, fallbackOrder?: Order): Bill {
  if (bill.order || !fallbackOrder) return bill;
  return { ...bill, order: fallbackOrder };
}
