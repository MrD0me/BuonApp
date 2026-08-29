/**
 * Which order types this restaurant actually takes.
 *
 * A place that only serves at the table has no use for takeaway and delivery:
 * three buttons where one is always the answer are noise. The owner picks the
 * types in settings, and a type that is off disappears from the POS and from
 * the day's filters — but hiding a button is not enforcement, so the API
 * refuses a disabled type as well.
 *
 * Only the three types the POS can offer are gated. `online` is left alone:
 * nothing in the app creates it, and refusing it would break an import path
 * nobody has looked at.
 */

export const SELECTABLE_ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'] as const;

export type SelectableOrderType = (typeof SELECTABLE_ORDER_TYPES)[number];

export const ORDER_TYPES_SETTING_KEY = 'order_types_enabled';

/** Everything on, i.e. what the app did before this setting existed. */
export const DEFAULT_ORDER_TYPES = SELECTABLE_ORDER_TYPES.join(',');

function isSelectable(value: string): value is SelectableOrderType {
  return (SELECTABLE_ORDER_TYPES as readonly string[]).includes(value);
}

/**
 * Reads the stored CSV. An unset or unreadable value means every type, so a
 * database that predates the setting keeps behaving the way it always did.
 */
export function parseOrderTypes(raw: string | null | undefined): SelectableOrderType[] {
  if (raw === null || raw === undefined) return [...SELECTABLE_ORDER_TYPES];
  const parsed = String(raw)
    .split(',')
    .map((entry) => entry.trim())
    .filter(isSelectable);
  const unique = SELECTABLE_ORDER_TYPES.filter((type) => parsed.includes(type));
  // A stored value that resolves to nothing would leave the POS unable to take
  // any order at all, which no setting should be able to do.
  return unique.length > 0 ? unique : [...SELECTABLE_ORDER_TYPES];
}

/** Canonical storage form: known types only, always in the same order. */
export function serializeOrderTypes(types: readonly string[]): string {
  return SELECTABLE_ORDER_TYPES.filter((type) => types.includes(type)).join(',');
}

/**
 * Whether a submitted list is something we can store: known entries only, and
 * at least one of them.
 */
export function validateOrderTypes(types: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(types) || types.length === 0) {
    return { valid: false, error: 'At least one order type must stay enabled' };
  }
  const unknown = types.filter((type) => typeof type !== 'string' || !isSelectable(type));
  if (unknown.length > 0) {
    return { valid: false, error: `Unknown order type: ${unknown.join(', ')}` };
  }
  return { valid: true };
}

/**
 * Gate for a type arriving on the wire. Types outside the selectable set are
 * always allowed — this setting has nothing to say about them.
 */
export function isOrderTypeAllowed(raw: string | null | undefined, type: string): boolean {
  if (!isSelectable(type)) return true;
  return parseOrderTypes(raw).includes(type);
}
