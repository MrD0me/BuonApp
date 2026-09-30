/**
 * The ways a check can be discounted, in the order their buttons are drawn:
 * the new total first, since a table is usually told a round figure rather
 * than a percentage. Each can be switched off in the settings; the backend
 * (`main/services/discounts.ts`) holds the same list and has the last word.
 */
export type DiscountType = 'total' | 'percentage' | 'amount';
export type DiscountMethods = DiscountType[];

export const DISCOUNT_TYPES: readonly DiscountType[] = ['total', 'percentage', 'amount'];

/** What the backend falls back to, and what the screens assume until it answers. */
export const DEFAULT_DISCOUNT_METHODS: DiscountMethods = ['total', 'percentage'];

export const normalizeDiscountMethods = (value: unknown): DiscountMethods => {
  const wanted = new Set(Array.isArray(value) ? value : []);
  const methods = DISCOUNT_TYPES.filter((type) => wanted.has(type));
  return methods.length > 0 ? methods : [...DEFAULT_DISCOUNT_METHODS];
};

export const isDiscountTypeAllowed = (methods: DiscountMethods, type: DiscountType) => methods.includes(type);

/** The method the discount window opens on: the first one switched on. */
export const defaultDiscountType = (methods: DiscountMethods): DiscountType => methods[0] ?? 'total';

const ROUNDING_STEPS = [1, 5, 10];

/**
 * Round figures just under a check, for the new total: the cents dropped, then
 * down to the five and to the ten. 53,40 offers 53 and 50; 48,00 offers 45
 * and 40. Only figures below the check and not below `minTotal` — the cover
 * and the other charges, which a discount never touches — and never zero.
 */
export const roundingProposals = (fullTotal: number, minTotal: number): number[] => {
  const proposals: number[] = [];
  for (const step of ROUNDING_STEPS) {
    // The small nudge keeps 53.00 at 53 when it arrives as 52.99999999.
    const rounded = Math.floor((fullTotal + 1e-9) / step) * step;
    if (rounded < fullTotal - 0.004 && rounded >= minTotal && rounded > 0 && !proposals.includes(rounded)) {
      proposals.push(rounded);
    }
  }
  return proposals;
};

/**
 * The discount a new total comes to, rounded to the cent the way the backend
 * rounds it. Only a preview: the server works it out again against the order
 * as it stands when the request lands.
 */
export const discountForTargetTotal = (fullTotal: number, target: number): number =>
  Math.round((fullTotal - target) * 100) / 100;
