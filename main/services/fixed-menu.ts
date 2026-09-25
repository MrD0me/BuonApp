/**
 * Fixed menus — the set menu at one price (docs/coperto-e-menu-fisso.md).
 *
 * A fixed menu is a product with a tick on it, so it inherits the order row,
 * the check, the archive and the reports for free. What this module adds is the
 * courses that hang off it and, at order time, the expansion that turns one
 * choice into real order rows.
 *
 * The rule the whole design rests on: **a fixed menu writes real rows, one per
 * dish chosen**. The owner first tried building one out of add-on groups and
 * found the flaw in the kitchen — the ticket arrived as "Full menu" with the
 * choices hanging underneath instead of Starters / Pasta / Mains. That is not a
 * formatting problem: an add-on has a name and a price and no category, and the
 * ticket sections dishes by product category, so a commercial package has
 * nothing to be broken into courses by. Real rows have a category and section
 * themselves.
 *
 * The price stays in one place, on the package row. The dish rows carry zero,
 * or the surcharge alone.
 *
 * A menu line is one group however many guests it feeds: "Menu completo ×8"
 * is one package row of quantity 8, and under it the dishes the table chose,
 * counted rather than handed out. The floor takes a set menu the way it always
 * wrote it on paper — three lasagne, two carbonara, one risotto — and nobody
 * says which of the eight had which, so the check does not invent it either.
 * Every portion is still a row of its own: the kitchen's progress, the run,
 * the note and the void work per dish, and the paper folds identical portions
 * into one line (compactKotItems, compactBillRows).
 */

import { getDatabase, now } from '../db';
import { randomUUID } from 'crypto';
import { roundMoney } from '../money';

type Db = ReturnType<typeof getDatabase>;

export interface FixedMenuSurcharge {
  product_id: string;
  surcharge: number;
}

export interface FixedMenuCourse {
  id: string;
  label: string;
  is_required: boolean;
  max_choices: number;
  sort_order: number;
  category_ids: string[];
  surcharges: FixedMenuSurcharge[];
  /** Dishes taken into the course from a category it does not draw from. */
  included_product_ids: string[];
  /** Dishes taken out of a category the course does draw from. */
  excluded_product_ids: string[];
}

/**
 * One dish the table picked, as the client sends it.
 *
 * The note and the run belong to the dish, not to the menu: a menu's package
 * row never reaches a station, so a note written against the menu as a whole
 * was read by nobody. And a primo inside a menu leaves with the primi, which
 * is a fact about that dish and not about the menu it was chosen from.
 *
 * `quantity` is how many portions of it: the window counts, and each portion
 * still becomes a row of its own.
 */
export interface FixedMenuChoiceInput {
  course_id: string;
  product_id: string;
  note?: string | null;
  service_run?: unknown;
  quantity?: unknown;
}

/**
 * An order row ready for the insert loop. Built field by field rather than
 * spread from the request, so a client cannot smuggle in `unit_price_override`
 * and price its own dinner.
 */
export interface ExpandedOrderItem {
  product_id: string;
  quantity: number;
  special_instructions?: string | null;
  variant_selection?: unknown;
  modifier_selection?: unknown;
  addons?: unknown;
  menu_group_id: string | null;
  menu_role: 'package' | 'course' | null;
  /** Which course of the menu a dish row satisfies. Null on every other row. */
  menu_course_id: string | null;
  /** Set only on course rows: the surcharge, or zero. Package rows use the product price. */
  unit_price_override: number | null;
  /**
   * The run the floor asked for, straight off the request and unvalidated —
   * `insertOrderItemRows` resolves it against the dish's category. Left unset
   * on the rows of a menu: a primo inside a menu is a primo and goes out with
   * the primi, so its own category answers.
   */
  service_run?: unknown;
}

/** A row in one of these is off the check and no longer part of its menu. */
const TERMINAL_STATUSES = ['cancelled', 'voided', 'void_adjustment'];

const MAX_COURSES_PER_MENU = 20;
const MAX_CHOICES_PER_COURSE = 10;
/** The covers ceiling `POST /orders` holds a table to: one menu each, at most. */
const MAX_MENUS_PER_LINE = 99;
/** Same ceiling the ordinary item note is held to by default. */
const MAX_CHOICE_NOTE = 100;

