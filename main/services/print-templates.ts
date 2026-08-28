/**
 * The two receipt layouts the printer knows how to draw.
 *
 * A third source used to exist: templates that arrived inside a country tax
 * pack and were rendered from a stored line-template payload. That delivery
 * path went away with the taxation module, so these are now the only bill
 * templates there are.
 */

export const CORE_BILL_TEMPLATES = ['classic', 'compact'] as const;
export type CoreBillTemplate = typeof CORE_BILL_TEMPLATES[number];

export function isCoreBillTemplate(value: string): value is CoreBillTemplate {
  return (CORE_BILL_TEMPLATES as readonly string[]).includes(value);
}
