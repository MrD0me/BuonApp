import type { Product } from './types';

/**
 * Whether a tap on a dish needs to open its options window before it can go
 * in the cart.
 *
 * Most of a menu is a plate with nothing to decide — a water, a tiramisù —
 * and opening a window with an empty note and a quantity of one for each of
 * them cost the floor a tap per dish, all evening. So a dish goes straight
 * into the cart unless there is genuinely something to choose:
 *
 * - an add-on group with at least one active option (an empty group would
 *   open an empty window: the same filter `AddonModal` applies);
 * - a dish whose price is decided at the till (`price_required`, the
 *   "Generico" of docs/order-flow-and-navigation.md §7), whose note *is* the
 *   dish — it has to be typed.
 *
 * Fixed menus and "inside the menu?" are decided before this by the caller;
 * a note or a quantity other than one is still reachable from the tile's
 * options button and from the cart line.
 *
 * Pure: mountable on the handheld unchanged.
 */
export function needsOptionsDialog(product: Product): boolean {
  if (product.price_required) return true;
  return (product.addon_groups || []).some((group) =>
    group.is_active !== false && (group.addons || []).some((addon) => addon.is_active));
}