/**
 * A note as it goes on a row: trimmed, capped, and empty means none.
 *
 * Cut rather than refused. The window already stops at the same length, and
 * an order is the wrong thing to fail over a note two characters too long.
 */
function choiceNote(value: unknown): string | null {
  const note = String(value ?? '').trim().slice(0, MAX_CHOICE_NOTE);
  return note || null;
}

function invalid(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

/**
 * How many portions one choice stands for. Missing means one, which is what
 * every choice meant before the window started counting. The course ceiling
 * is checked by the caller; this only turns away what is not a count at all.
 */
function choicePortions(value: unknown, menuName: string): number {
  if (value === undefined || value === null) return 1;
  const portions = Number(value);
  if (!Number.isSafeInteger(portions) || portions < 1 || portions > MAX_MENUS_PER_LINE * MAX_CHOICES_PER_COURSE) {
    throw invalid(`${menuName}: a dish was asked for an invalid number of times`);
  }
  return portions;
}

/** The most dishes one course can hold on a line of this many menus. */
function courseLimit(course: FixedMenuCourse, menus: number): number {
  return course.max_choices * menus;
}

function courseLimitMessage(menuName: string, course: FixedMenuCourse, menus: number): string {
  const limit = courseLimit(course, menus);
  return `${menuName}: ${course.label} takes at most ${limit} ${limit === 1 ? 'dish' : 'dishes'}`
    + (menus > 1 ? ` for ${menus} menus` : '');
}

// ── Reading and writing the configuration ────────────────────────────────

export function isFixedMenuProduct(db: Db, productId: string): boolean {
  const row = db.prepare('SELECT is_fixed_menu FROM products WHERE id = ?').get(productId) as { is_fixed_menu?: number } | undefined;
  return Number(row?.is_fixed_menu || 0) === 1;
}

/** The courses of one menu, in the order they are asked at the table. */
export function readFixedMenuCourses(db: Db, productId: string): FixedMenuCourse[] {
  const courses = db.prepare(
    'SELECT * FROM fixed_menu_courses WHERE product_id = ? ORDER BY sort_order, label'
  ).all(productId) as any[];
  if (courses.length === 0) return [];

  const ids = courses.map((course) => course.id);
  const placeholders = ids.map(() => '?').join(',');
  const categories = db.prepare(
    `SELECT course_id, category_id FROM fixed_menu_course_categories WHERE course_id IN (${placeholders})`
  ).all(...ids) as { course_id: string; category_id: string }[];
  const surcharges = db.prepare(
    `SELECT course_id, product_id, surcharge FROM fixed_menu_course_surcharges WHERE course_id IN (${placeholders})`
  ).all(...ids) as { course_id: string; product_id: string; surcharge: number }[];
  const exceptions = db.prepare(
    `SELECT course_id, product_id, mode FROM fixed_menu_course_products WHERE course_id IN (${placeholders})`
  ).all(...ids) as { course_id: string; product_id: string; mode: string }[];

  return courses.map((course) => ({
    id: String(course.id),
    label: String(course.label),
    is_required: Number(course.is_required) === 1,
    max_choices: Math.max(1, Number(course.max_choices) || 1),
    sort_order: Number(course.sort_order) || 0,
    category_ids: categories.filter((row) => row.course_id === course.id).map((row) => row.category_id),
    surcharges: surcharges
      .filter((row) => row.course_id === course.id)
      .map((row) => ({ product_id: row.product_id, surcharge: Number(row.surcharge) || 0 })),
    included_product_ids: exceptions
      .filter((row) => row.course_id === course.id && row.mode === 'include')
      .map((row) => row.product_id),
    excluded_product_ids: exceptions
      .filter((row) => row.course_id === course.id && row.mode === 'exclude')
      .map((row) => row.product_id),
  }));
}

/**
 * Hangs the courses on every fixed menu in a product list, the way add-on
 * groups are already attached. One query per menu is fine: a house has a
 * handful of set menus, not hundreds.
 */
export function attachFixedMenuCourses<T extends { id: string; is_fixed_menu?: number | boolean }>(db: Db, products: T[]): T[] {
  return products.map((product) => (
    product.is_fixed_menu
      ? Object.assign({}, product, { courses: readFixedMenuCourses(db, product.id) })
      : product
  ));
}

/** A product that still exists and has not been soft-deleted. */
function liveProduct(db: Db, productId: string): { id: string; category_id?: string | null; is_fixed_menu?: number } | undefined {
  return db.prepare('SELECT id, category_id, is_fixed_menu FROM products WHERE id = ? AND deleted_at IS NULL')
    .get(productId) as any;
}

/**
 * Whether a dish belongs to a course.
 *
 * The categories are the rule and the two lists are the exceptions to it,
 * with the explicit winning: a dish named in the course is in it whatever its
 * category says, and a dish struck off is out of it for the same reason. This
 * is the one place that answers the question — `buildMenuRows` calls it when
 * an order arrives, and `courseAllowsProduct` in the interface mirrors it so
 * the till offers exactly what the check will accept.
 */
export function courseAllowsDish(course: FixedMenuCourse, dish: { id: string; category_id?: string | null }): boolean {
  if (course.excluded_product_ids.includes(dish.id)) return false;
  if (course.included_product_ids.includes(dish.id)) return true;
  return Boolean(dish.category_id) && course.category_ids.includes(String(dish.category_id));
}

/**
 * The two exception lists, cleaned up.
 *
 * Entries that cannot change any answer are dropped in silence — an include
 * for a dish a listed category already covers, an exclude for a dish no
 * listed category reaches. The editor cannot produce either, and storing them
 * would only leave rows that come back to life if a category is toggled
 * later, changing a menu nobody edited.
 */
function normalizeExceptions(
  db: Db,
  label: string,
  raw: any,
  categoryIds: string[],
): { included: string[]; excluded: string[] } {
  const readList = (value: unknown, what: string): string[] => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw invalid(`${label}: ${what} must be a list of dishes`);
    return [...new Set((value as unknown[]).map((entry) => String(entry ?? '')))].filter(Boolean);
  };

  const requested = {
    include: readList(raw?.included_product_ids, 'the dishes taken into the course'),
    exclude: readList(raw?.excluded_product_ids, 'the dishes taken out of the course'),
  };

  for (const productId of requested.include) {
    if (requested.exclude.includes(productId)) {
      throw invalid(`${label}: a dish cannot be both taken in and left out`);
    }
  }

  const included: string[] = [];
  const excluded: string[] = [];
  for (const [mode, productIds] of Object.entries(requested) as ['include' | 'exclude', string[]][]) {
    for (const productId of productIds) {
      const product = liveProduct(db, productId);
      if (!product) continue;
      if (Number(product.is_fixed_menu || 0) === 1) {
        throw invalid(`${label}: a fixed menu cannot be a course of another menu`);
      }
      const coveredByCategory = Boolean(product.category_id) && categoryIds.includes(String(product.category_id));
      if (mode === 'include' && !coveredByCategory) included.push(productId);
      if (mode === 'exclude' && coveredByCategory) excluded.push(productId);
    }
  }
  return { included, excluded };
}

