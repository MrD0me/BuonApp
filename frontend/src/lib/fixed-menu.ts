import type { CartItem, FixedMenuCourse, FixedMenuSelection, OrderItem, Product } from './types';
import { dishIdentity, isPendingKot } from './kot';
import { serviceRunOf } from './service-runs';
import { roundMoney } from './utils';

/**
 * Client-side helpers for the fixed menu (docs/coperto-e-menu-fisso.md).
 *
 * Everything here is for showing the guest what a menu will come to before it
 * is sent. The prices that end up on the check are worked out again by the
 * backend from its own catalogue — this side never gets to say what anything
 * costs.
 *
 * A menu line feeds however many guests took it — "Menu completo ×8" — and its
 * dishes are counted, not handed out: three lasagne, two carbonara. A course
 * holds as many dishes as the line has menus, times its choices.
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

/** How many portions one choice stands for: its count, or one when it has none. */
export function portionsOf(choice: { quantity?: number | null }): number {
  if (choice.quantity === undefined || choice.quantity === null) return 1;
  const portions = Math.floor(Number(choice.quantity));
  return Number.isFinite(portions) && portions > 0 ? portions : 0;
}

/** How many dishes a selection puts in one course. */
export function courseCount(selection: FixedMenuSelection | undefined, courseId: string): number {
  return (selection || []).reduce(
    (total, choice) => total + (choice.course_id === courseId ? portionsOf(choice) : 0),
    0,
  );
}

/**
 * The most dishes one course holds on a line of this many menus — the mirror
 * of `courseLimit` in `main/services/fixed-menu.ts`.
 */
export function courseCapacity(course: Pick<FixedMenuCourse, 'max_choices'>, menus: number): number {
  return Math.max(1, Number(course.max_choices) || 1) * Math.max(0, Math.floor(Number(menus)) || 0);
}

/** How many menus a menu line in the cart feeds. */
export function menusOfLine(item: Pick<CartItem, 'quantity'>): number {
  return Math.max(1, Math.floor(Number(item.quantity)) || 1);
}

/** Everything the chosen dishes add to the menus' own price: a surcharge per portion. */
export function selectionSurcharge(menu: Product, selection: FixedMenuSelection | undefined): number {
  if (!selection || !menu.courses) return 0;
  return selection.reduce((total, choice) => {
    const course = menu.courses!.find((entry) => entry.id === choice.course_id);
    return total + (course ? courseSurcharge(course, choice.product_id) * portionsOf(choice) : 0);
  }, 0);
}

/**
 * What one cart line comes to.
 *
 * A menu line is its price once per menu, plus what its dishes add: the
 * surcharges count per dish and not per menu, so two steaks on a line of eight
 * add two surcharges. Any other line is its price, add-ons in, times its
 * quantity.
 */
export function cartLineTotal(item: CartItem): number {
  const base = Number(item.product?.price) || 0;
  if (item.menu_selection) {
    return base * menusOfLine(item) + selectionSurcharge(item.product, item.menu_selection);
  }
  const addons = (item.addons || []).reduce(
    (sum, addon) => sum + (Number(addon.price) || 0) * (Number(addon.quantity) || 1),
    0,
  );
  return (base + addons) * (Number(item.quantity) || 1);
}

/** One dish of a menu line as a cart reads it back: "· Lasagne ×3 (+3,00) — senza besciamella". */
export interface MenuLineDish {
  key: string;
  name: string;
  quantity: number;
  /** What those portions add to the menus' price together; zero when the package covers them. */
  surcharge: number;
  note: string;
}

/**
 * The dishes of a menu line in the cart, counted and in course order, for the
 * floor to read back without reopening the window. Names come from the
 * catalogue, not from the cart's own lines: a dish is only a line of its own
 * when somebody also ordered it from the card, and the rest used to print
 * their raw id. A dish taken off the menu since shows as a dash.
 */
