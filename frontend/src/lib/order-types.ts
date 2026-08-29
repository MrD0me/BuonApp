import type { AppConfig } from 'use-intl';
import type { Order } from './types';

type OrdersKey = keyof AppConfig['Messages']['orders'];

/** Order-type domain union (mirrors `Order['type']`). */
export type OrderType = Order['type'];

/**
 * Order type → `orders` namespace leaf key. Typed so dynamic lookups are
 * checked at compile time; unknown types fall back to the raw string at the
 * call site.
 */
export const ORDER_TYPE_LABEL_KEYS = {
  dine_in: 'dineIn',
  takeaway: 'takeaway',
  delivery: 'delivery',
  online: 'online',
} as const satisfies Record<OrderType, OrdersKey>;

/**
 * Which types the tenant actually takes, mirroring `main/lib/order-types.ts`.
 *
 * The backend stores the enabled types as a canonical CSV under
 * `order_types_enabled` and refuses a disabled type on `POST /orders`; this
 * side decides what the cashier is offered and what the day's filters list.
 * `online` is not part of it: nothing in the app creates one.
 */
export const SELECTABLE_ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'] as const;

export type SelectableOrderType = (typeof SELECTABLE_ORDER_TYPES)[number];

export const ORDER_TYPES_SETTING_KEY = 'order_types_enabled';

function isSelectable(value: string): value is SelectableOrderType {
  return (SELECTABLE_ORDER_TYPES as readonly string[]).includes(value);
}

/**
 * Unset means every type — the behaviour of an install that predates the
 * setting — and so does a stored value that resolves to nothing, because no
 * setting should be able to leave the POS unable to take an order.
 */
export function parseOrderTypes(raw: string | null | undefined): SelectableOrderType[] {
  if (raw === null || raw === undefined) return [...SELECTABLE_ORDER_TYPES];
  const parsed = String(raw)
    .split(',')
    .map((entry) => entry.trim())
    .filter(isSelectable);
  const unique = SELECTABLE_ORDER_TYPES.filter((type) => parsed.includes(type));
  return unique.length > 0 ? unique : [...SELECTABLE_ORDER_TYPES];
}

/** Canonical storage form: known types only, always in the same order. */
export function serializeOrderTypes(types: readonly string[]): string {
  return SELECTABLE_ORDER_TYPES.filter((type) => types.includes(type)).join(',');
}