/**
 * Replaces a menu's whole configuration. Courses are rewritten rather than
 * patched: the editor hands over the finished menu, and rebuilding it is the
 * only way an unnamed course cannot survive being deleted in the UI.
 */
export function saveFixedMenuCourses(db: Db, productId: string, courses: unknown): FixedMenuCourse[] {
  const product = db.prepare('SELECT id, is_fixed_menu FROM products WHERE id = ? AND deleted_at IS NULL').get(productId) as any;
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  if (Number(product.is_fixed_menu || 0) !== 1) throw invalid('This product is not a fixed menu');

  if (!Array.isArray(courses)) throw invalid('courses must be an array');
  if (courses.length > MAX_COURSES_PER_MENU) throw invalid(`A fixed menu can have at most ${MAX_COURSES_PER_MENU} courses`);

  const normalized = courses.map((raw: any, index: number) => {
    const label = String(raw?.label ?? '').trim().slice(0, 60);
    if (!label) throw invalid('Every course needs a name');

    const maxChoices = Number(raw?.max_choices ?? 1);
    if (!Number.isSafeInteger(maxChoices) || maxChoices < 1 || maxChoices > MAX_CHOICES_PER_COURSE) {
      throw invalid(`${label}: the number of choices must be between 1 and ${MAX_CHOICES_PER_COURSE}`);
    }

    const categoryIds: string[] = Array.isArray(raw?.category_ids)
      ? [...new Set((raw.category_ids as unknown[]).map((entry) => String(entry ?? '')))]
      : [];
    if (categoryIds.length === 0) throw invalid(`${label}: pick at least one category to draw from`);
    for (const categoryId of categoryIds) {
      if (!db.prepare('SELECT 1 FROM categories WHERE id = ? AND deleted_at IS NULL').get(categoryId)) {
        throw invalid(`${label}: one of the categories no longer exists`);
      }
    }

    // A dish that vanished between the editor loading and the owner pressing
    // save is dropped, not thrown over: refusing to save a whole menu because
    // an unrelated dish was deleted elsewhere leaves the owner with no way
    // out. Three lists reference products now, so the exposure is threefold.
    const surcharges = (Array.isArray(raw?.surcharges) ? raw.surcharges : [])
      .map((entry: any) => {
        const surchargeProductId = String(entry?.product_id ?? '');
        const amount = Number(entry?.surcharge);
        if (!surchargeProductId) throw invalid(`${label}: a surcharge is missing its dish`);
        if (!Number.isFinite(amount) || amount < 0) throw invalid(`${label}: a surcharge must be zero or more`);
        return { product_id: surchargeProductId, surcharge: roundMoney(amount) };
      })
      .filter((entry: FixedMenuSurcharge) => Boolean(liveProduct(db, entry.product_id)));

    const { included, excluded } = normalizeExceptions(db, label, raw, categoryIds);

    return {
      label,
      is_required: raw?.is_required === false ? 0 : 1,
      max_choices: maxChoices,
      sort_order: Number.isSafeInteger(Number(raw?.sort_order)) ? Number(raw.sort_order) : index,
      categoryIds,
      surcharges,
      included,
      excluded,
    };
  });

  const timestamp = now();
  const oldIds = (db.prepare('SELECT id FROM fixed_menu_courses WHERE product_id = ?').all(productId) as { id: string }[]).map((row) => row.id);
  if (oldIds.length > 0) {
    const placeholders = oldIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM fixed_menu_course_categories WHERE course_id IN (${placeholders})`).run(...oldIds);
    db.prepare(`DELETE FROM fixed_menu_course_surcharges WHERE course_id IN (${placeholders})`).run(...oldIds);
    db.prepare(`DELETE FROM fixed_menu_course_products WHERE course_id IN (${placeholders})`).run(...oldIds);
    db.prepare('DELETE FROM fixed_menu_courses WHERE product_id = ?').run(productId);
  }

  const insertCourse = db.prepare(
    'INSERT INTO fixed_menu_courses (id, product_id, label, is_required, max_choices, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCategory = db.prepare('INSERT INTO fixed_menu_course_categories (course_id, category_id) VALUES (?, ?)');
  const insertSurcharge = db.prepare('INSERT OR REPLACE INTO fixed_menu_course_surcharges (course_id, product_id, surcharge) VALUES (?, ?, ?)');
  const insertException = db.prepare('INSERT OR REPLACE INTO fixed_menu_course_products (course_id, product_id, mode) VALUES (?, ?, ?)');

  for (const course of normalized) {
    const courseId = randomUUID();
    insertCourse.run(courseId, productId, course.label, course.is_required, course.max_choices, course.sort_order, timestamp, timestamp);
    for (const categoryId of course.categoryIds) insertCategory.run(courseId, categoryId);
    for (const entry of course.surcharges) insertSurcharge.run(courseId, entry.product_id, entry.surcharge);
    for (const productId of course.included) insertException.run(courseId, productId, 'include');
    for (const productId of course.excluded) insertException.run(courseId, productId, 'exclude');
  }

  return readFixedMenuCourses(db, productId);
}

// ── Ordering ─────────────────────────────────────────────────────────────

/**
 * Turns the items a client sent into the rows that go on the check, expanding
 * every fixed menu into a package row plus one row per dish chosen.
 *
 * Everything is validated here and every price is read from the database:
 * the client says which dish, never what it costs (invariant 5, backend
 * authority). Ordinary items pass through rebuilt field by field, so a
 * hand-rolled request cannot set the menu columns on a plain dish.
 */
export function expandFixedMenuItems(db: Db, items: any[]): ExpandedOrderItem[] {
  const expanded: ExpandedOrderItem[] = [];

  for (const item of items) {
    const productId = String(item?.product_id ?? '');
    const base = {
      product_id: productId,
      special_instructions: item?.special_instructions ?? null,
      variant_selection: item?.variant_selection ?? null,
      modifier_selection: item?.modifier_selection ?? null,
      addons: item?.addons,
    };

    if (!isFixedMenuProduct(db, productId)) {
      expanded.push({
        ...base,
        quantity: item?.quantity,
        menu_group_id: null,
        menu_role: null,
        menu_course_id: null,
        unit_price_override: null,
        service_run: item?.service_run,
      });
      continue;
    }

    const menu = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(productId) as any;
    if (!menu) throw invalid(`Product ${productId} not found`);
    if (!menu.is_active) throw invalid(`${menu.name} is not on the menu right now`);

    // How many guests take it. However many, it is one group: the package row
    // carries the count, and the courses hold that many times their dishes.
    const menus = Number(item?.quantity ?? 1);
    if (!Number.isSafeInteger(menus) || menus < 1 || menus > MAX_MENUS_PER_LINE) {
      throw invalid(`Invalid quantity for ${menu.name}`);
    }

    const groupId = randomUUID();
    for (const row of buildMenuRows(db, menu, item?.menu_selection, base, menus)) {
      expanded.push({ ...row, menu_group_id: groupId });
    }
  }

  return expanded;
}

/** The rows of one menu line, group id still to be stamped on by the caller. */
function buildMenuRows(
  db: Db,
  menu: any,
  selection: unknown,
  base: Omit<ExpandedOrderItem, 'quantity' | 'menu_group_id' | 'menu_role' | 'menu_course_id' | 'unit_price_override'>,
  menus: number,
): ExpandedOrderItem[] {
  const courses = readFixedMenuCourses(db, menu.id);
  if (courses.length === 0) throw invalid(`${menu.name} has no courses configured yet`);

  // A counted choice — three lasagne — becomes three portions, and each
  // portion a row below. The counts are added up and held to the course's
  // ceiling *before* anything is expanded: a request asking for a thousand
  // portions of a thousand dishes must be refused, not built in memory first.
  const counted = (Array.isArray(selection) ? selection : []).map((entry: any) => ({
    course_id: String(entry?.course_id ?? ''),
    product_id: String(entry?.product_id ?? ''),
    note: choiceNote(entry?.note),
    service_run: entry?.service_run,
    portions: choicePortions(entry?.quantity, menu.name),
  }));

  const courseIds = new Set(courses.map((course) => course.id));
  for (const choice of counted) {
    if (!courseIds.has(choice.course_id)) throw invalid(`${menu.name}: a choice refers to a course that is not on this menu`);
  }
  for (const course of courses) {
    // A required course left empty is allowed through on purpose (see below).
    // Too many is not: nine mains on eight menus is a mis-ring, and the ninth
    // is ordered from the card.
    const asked = counted
      .filter((choice) => choice.course_id === course.id)
      .reduce((total, choice) => total + choice.portions, 0);
    if (asked > courseLimit(course, menus)) throw invalid(courseLimitMessage(menu.name, course, menus));
  }

  const choices: FixedMenuChoiceInput[] = counted.flatMap(({ portions, ...choice }) => (
    Array.from({ length: portions }, () => choice)
  ));

  // The package carries the price, once per menu; the dishes carry the
  // surcharge or nothing, and each its own note — the package row is filtered
  // out of every kitchen ticket, so a note written against the menu itself
  // reached no cook.
  const rows: ExpandedOrderItem[] = [{
    ...base,
    special_instructions: null,
    product_id: menu.id,
    quantity: menus,
    menu_group_id: null,
    menu_role: 'package',
    menu_course_id: null,
    unit_price_override: null,
  }];

  for (const course of courses) {
    const picked = choices.filter((choice) => choice.course_id === course.id);
    // A required course left empty is allowed through on purpose. The table
    // orders the starters, the ticket goes, and the main is decided half an
    // hour later — refusing the menu until every course is filled meant the
    // floor could not take the order it was actually being given. What is
    // still missing is shown on the check and asked for again at the till;
    // it is never a reason to refuse the order.

    for (const choice of picked) {
      const dish = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(choice.product_id) as any;
      if (!dish) throw invalid(`${menu.name}: a dish chosen for ${course.label} no longer exists`);
      if (!dish.is_active) throw invalid(`${dish.name} is off the menu right now`);
      // Categories are the rule and the owner's two lists are the exceptions
      // to it. One helper answers it, shared with the till.
      if (!courseAllowsDish(course, dish)) {
        throw invalid(`${menu.name}: ${dish.name} is not a ${course.label}`);
      }

      const surcharge = course.surcharges.find((entry) => entry.product_id === dish.id)?.surcharge ?? 0;
      rows.push({
        product_id: dish.id,
        special_instructions: choice.note ?? null,
        variant_selection: null,
        modifier_selection: null,
        addons: undefined,
        quantity: 1,
        menu_group_id: null,
        menu_role: 'course',
        menu_course_id: course.id,
        unit_price_override: roundMoney(surcharge),
        service_run: choice.service_run,
      });
    }
  }

  return rows;
}

/**
 * How many guests have already paid for their cover inside a menu.
 *
 * Feeds `computeCoverCharge`, which subtracts it from the head count and floors
 * at zero, so three menus at a table of two cannot produce a negative cover.
 * Cancelled and voided rows do not count: a menu that was taken off the check
 * stops carrying anybody's cover.
 */
export function coveredGuestCount(db: Db, orderId: string | number): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity), 0) AS covered
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
      AND oi.menu_role = 'package'
      AND oi.status NOT IN ('cancelled', 'voided', 'void_adjustment')
      AND p.fixed_menu_includes_cover = 1
  `).get(orderId) as { covered: number } | undefined;
  return Number(row?.covered || 0);
}

