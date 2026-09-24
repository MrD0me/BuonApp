import type { OrderItem } from '@/lib/types';
import { dishIdentity } from '@/lib/kot';
import { roundMoney } from '@/lib/utils';

/**
 * The rows a printed bill draws — the mirror of `printableBillRows` in
 * `main/printers/thermal.ts`, shared by the two ways the browser prints a
 * check (raw ESC/POS in `receipt-encoder.ts`, HTML in `web-print.ts`), so the
 * same bill reads the same however it comes out.
 *
 * A cancelled row is off the check: the total already leaves it out, and
 * printing it anyway put on the paper a dish nobody ate and nobody pays for.
 * A voided row stays, beside the negative line that cancels it: that pair is
 * how a void is meant to show.
 *
 * Rows that read the same fold into one line, quantity and money summed
 * (`billRowIdentity`): three lasagne under a menu of eight read "Lasagne 3",
 * and two Coca-Cola with a third ordered later read "Coca-Cola 3", not the
 * same name down the paper. Every portion and every addition is a row of its
 * own on the check — the kitchen's progress, the run and the void work row by
 * row — and only the paper is compacted.
 */
export function printableBillRows(items: OrderItem[]): OrderItem[] {
  const rows: OrderItem[] = [];
  const indexByIdentity = new Map<string, number>();
  for (const item of items) {
    if (item?.status === 'cancelled') continue;
    const identity = billRowIdentity(item);
    if (identity === null) {
      rows.push(item);
      continue;
    }
    const index = indexByIdentity.get(identity);
    if (index === undefined) {
      indexByIdentity.set(identity, rows.length);
      rows.push({
        ...item,
        quantity: Number(item.quantity) || 0,
        subtotal: Number(item.subtotal) || 0,
        total: Number(item.total) || 0,
      });
      continue;
    }
    const row = rows[index];
    row.quantity += Number(item.quantity) || 0;
    row.subtotal = roundMoney(row.subtotal + (Number(item.subtotal) || 0));
    row.total = roundMoney(row.total + (Number(item.total) || 0));
  }
  return rows;
}

/**
 * Which printed line a row joins, or null for a row printed on its own — the
 * mirror of `billRowIdentity` in `main/printers/thermal.ts`.
 *
 * The portions of one menu line join by dish, name, unit price (the
 * surcharge) and note, a voided portion apart from the others. A dish from the
 * card joins the rows the kitchen ticket folds it with (`dishIdentity`) at the
 * same price, add-ons included. A menu's own row, and a voided row from the
 * card with the negative line beside it, stay as they are: that pair is how a
 * void is meant to show.
 */
function billRowIdentity(item: OrderItem): string | null {
  if (item?.menu_role === 'course') {
    if (!item?.menu_group_id) return null;
    return JSON.stringify([
      'menu',
      item.menu_group_id,
      item.product_id ?? null,
      String(item.product_name ?? ''),
      Number(item.unit_price) || 0,
      String(item.special_instructions ?? '').trim().toLowerCase(),
      item.status === 'voided',
    ]);
  }
  if (item?.menu_role || ['voided', 'void_adjustment'].includes(String(item?.status))) return null;
  const addonPrices = (item.addons || [])
    .filter((addon) => addon?.name)
    .map((addon) => JSON.stringify([String(addon.name), Number(addon.quantity) || 1, Number(addon.price) || 0]))
    .sort();
  return JSON.stringify(['card', dishIdentity(item), Number(item.unit_price) || 0, addonPrices]);
}

/**
 * How a row of a fixed menu reads on paper. The package line is the one that
 * costs; a dish chosen inside it sits underneath, indented, and shows only a
 * surcharge — with the sign on it, so the guest can add the indented lines to
 * the package in their head and land on the total.
 */
export function menuCourseLine(
  item: { menu_role?: string | null; total?: number | string },
): { indent: boolean; suppressAmount: boolean; sign: string } {
  const isCourse = item?.menu_role === 'course';
  if (!isCourse) return { indent: false, suppressAmount: false, sign: '' };
  return { indent: true, suppressAmount: !(Number(item.total) > 0), sign: '+' };
}
