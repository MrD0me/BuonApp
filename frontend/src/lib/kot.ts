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

/** The rows a "Send to kitchen (n)" button is counting. */
export function pendingKotItems<T extends Pick<OrderItem, 'kot_batch' | 'status'>>(items: T[]): T[] {
  return items.filter(isPendingKot);
}

/**
 * How many plates are still waiting to go: the number on the "N to send"
 * badge of a table. Dishes, not the priced menu line — the package row is
 * stamped with the round too, but nobody cooks it and the floor is counting
 * plates.
 */
export function pendingDishCount<T extends Pick<OrderItem, 'kot_batch' | 'status' | 'menu_role'>>(items: T[]): number {
  return pendingKotItems(items).filter((item) => item.menu_role !== 'package').length;
}