/**
 * Every row of the menu one row belongs to, itself included — empty for an
 * ordinary row.
 */
export function menuGroupRowIds(db: Db, item: { id: number; order_id: number; menu_group_id?: string | null }): number[] {
  if (!item?.menu_group_id) return [];
  const rows = db.prepare(
    'SELECT id FROM order_items WHERE order_id = ? AND menu_group_id = ?'
  ).all(item.order_id, item.menu_group_id) as { id: number }[];
  return rows.map((row) => Number(row.id));
}

/**
 * What a cancel takes with it.
 *
 * The package is the menu: taking it off the check takes its dishes with it,
 * because half a menu — the price with no food, or food nobody is paying for
 * — is not a thing anyone ordered. A single dish is only itself, so the guest
 * who changes their mind about the main changes their main, and does not lose
 * the starter they have already eaten.
 *
 * That split is the whole difference between a menu you have to redo and one
 * you can correct. On a line of eight menus the package row is all eight; one
 * guest fewer is a smaller count (`planMenuCount`), not a cancel.
 */
export function cancelTargetIds(
  db: Db,
  item: { id: number; order_id: number; menu_group_id?: string | null; menu_role?: string | null },
): number[] {
  if (item?.menu_role === 'package') return menuGroupRowIds(db, item);
  return [Number(item.id)];
}

