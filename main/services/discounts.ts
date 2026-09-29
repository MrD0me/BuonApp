/**
 * Order discounts — the ways a check comes down, and the one rule for what a
 * discount becomes when the check changes after it was agreed.
 *
 * At the table a discount is rarely "ten per cent" or "five euros". It is a
 * round figure: "it's 53.40, call it 50". The `total` method takes that figure
 * and works the discount out here, on the server, against the order as it
 * stands inside the transaction — so a coffee a handheld added a second ago
 * moves the discount, never the total the cashier typed. The bill then prints
 * the usual "Sconto −3,40", which is what gets keyed into the till.
 *
 * Each method can be switched on or off on its own (`discount_methods`), and
 * the first one switched on is the one the discount window opens on.
 */

import { getSettingValue } from '../db';
import { roundMoney } from '../money';

export type DiscountMethod = 'total' | 'percentage' | 'amount';

/** The order the buttons are drawn in; the first switched on is the default. */
export const DISCOUNT_METHODS: readonly DiscountMethod[] = ['total', 'percentage', 'amount'];

export const DISCOUNT_METHODS_SETTING_KEY = 'discount_methods';

/** What an install falls back to when the setting is missing or unreadable. */
export const DEFAULT_DISCOUNT_METHODS: readonly DiscountMethod[] = ['total', 'percentage'];

export function isDiscountMethod(value: unknown): value is DiscountMethod {
  return typeof value === 'string' && (DISCOUNT_METHODS as readonly string[]).includes(value);
}

/**
 * The methods in a stored CSV or a list, in canonical order and without
 * repeats. Null when none of them is a method, so the caller decides between
 * refusing the input and falling back.
 */
export function normalizeDiscountMethods(value: unknown): DiscountMethod[] | null {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const wanted = new Set(parts.map((part) => String(part).trim()));
  const methods = DISCOUNT_METHODS.filter((method) => wanted.has(method));
  return methods.length > 0 ? methods : null;
}

/** The stored setting as a list, never empty. */
export function parseDiscountMethods(raw: string | null | undefined): DiscountMethod[] {
  return normalizeDiscountMethods(raw) ?? [...DEFAULT_DISCOUNT_METHODS];
}

export function enabledDiscountMethods(): DiscountMethod[] {
  return parseDiscountMethods(getSettingValue(DISCOUNT_METHODS_SETTING_KEY));
}

/** So much per cent of the food, rounded the way every discount is. */
export function percentageDiscount(subtotal: number, percentage: number): number {
  return Math.round((subtotal * percentage) / 100 * 100) / 100;
}

export type TargetTotalDiscount =
  | { ok: true; amount: number }
  | { ok: false; reason: 'below_charges' | 'not_below_total' };

/**
 * The discount that brings a check down to the total the table was told.
 *
 * Worked from the check without any discount, so rounding a second time
 * replaces the first rounding instead of piling on top of it. A discount only
 * ever comes off the food — the cover, delivery and packaging are added after
 * it — so the total cannot go below those, and it has to go below what the
 * check says now, or it would be a surcharge.
 */
export function discountForTargetTotal(subtotal: number, charges: number, target: number): TargetTotalDiscount {
  const wanted = roundMoney(target);
  if (wanted < roundMoney(charges)) return { ok: false, reason: 'below_charges' };
  const amount = roundMoney(subtotal + charges - wanted);
  if (amount <= 0) return { ok: false, reason: 'not_below_total' };
  return { ok: true, amount };
}

/**
 * What an order-level discount becomes once the food on the check has changed.
 *
 * A percentage is a percentage of whatever is there now. A discount agreed in
 * euros — typed as an amount, or worked out from a new total — stays the euros
 * that were agreed, but never more than the food left on the check: taking six
 * menus of eight off a table would otherwise print "Sconto −50,00" under a
 * subtotal of 30,00. It comes back up to the agreed figure if the food does.
 */
export function carryOrderDiscount(
  order: { discount_type?: string | null; discount_value?: number | null; discount_amount?: number | null },
  newSubtotal: number,
): number {
  const subtotal = Math.max(0, Number(newSubtotal) || 0);
  if (order.discount_type === 'percentage') {
    const percentage = Number(order.discount_value) || 0;
    return percentage > 0 ? percentageDiscount(subtotal, percentage) : 0;
  }
  const value = Number(order.discount_value) || 0;
  const agreed = value > 0 ? value : Number(order.discount_amount) || 0;
  return roundMoney(Math.min(Math.max(0, agreed), subtotal));
}
