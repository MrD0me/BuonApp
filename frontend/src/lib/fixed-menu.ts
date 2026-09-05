import type { CartItem, FixedMenuCourse, FixedMenuSelection, OrderItem, Product } from './types';

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

/** The part of a course that decides membership — a saved one or a draft. */
export type CourseMembership = Pick<FixedMenuCourse, 'category_ids'> & {
  included_product_ids?: string[];
  excluded_product_ids?: string[];
};

/**
 * Whether a dish belongs to a course — the mirror of `courseAllowsDish` in
 * `main/services/fixed-menu.ts`. The categories are the rule, the owner's two
 * lists are the exceptions, and the explicit wins. If these two ever disagree
 * the till offers a dish the check then refuses, so they change together.
 */
export function courseAllowsProduct(course: CourseMembership, product: Product): boolean {
  const excluded = course.excluded_product_ids || [];
  const included = course.included_product_ids || [];
  if (excluded.includes(product.id)) return false;
  if (included.includes(product.id)) return true;
  return product.category_id != null && course.category_ids.includes(String(product.category_id));
}

/** The dishes a course can be filled with, active only and never a menu. */
export function courseChoices(course: FixedMenuCourse, products: Product[]): Product[] {
  return products.filter((product) => (
    product.is_active
    && !product.is_fixed_menu
    && courseAllowsProduct(course, product)
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

/** Where a dish battered from the grid could land. */
export interface OpenSlot {
  /** A menu line still in the cart, or one already on the check. */
  target: { kind: 'cart'; cartItemId: string } | { kind: 'order'; groupId: string };
  /** What to call the menu on the button — "Menu 1", "Menu 2". */
  menuLabel: string;
  course: FixedMenuCourse;
  surcharge: number;
  /** Dishes already chosen for this course, so a swap keeps them. */
  taken: string[];
}

/** One open menu, whichever side of being sent it is on. */
export interface MenuLineLike {
  target: OpenSlot['target'];
  menu: Product | undefined;
  /** What each course of it already holds. */
  chosen: { course_id: string; product_id: string }[];
}

/**
 * The courses of the open menus this dish would fit, with room left.
 *
 * This is what turns "two menus and one à la carte" from a guess at the till
 * into something the floor says once, with a tap, while it is ordering. The
 * check then knows which tagliatelle was inside a menu and which was not, and
 * nobody has to work it out again from the totals at the end — which cannot
 * be done, when two guests took the menu and a third ordered the same dish.
 *
 * A full course is left out: a question whose only answer is "no" is noise.
 * Changing a choice already made is done from the menu itself.
 */
export function openSlotsForProduct(product: Product, menus: MenuLineLike[]): OpenSlot[] {
  if (isFixedMenu(product) || !product.is_active) return [];

  const slots: OpenSlot[] = [];
  menus.forEach((line, index) => {
    const courses = [...(line.menu?.courses || [])].sort((left, right) => left.sort_order - right.sort_order);
    for (const course of courses) {
      if (!courseAllowsProduct(course, product)) continue;
      const taken = line.chosen.filter((choice) => choice.course_id === course.id).map((choice) => choice.product_id);
      if (taken.length >= course.max_choices) continue;
      slots.push({
        target: line.target,
        menuLabel: `${line.menu?.name ?? ''} ${index + 1}`.trim(),
        course,
        surcharge: courseSurcharge(course, product.id),
        taken,
      });
    }
  });
  return slots;
}

/** The menu lines sitting in the cart, in the shape openSlotsForProduct takes. */
export function menuLinesOfCart(items: CartItem[]): MenuLineLike[] {
  return items
    .filter((item) => isFixedMenu(item.product))
    .map((item) => ({
      target: { kind: 'cart' as const, cartItemId: item.id },
      menu: item.product,
      chosen: item.menu_selection || [],
    }));
}

/** The same, for menus already on the check. */
export function menuLinesOfOrder(groups: MenuGroupState[]): MenuLineLike[] {
  return groups.map((group) => ({
    target: { kind: 'order' as const, groupId: group.group_id },
    menu: group.menu,
    chosen: group.slots.flatMap((slot) => slot.filled.map((row) => ({
      course_id: slot.course.id,
      product_id: String(row.product_id),
    }))),
  }));
}

/**
 * Order rows so a menu's dishes stay under the menu that paid for them.
 *
 * Insertion order otherwise. Without this a dish chosen after the menu was
 * first sent has a higher id and drifts to the bottom of the list —
 * indented and priced at nothing under a dish it has nothing to do with.
 * The printed bill sorts the same way, in `getOrderWithItems`.
 */
export function menuAwareRowOrder<T extends {
  id: number; menu_group_id?: string | null; menu_role?: string | null;
}>(items: T[]): T[] {
  const anchors = new Map<string, number>();
  for (const item of items) {
    if (item.menu_role !== 'package' || !item.menu_group_id) continue;
    const seen = anchors.get(item.menu_group_id);
    if (seen === undefined || item.id < seen) anchors.set(item.menu_group_id, item.id);
  }
  const anchorOf = (item: T) => (
    (item.menu_group_id ? anchors.get(item.menu_group_id) : undefined) ?? item.id
  );

  return [...items].sort((left, right) => (
    anchorOf(left) - anchorOf(right)
    || Number(left.menu_role !== 'package') - Number(right.menu_role !== 'package')
    || left.id - right.id
  ));
}

/**
 * Whether a selection is one the check will accept.
 *
 * Only the ceiling: a course can be left empty, because the table often has
 * not decided yet and taking the order it is actually giving beats refusing
 * it. Overfilling is a different matter — three mains in a course that allows
 * one is a mis-ring, not a decision postponed.
 */
export function selectionIsValid(menu: Product, selection: FixedMenuSelection): boolean {
  return (menu.courses || []).every((course) => (
    selection.filter((choice) => choice.course_id === course.id).length <= course.max_choices
  ));
}

/** The required courses nobody has chosen for yet. */
export function missingRequiredCourses(menu: Product, selection: FixedMenuSelection): FixedMenuCourse[] {
  return (menu.courses || []).filter((course) => (
    course.is_required && !selection.some((choice) => choice.course_id === course.id)
  ));
}

/** Whether every required course has been filled in and none overfilled. */
export function selectionIsComplete(menu: Product, selection: FixedMenuSelection): boolean {
  return selectionIsValid(menu, selection) && missingRequiredCourses(menu, selection).length === 0;
}

/** One course of a menu already on the check, and what is in it. */
export interface MenuSlot {
  course: FixedMenuCourse;
  filled: OrderItem[];
  free: number;
}

/** One menu already on the check, read back from its order rows. */
export interface MenuGroupState {
  group_id: string;
  packageItem: OrderItem;
  menu: Product | undefined;
  slots: MenuSlot[];
  /** Dish rows whose course cannot be told — from before the course was recorded. */
  strays: OrderItem[];
  missingRequired: FixedMenuCourse[];
}

/**
 * The menus on a check, each with its courses filled and its slots still
 * empty — what the order panel draws, and what tells the till which slot a
 * dish could be dropped into.
 *
 * Cancelled rows are left out: a dish taken off the check frees its slot
 * again, which is the whole point of being able to change one choice.
 */
export function menuGroupsOfOrder(items: OrderItem[], products: Product[]): MenuGroupState[] {
  const live = items.filter((item) => !['cancelled', 'voided', 'void_adjustment'].includes(String(item.status)));

  return live
    .filter((item) => item.menu_role === 'package' && item.menu_group_id)
    .map((packageItem) => {
      const groupId = String(packageItem.menu_group_id);
      const dishes = live.filter((item) => item.menu_group_id === groupId && item.menu_role === 'course');
      const menu = products.find((product) => product.id === packageItem.product_id);
      const courses = [...(menu?.courses || [])].sort((left, right) => left.sort_order - right.sort_order);

      const slots = courses.map((course) => {
        const filled = dishes.filter((dish) => dish.menu_course_id === course.id);
        return { course, filled, free: Math.max(0, course.max_choices - filled.length) };
      });

      return {
        group_id: groupId,
        packageItem,
        menu,
        slots,
        strays: dishes.filter((dish) => !courses.some((course) => course.id === dish.menu_course_id)),
        missingRequired: slots
          .filter((slot) => slot.course.is_required && slot.filled.length === 0)
          .map((slot) => slot.course),
      };
    });
}