/** A row of a menu group, as the fill planner reads it back. */
interface MenuGroupRow {
  id: number;
  product_id: string;
  status: string;
  quantity: number;
  menu_role: string | null;
  menu_course_id: string | null;
  special_instructions: string | null;
  service_run: number | null;
}

/**
 * Every row of one menu line, with its live package row and the menu it is.
 * Shared by the two planners, which refuse a missing or retired menu alike.
 */
function readMenuLine(db: Db, orderId: string | number, menuGroupId: string): { rows: MenuGroupRow[]; pkg: MenuGroupRow; menu: any } {
  const rows = db.prepare(`
    SELECT id, product_id, status, quantity, menu_role, menu_course_id, special_instructions, service_run
    FROM order_items WHERE order_id = ? AND menu_group_id = ? ORDER BY id
  `).all(orderId, menuGroupId) as MenuGroupRow[];

  const pkg = rows.find((row) => row.menu_role === 'package' && !TERMINAL_STATUSES.includes(row.status));
  if (!pkg) throw Object.assign(new Error('Menu not found on this order'), { statusCode: 404 });

  const menu = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(pkg.product_id) as any;
  if (!menu || Number(menu.is_fixed_menu || 0) !== 1) {
    throw Object.assign(new Error('That product is no longer a fixed menu'), { statusCode: 409 });
  }
  return { rows, pkg, menu };
}