export function menuLineDishes(item: CartItem, products: Product[]): MenuLineDish[] {
  const courses = [...(item.product.courses || [])].sort((left, right) => left.sort_order - right.sort_order);
  const order = (courseId: string) => {
    const index = courses.findIndex((course) => course.id === courseId);
    return index < 0 ? courses.length : index;
  };
  return tallySelection(item.menu_selection || [])
    .map((choice, index) => ({ choice, index }))
    .sort((left, right) => order(left.choice.course_id) - order(right.choice.course_id) || left.index - right.index)
    .map(({ choice, index }) => {
      const course = courses.find((entry) => entry.id === choice.course_id);
      const quantity = portionsOf(choice);
      return {
        key: `${choice.course_id}:${choice.product_id}:${index}`,
        name: products.find((product) => product.id === choice.product_id)?.name ?? '—',
        quantity,
        surcharge: course ? courseSurcharge(course, choice.product_id) * quantity : 0,
        note: choice.note || '',
      };
    });
}

/**
 * Folds a selection into one entry per course, dish, note and run, the repeats
 * counted.
 *
 * A course read back off the check arrives as one entry per portion — every
 * portion is a row there — and the window shows "Lasagne 3". Entries counted
 * to nothing are dropped.
 */
export function tallySelection(selection: FixedMenuSelection): FixedMenuSelection {
  const tallied: FixedMenuSelection = [];
  for (const choice of selection) {
    const portions = portionsOf(choice);
    if (portions <= 0) continue;
    const note = (choice.note || '').trim();
    const run = choice.service_run ?? null;
    const same = tallied.find((entry) => (
      entry.course_id === choice.course_id
      && entry.product_id === choice.product_id
      && (entry.note || '') === note
      && (entry.service_run ?? null) === run
    ));
    if (same) {
      same.quantity = portionsOf(same) + portions;
      continue;
    }
    tallied.push({
      course_id: choice.course_id,
      product_id: choice.product_id,
      quantity: portions,
      ...(note ? { note } : {}),
      ...(run !== null ? { service_run: run } : {}),
    });
  }
  return tallied;
}

/** Where a dish battered from the grid could land. */
export interface OpenSlot {
  /** A menu line still in the cart, or one already on the check. */
  target: { kind: 'cart'; cartItemId: string } | { kind: 'order'; groupId: string };
  /** What to call the menu line on the button — "Menu completo ×8". */
  menuLabel: string;
  course: FixedMenuCourse;
  surcharge: number;
  /** Dishes the course already holds, one entry per portion, so a fill keeps them. */
  taken: string[];
  /** How many more dishes the course takes. */
  free: number;
}

/** One open menu line, whichever side of being sent it is on. */
export interface MenuLineLike {
  target: OpenSlot['target'];
  menu: Product | undefined;
  /** How many menus the line feeds. */
  menus: number;
  /** What each course of it already holds, one entry per portion. */
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

  // The same menu twice — an old check written one menu a guest, or a second
  // line for guests who came later — needs telling apart on the button.
  const linesPerMenu = new Map<string, number>();
  for (const line of menus) {
    const key = String(line.menu?.id ?? '');
    linesPerMenu.set(key, (linesPerMenu.get(key) || 0) + 1);
  }
  const seenPerMenu = new Map<string, number>();

  const slots: OpenSlot[] = [];
  for (const line of menus) {
    const key = String(line.menu?.id ?? '');
    const ordinal = (seenPerMenu.get(key) || 0) + 1;
    seenPerMenu.set(key, ordinal);
    const label = `${line.menu?.name ?? ''} ×${line.menus}`.trim()
      + ((linesPerMenu.get(key) || 0) > 1 ? ` (${ordinal})` : '');

    const courses = [...(line.menu?.courses || [])].sort((left, right) => left.sort_order - right.sort_order);
    for (const course of courses) {
      if (!courseAllowsProduct(course, product)) continue;
      const taken = line.chosen.filter((choice) => choice.course_id === course.id).map((choice) => choice.product_id);
      const free = courseCapacity(course, line.menus) - taken.length;
      if (free <= 0) continue;
      slots.push({
        target: line.target,
        menuLabel: label,
        course,
        surcharge: courseSurcharge(course, product.id),
        taken,
        free,
      });
    }
  }
  return slots;
}

