import type { Addon, CartItem } from './types';

/**
 * Serialize the cart identity as typed, sorted structure rather than as a
 * delimiter-joined string. JSON-like values are escaped and tagged so values
 * such as `1` and `"001"` cannot become the same identity.
 */
function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  switch (typeof value) {
    case 'string':
      return `string:${JSON.stringify(value)}`;
    case 'number':
      if (Number.isNaN(value)) return 'number:NaN';
      if (value === Infinity) return 'number:Infinity';
      if (value === -Infinity) return 'number:-Infinity';
      if (Object.is(value, -0)) return 'number:-0';
      return `number:${String(value)}`;
    case 'boolean':
      return `boolean:${value ? 'true' : 'false'}`;
    case 'bigint':
      return `bigint:${value.toString()}`;
    case 'symbol':
      return `symbol:${String(value)}`;
    case 'function':
      return `function:${String(value)}`;
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
      }
      const entries = Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`);
      return `{${entries.join(',')}}`;
    }
    default:
      return `${typeof value}:${String(value)}`;
  }
}

/**
 * Build the stable identity used by the cart store for merging equivalent
 * lines. Add-on arrays are order-insensitive, while every selected add-on
 * field and the exact note text remain part of the identity.
 */
export function generateCartItemId(
  productId: number | string,
  addons: Addon[],
  specialInstructions: string,
  menuLineId?: string | null,
  serviceRun?: number | null,
): string {
  // A menu line is never merged with another line, not even one of the same
  // menu: it carries its own count of menus and its own dishes, and adding
  // them up is the window's job, not a side effect of an identity. Its own
  // line id is its identity.
  if (menuLineId) return `cart-menu:${menuLineId}`;

  const normalizedAddons = addons.map((addon) => ({
    ...addon,
    quantity: addon.quantity || 1,
  }));
  const sortedAddons = normalizedAddons.sort((left, right) => {
    const leftKey = canonicalize(left);
    const rightKey = canonicalize(right);
    if (leftKey < rightKey) return -1;
    if (leftKey > rightKey) return 1;
    return 0;
  });

  // The run is part of the identity: two lines of the same dish going out in
  // different waves are two lines, and merging them would silently drop one
  // of the two instructions the kitchen was given.
  return `cart-v2:${canonicalize({ productId, addons: sortedAddons, specialInstructions, serviceRun: serviceRun ?? null })}`;
}

/** Normalize persisted/held cart lines to the current identity format. */
export function normalizeCartItems(items: CartItem[]): CartItem[] {
  const normalized: CartItem[] = [];
  for (const item of items) {
    const id = generateCartItemId(
      item.product.id, item.addons || [], item.special_instructions || '', item.menu_line_id, item.service_run,
    );
    const existing = normalized.find((candidate) => candidate.id === id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      normalized.push({ ...item, id });
    }
  }
  return normalized;
}

/**
 * A fresh identity for one menu line. Not derived from the choices: a line is
 * itself, whatever its dishes happen to be.
 */
export function newMenuLineId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Older webviews expose crypto without randomUUID; fall through.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