/** How many menus a line feeds, read off its package row. */
function menusOnLine(pkg: MenuGroupRow): number {
  return Math.max(1, Number(pkg.quantity) || 1);
}

/** The live dish rows a course of a menu line holds. */
function heldByCourse(rows: MenuGroupRow[], courseId: string): MenuGroupRow[] {
  return rows.filter((row) => (
    row.menu_role === 'course'
    && row.menu_course_id === courseId
    && !TERMINAL_STATUSES.includes(row.status)
  ));
}

export interface MenuCoursePlan {
  /** Rows to write, priced here and never by the client. */
  insert: ExpandedOrderItem[];
  /** Rows this replaces. Every one of them is still `pending`. */
  cancel: number[];
  /** Set when a row this would have replaced is already being cooked. */
  blocked: { item_id: number; status: string } | null;
}

/**
 * "This course now holds exactly these dishes."
 *
 * One shape covers adding a choice, swapping one, and clearing a course, and
 * that is deliberate: three endpoints would be three places to get the void
 * policy right. Replaying the same set is a no-op, so a retry after a lost
 * response cannot double a dish.
 *
 * A row that would have to go but is already `preparing` or beyond is not
 * quietly overridden — the whole plan is refused and handed back as `blocked`.
 * The kitchen has that dish; taking it off the check is the cancel endpoint's
 * business, with the manager PIN and the void adjustment it already owns.
 *
 * The course holds as many dishes as the line has menus, times its choices:
 * the list is a count, three lasagne being the same dish three times over or
 * one entry with `quantity: 3`.
 */
