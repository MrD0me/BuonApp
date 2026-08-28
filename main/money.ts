/**
 * Money rounding for order and bill totals.
 *
 * Amounts are stored as plain numbers in the smallest presentation unit the
 * currency shows on a receipt — two decimals. Every total that is written to
 * `orders.total` or `bills.total` goes through here so the value persisted is
 * the value printed, with no trailing float dust from summing line amounts.
 */
export function roundMoney(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}