/** The menu lines sitting in the cart, in the shape openSlotsForProduct takes. */
export function menuLinesOfCart(items: CartItem[]): MenuLineLike[] {
  return items
    .filter((item) => isFixedMenu(item.product))
    .map((item) => ({
      target: { kind: 'cart' as const, cartItemId: item.id },
      menu: item.product,
      menus: menusOfLine(item),
      chosen: (item.menu_selection || []).flatMap((choice) => (
        Array.from({ length: portionsOf(choice) }, () => ({ course_id: choice.course_id, product_id: choice.product_id }))
      )),
    }));
}

/** The same, for menus already on the check. */
export function menuLinesOfOrder(groups: MenuGroupState[]): MenuLineLike[] {
  return groups.map((group) => ({
    target: { kind: 'order' as const, groupId: group.group_id },
    menu: group.menu,
    menus: group.menus,
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
 * Whether a selection is one the check will accept for a line of this many
 * menus.
 *
 * Only the ceiling: a course can be left empty, because the table often has
 * not decided yet and taking the order it is actually giving beats refusing
 * it. Overfilling is a different matter — nine mains on eight menus is a
 * mis-ring, not a decision postponed, and the ninth is ordered from the card.
 */
export function selectionIsValid(menu: Product, selection: FixedMenuSelection, menus: number): boolean {
  return (menu.courses || []).every((course) => courseCount(selection, course.id) <= courseCapacity(course, menus));
}

/** The expected courses that do not yet have a dish for every menu. */
export function missingRequiredCourses(menu: Product, selection: FixedMenuSelection, menus: number): FixedMenuCourse[] {
  return (menu.courses || []).filter((course) => (
    course.is_required && courseCount(selection, course.id) < menus
  ));
}

/** One course of a menu already on the check, and what is in it. */
export interface MenuSlot {
  course: FixedMenuCourse;
  filled: OrderItem[];
  free: number;
}

/** One menu line already on the check, read back from its order rows. */
export interface MenuGroupState {
  group_id: string;
  packageItem: OrderItem;
  menu: Product | undefined;
  /** How many menus the line feeds: the package row's quantity. */
  menus: number;
  slots: MenuSlot[];
  /** Dish rows whose course cannot be told — from before the course was recorded. */
  strays: OrderItem[];
  missingRequired: FixedMenuCourse[];
}

/**
 * The menu lines on a check, each with its courses filled and the room still
 * left in them — what the order panel draws, and what tells the till which
 * course a dish could be dropped into.
 *
 * Cancelled rows are left out: a dish taken off the check frees its place
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
      const menus = Math.max(1, Math.floor(Number(packageItem.quantity)) || 1);

      const slots = courses.map((course) => {
        const filled = dishes.filter((dish) => dish.menu_course_id === course.id);
        return { course, filled, free: Math.max(0, courseCapacity(course, menus) - filled.length) };
      });

      return {
        group_id: groupId,
        packageItem,
        menu,
        menus,
        slots,
        strays: dishes.filter((dish) => !courses.some((course) => course.id === dish.menu_course_id)),
        missingRequired: slots
          .filter((slot) => slot.course.is_required && slot.filled.length < menus)
          .map((slot) => slot.course),
      };
    });
}

/**
 * What a menu line on the check already holds, as the window takes it: an
 * entry per portion, with the note each one carries. The window counts them;
 * saving a course then keeps what every portion already said.
 *
 * The wave is not read back, because the window does not ask for it: inside a
 * menu the courses are the running order. A row somebody did move from the
 * check keeps its wave all the same — the fill route matches a plain wish to a
 * row whatever wave it is on.
 */
export function selectionOfGroup(group: MenuGroupState): FixedMenuSelection {
  return group.slots.flatMap((slot) => slot.filled.map((row) => ({
    course_id: slot.course.id,
    product_id: String(row.product_id),
    ...(row.special_instructions ? { note: row.special_instructions } : {}),
  })));
}

/** One dish of a course as `PUT /orders/:id/menu-groups/:group/courses/:course` takes it. */
export interface CourseFillEntry {
  product_id: string;
  quantity: number;
  note?: string;
  service_run?: number;
}

/**
 * What a course holds afterwards, as the fill route takes it. A bare id names
 * the dish and keeps whatever note and run that portion already has — what
 * the grid sends for the dishes already there when it drops one more in; an
 * entry says them.
 */
export type CourseFill = Array<string | CourseFillEntry>;

/**
 * The dishes of one course of a selection, counted, ready for the fill route.
 *
 * No wave is sent: the window does not ask for one inside a menu. The check
 * reads a portion that says nothing about its wave as "any wave", so a course
 * saved again leaves the rows it already has exactly where they are, and a
 * portion that turns out to be new takes the wave its own category gives it.
 */
export function courseFillOf(selection: FixedMenuSelection, courseId: string): CourseFillEntry[] {
  return selection
    .filter((choice) => choice.course_id === courseId && portionsOf(choice) > 0)
    .map((choice) => ({
      product_id: choice.product_id,
      quantity: portionsOf(choice),
      ...(choice.note ? { note: choice.note } : {}),
    }));
}

/** One line of a check as the screen draws it: rows that read the same, folded. */
export interface OrderRowLine {
  /**
   * The row a tap on the line acts on: the newest of the rows it folds — the
   * last one added. They share dish, note, price, run and state, so any one of
   * them would do, and the newest is the likeliest to still be waiting.
   */
  item: OrderItem;
  /** Every row the line folds, oldest first. */
  rows: OrderItem[];
  quantity: number;
  total: number;
}

/** A row of an off-menu product that nobody has priced yet: it says so, so a priced one is another line. */
function awaitingPrice(row: OrderItem): boolean {
  return Boolean(row.price_required) && !row.price_confirmed;
}

/**
 * Which line a row folds into, or null for a row that is always a line of
 * its own.
 *
 * Two rows fold when the kitchen ticket would print them as one dish
 * (`dishIdentity`) and the screen has nothing to tell apart either: the same
 * price, the same run, the same state in the kitchen — "to send" included —
 * and, off the menu, the same wait for a price. A dish added again later
 * reads "3× Coca-Cola" once its round has gone like the first; while one
 * batch is still to send, or the kitchen has one in hand, they are two lines
 * because they are two different things.
 *
 * A menu's own row never folds, a dish of a menu folds only with the portions
 * of that menu and course, and a voided row is left beside the negative line
 * that cancels it: that pair is how a void is meant to show.
 */
function lineKey(row: OrderItem): string | null {
  const state = [serviceRunOf(row), row.status, isPendingKot(row)];
  if (row.menu_role === 'course') {
    return row.menu_group_id
      ? JSON.stringify(['menu', row.menu_group_id, row.menu_course_id ?? null, dishIdentity(row), Number(row.unit_price) || 0, ...state])
      : null;
  }
  if (row.menu_role || ['voided', 'void_adjustment'].includes(String(row.status))) return null;
  const addonPrices = (row.addons || [])
    .filter((addon) => addon?.name)
    .map((addon) => JSON.stringify([String(addon.name), Number(addon.quantity) || 1, Number(addon.price) || 0]))
    .sort();
  return JSON.stringify(['card', dishIdentity(row), Number(row.unit_price) || 0, addonPrices, awaitingPrice(row), ...state]);
}

/**
 * Folds the rows that read the same into one line, for the screen.
 *
 * Every portion of a menu is a row of its own on the check, and every "add"
 * writes rows of its own, so the kitchen's progress, the run and the void work
 * row by row. The floor reads "3× Lasagne" and "3× Coca-Cola": the line sits
 * where its first row was, and counts and costs what all of them do. An action
 * on a folded line acts on one row of it (`item`), which is how one lasagna of
 * three, or the last Coca-Cola added, comes off the check while the rest stay.
 */
export function compactOrderRows(rows: OrderItem[]): OrderRowLine[] {
  const lines: OrderRowLine[] = [];
  const lineOf = new Map<string, OrderRowLine>();
  for (const row of rows) {
    const key = lineKey(row);
    const same = key === null ? undefined : lineOf.get(key);
    if (!same) {
      const line = { item: row, rows: [row], quantity: Number(row.quantity) || 0, total: Number(row.total) || 0 };
      lines.push(line);
      if (key !== null) lineOf.set(key, line);
      continue;
    }
    same.rows.push(row);
    same.quantity += Number(row.quantity) || 0;
    same.total = roundMoney(same.total + (Number(row.total) || 0));
    if (row.id > same.item.id) same.item = row;
  }
  return lines;
}
