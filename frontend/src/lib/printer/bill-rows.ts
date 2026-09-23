import type { OrderItem } from '@/lib/types';
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
 * The portions of a menu line fold into one row per dish, name, surcharge and
 * note: three lasagne under a menu of eight read "Lasagne 3", not the same
 * name three times. Every portion is a row of its own on the check — the
 * kitchen's progress, the run and the void work dish by dish — and only the
 * paper is compacted.
 */
export function printableBillRows(items: OrderItem[]): OrderItem[] {
  const rows: OrderItem[] = [];
  const indexByIdentity = new Map<string, number>();
  for (const item of items) {
    if (item?.status === 'cancelled') continue;
    if (item?.menu_role !== 'course' || !item?.menu_group_id) {
      rows.push(item);
      continue;
    }
    const identity = JSON.stringify([
      item.menu_group_id,
      item.product_id ?? null,
      String(item.product_name ?? ''),
      Number(item.unit_price) || 0,
      String(item.special_instructions ?? '').trim().toLowerCase(),
      item.status === 'voided',
    ]);
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