export function planCourseFill(
  db: Db,
  orderId: string | number,
  menuGroupId: string,
  courseId: string,
  productIds: unknown,
): MenuCoursePlan {
  const { rows, pkg, menu } = readMenuLine(db, orderId, menuGroupId);

  const course = readFixedMenuCourses(db, menu.id).find((entry) => entry.id === courseId);
  if (!course) {
    throw Object.assign(new Error(`${menu.name}: that course is no longer on this menu`), {
      statusCode: 409, code: 'course_no_longer_exists',
    });
  }

  // Either bare ids or the full shape — the window sends a note, a run and a
  // count with each dish, the same as it does when the menu is first composed.
  // A bare id says only which dish: it keeps whatever note and run the row
  // already has. That is what a dish dropped in from the grid sends for the
  // ones already there, and it must not strip "senza besciamella" off them.
  if (!Array.isArray(productIds)) throw invalid('product_ids must be a list of dishes');
  const counted = productIds.map((entry: any) => (
    !entry || typeof entry !== 'object'
      ? { product_id: String(entry ?? ''), note: null as string | null, service_run: undefined as unknown, anyNote: true, portions: 1 }
      : {
        product_id: String(entry.product_id ?? ''),
        note: choiceNote(entry.note),
        service_run: entry.service_run as unknown,
        anyNote: false,
        portions: choicePortions(entry.quantity, menu.name),
      }
  ));
  if (counted.some((dish) => !dish.product_id)) throw invalid('product_ids must be a list of dishes');
  // The counts are added up and held to the ceiling before anything is
  // expanded, so an absurd request is refused rather than built in memory.
  const menus = menusOnLine(pkg);
  const asked = counted.reduce((total, dish) => total + dish.portions, 0);
  if (asked > courseLimit(course, menus)) {
    throw invalid(courseLimitMessage(menu.name, course, menus));
  }
  const wanted = counted.flatMap(({ portions, ...dish }) => Array.from({ length: portions }, () => dish));

  // What the course holds now. A row from before v95 carries no course, so it
  // is left alone rather than being claimed by the first course to ask.
  const held = heldByCourse(rows, courseId);

  // Match one for one by dish, so asking for what is already there changes
  // nothing and only the difference moves. The kitchen's rows are matched
  // first: taking one lasagna off three releases one still waiting, rather
  // than stopping on the one already in the pan and refusing the lot.
  // And the precise wishes before the loose ones: "a lasagna, out with the
  // starters" gets the row that is out with the starters, before a plain
  // "a lasagna", which would have taken any, can take it from under it.
  const precision = (dish: { anyNote: boolean; service_run: unknown }) => (
    (dish.anyNote ? 0 : 1) + (dish.service_run === undefined ? 0 : 1)
  );
  const insert: ExpandedOrderItem[] = [];
  const spare = [...held].sort((left, right) => Number(left.status === 'pending') - Number(right.status === 'pending'));
  for (const wantedDish of [...wanted].sort((left, right) => precision(right) - precision(left))) {
    const { product_id: productId } = wantedDish;
    // Matched on the note and the run as well as the dish, so correcting
    // "no garlic" on a pending row rewrites it — and a row the kitchen has
    // already taken is caught below rather than quietly edited underneath
    // the cook.
    const already = spare.findIndex((row) => (
      row.product_id === productId
      && (wantedDish.anyNote || (row.special_instructions || null) === (wantedDish.note || null))
      && (wantedDish.service_run === undefined || Number(row.service_run) === Number(wantedDish.service_run))
    ));
    if (already >= 0) {
      spare.splice(already, 1);
      continue;
    }

    const dish = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(productId) as any;
    if (!dish) throw invalid(`${menu.name}: a dish chosen for ${course.label} no longer exists`);
    if (!dish.is_active) throw invalid(`${dish.name} is off the menu right now`);
    if (Number(dish.is_fixed_menu || 0) === 1) throw invalid(`${menu.name}: a menu cannot be a course of another menu`);
    if (!courseAllowsDish(course, dish)) throw invalid(`${menu.name}: ${dish.name} is not a ${course.label}`);

    insert.push({
      product_id: dish.id,
      special_instructions: wantedDish.note ?? null,
      variant_selection: null,
      modifier_selection: null,
      addons: undefined,
      quantity: 1,
      menu_group_id: menuGroupId,
      menu_role: 'course',
      menu_course_id: course.id,
      unit_price_override: roundMoney(course.surcharges.find((entry) => entry.product_id === dish.id)?.surcharge ?? 0),
      service_run: wantedDish.service_run,
    });
  }

  const cooking = spare.find((row) => row.status !== 'pending');
  if (cooking) {
    return { insert: [], cancel: [], blocked: { item_id: cooking.id, status: cooking.status } };
  }

  return { insert, cancel: spare.map((row) => row.id), blocked: null };
}

