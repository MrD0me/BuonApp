import type { CartItem, FixedMenuCourse, FixedMenuSelection, Product } from './types';

/**
 * Client-side helpers for the fixed menu (docs/coperto-e-menu-fisso.md).
 *
 * Everything here is for showing the guest what a menu will come to before it
 * is sent. The prices that end up on the check are worked out again by the
 * backend from its own catalogue — this side never gets to say what anything
 * costs.
 */

export function isFixedMenu(product: Product | null | undefined): boolean {
  return Boolean(product?.is_fixed_menu);
}

/** The dishes a course can be filled with: its categories, active only. */
export function courseChoices(course: FixedMenuCourse, products: Product[]): Product[] {
  return products.filter((product) => (
    product.is_active
    && !product.is_fixed_menu
    && product.category_id != null
    && course.category_ids.includes(String(product.category_id))
  ));
}

/** What one dish costs on top inside a course, or zero. */
export function courseSurcharge(course: FixedMenuCourse, productId: string): number {
  return Number(course.surcharges.find((entry) => entry.product_id === productId)?.surcharge || 0);
}

/** Everything the chosen dishes add to the menu's own price. */
export function selectionSurcharge(menu: Product, selection: FixedMenuSelection | undefined): number {
  if (!selection || !menu.courses) return 0;
  return selection.reduce((total, choice) => {
    const course = menu.courses!.find((entry) => entry.id === choice.course_id);
    return total + (course ? courseSurcharge(course, choice.product_id) : 0);
  }, 0);
}

/** What one cart line costs a head of the table, add-ons and surcharges in. */
export function cartLineUnitPrice(item: CartItem): number {
  const base = Number(item.product?.price) || 0;
  const addons = (item.addons || []).reduce(
    (sum, addon) => sum + (Number(addon.price) || 0) * (Number(addon.quantity) || 1),
    0,
  );
  return base + addons + selectionSurcharge(item.product, item.menu_selection);
}

/** Whether every required course has been filled in and none overfilled. */
export function selectionIsComplete(menu: Product, selection: FixedMenuSelection): boolean {
  return (menu.courses || []).every((course) => {
    const picked = selection.filter((choice) => choice.course_id === course.id).length;
    if (course.is_required && picked === 0) return false;
    return picked <= course.max_choices;
  });
}
