import type { OrderItem } from './types';

/**
 * Whether a row is still waiting to go to the kitchen.
 *
 * This was written out by hand in three places and all three had drifted: the
 * floor map excluded cancelled and voided rows, the order panel only cancelled
 * ones, and the table sheet only voided ones. None of them excluded the
 * mirrored negative row a void writes, so a voided dish left the table showing
 * a round that was never coming — and the backend queue had the same hole, so
 * the next ticket really did print "1 VOID: TAGLIATA".
 *
 * It matches `getPendingKotItems` in `main/routes/printers.ts`, which is the
 * one that decides what actually prints. When that changes, this changes.
 */
const OFF_THE_CHECK = ['cancelled', 'voided', 'void_adjustment'];

export function isPendingKot(item: Pick<OrderItem, 'kot_batch' | 'status'>): boolean {
  return item.kot_batch == null && !OFF_THE_CHECK.includes(String(item.status));
}

/** The rows a "Send to kitchen" round will carry; the plates in them are `pendingDishCount`. */
export function pendingKotItems<T extends Pick<OrderItem, 'kot_batch' | 'status'>>(items: T[]): T[] {
  return items.filter(isPendingKot);
}

/**
 * How many plates are still waiting to go: the number on the "N to send"
 * badge of a table and on the "Send to kitchen (n)" button. Plates, not rows:
 * a dish from the card is one row carrying its quantity, so two tiramisù
 * ordered together are one row and two plates — counting rows said one. Not
 * the priced menu line either: the package row is stamped with the round too,
 * but nobody cooks it, and its dishes are a row of one apiece.
 */
export function pendingDishCount<T extends Pick<OrderItem, 'kot_batch' | 'status' | 'menu_role' | 'quantity'>>(items: T[]): number {
  return pendingKotItems(items)
    .filter((item) => item.menu_role !== 'package')
    .reduce((plates, item) => plates + (Number(item.quantity) || 1), 0);
}

/**
 * What makes two rows the same dish to a cook: the product and its name, the
 * add-ons (in any order they were ticked), the note, and the variant and
 * modifier selections. The note is compared trimmed and case-folded, so the
 * same instruction typed on the handheld and on the till counts once, and a
 * row carrying a note only ever matches one carrying that very note.
 *
 * It matches `kotItemIdentity` in `main/printers/thermal.ts`, which folds the
 * kitchen ticket. The table screens and the printed bill fold on it too, so
 * the three never disagree about what "the same" is. When that changes, this
 * changes.
 */
export function dishIdentity(
  item: Pick<OrderItem, 'product_id' | 'product_name' | 'special_instructions' | 'addons' | 'variant_selection' | 'modifier_selection'>,
): string {
  const addons = (item.addons || [])
    .filter((addon) => addon?.name)
    .map((addon) => JSON.stringify([String(addon.name), Number(addon.quantity) || 1]))
    .sort();
  return JSON.stringify([
    item.product_id ?? null,
    String(item.product_name ?? ''),
    String(item.special_instructions ?? '').trim().toLowerCase(),
    addons,
    item.variant_selection ?? null,
    item.modifier_selection ?? null,
  ]);
}