export interface MenuCountPlan {
  /** The menu line's own row, as it stands before the change. */
  packageItemId: number;
  /** How many menus it fed until now. */
  from: number;
  /** How many it feeds from now on. */
  to: number;
}

/**
 * "This menu line now feeds this many."
 *
 * The count the table gave at the start is not always the last word: a friend
 * arrives and takes the menu too, or one of the eight decides to order from
 * the card. Raising it only makes room. Lowering it is refused while a course
 * still holds more dishes than the smaller count takes — which dish goes is
 * for the floor to say from that course, not for this to guess.
 */
export function planMenuCount(
  db: Db,
  orderId: string | number,
  menuGroupId: string,
  quantity: unknown,
): MenuCountPlan {
  const to = Number(quantity);
  if (!Number.isSafeInteger(to) || to < 1 || to > MAX_MENUS_PER_LINE) {
    throw invalid(`The number of menus must be a whole number between 1 and ${MAX_MENUS_PER_LINE}`);
  }

  const { rows, pkg, menu } = readMenuLine(db, orderId, menuGroupId);
  for (const course of readFixedMenuCourses(db, menu.id)) {
    const held = heldByCourse(rows, course.id).length;
    if (held > courseLimit(course, to)) {
      throw Object.assign(new Error(`${menu.name}: ${course.label} already holds ${held} dishes, more than ${to} ${to === 1 ? 'menu takes' : 'menus take'}`), {
        statusCode: 409, code: 'menu_course_overflow', course_id: course.id,
      });
    }
  }

  return { packageItemId: Number(pkg.id), from: menusOnLine(pkg), to };
}
