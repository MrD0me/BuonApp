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

/**
 * Everything charged on top of the food.
 *
 * The same three, in the same order, wherever a total is put back together —
 * six places did the sum by hand and the cover charge would have made it seven
 * chances to forget one. `roundMoney` still wraps the final figure.
 */
export function orderCharges(row: {
  delivery_charge?: number | null;
  packaging_charge?: number | null;
  cover_charge?: number | null;
} | null | undefined): number {
  if (!row) return 0;
  return Number(row.delivery_charge || 0)
    + Number(row.packaging_charge || 0)
    + Number(row.cover_charge || 0);
}

/**
 * What a table pays for being laid: so much a head.
 *
 * `coveredGuests` is for the guests whose cover is already inside something
 * else they ordered — a fixed menu that includes it. Nothing sets it yet; the
 * argument is here so the fixed menu can pass it without moving this logic.
 */
export function computeCoverCharge(
  guests: number | null | undefined,
  amountPerGuest: number,
  coveredGuests = 0,
): number {
  const heads = Number(guests || 0) - Number(coveredGuests || 0);
  if (!Number.isFinite(heads) || heads <= 0) return 0;
  if (!Number.isFinite(amountPerGuest) || amountPerGuest <= 0) return 0;
  return roundMoney(heads * amountPerGuest);
}

/** The configured price of one cover. Zero — the default — means no cover at all. */
export const COVER_CHARGE_SETTING_KEY = 'cover_charge_amount';

export function parseCoverChargeAmount(raw: string | null | undefined): number {
  const parsed = Number(String(raw ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? roundMoney(parsed) : 0;
}
