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
 * One menu is one group of quantity 1. Six identical menus are six groups, and
 * that is deliberate: a split check moves a group whole, and a block of six
 * cannot be shared between six guests.
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
}

/** One dish the guest picked, as the client sends it. */
export interface FixedMenuChoiceInput {
  course_id: string;
  product_id: string;
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
  /** Set only on course rows: the surcharge, or zero. Package rows use the product price. */
  unit_price_override: number | null;
}

const MAX_COURSES_PER_MENU = 20;
const MAX_CHOICES_PER_COURSE = 10;
const MAX_MENUS_PER_LINE = 20;

function invalid(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
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

    const categoryIds = Array.isArray(raw?.category_ids) ? [...new Set(raw.category_ids.map(String))] : [];
    if (categoryIds.length === 0) throw invalid(`${label}: pick at least one category to draw from`);
    for (const categoryId of categoryIds) {
      if (!db.prepare('SELECT 1 FROM categories WHERE id = ? AND deleted_at IS NULL').get(categoryId)) {
        throw invalid(`${label}: one of the categories no longer exists`);
      }
    }

    const surcharges = (Array.isArray(raw?.surcharges) ? raw.surcharges : []).map((entry: any) => {
      const surchargeProductId = String(entry?.product_id ?? '');
      const amount = Number(entry?.surcharge);
      if (!surchargeProductId) throw invalid(`${label}: a surcharge is missing its dish`);
      if (!Number.isFinite(amount) || amount < 0) throw invalid(`${label}: a surcharge must be zero or more`);
      if (!db.prepare('SELECT 1 FROM products WHERE id = ? AND deleted_at IS NULL').get(surchargeProductId)) {
        throw invalid(`${label}: a dish with a surcharge no longer exists`);
      }
      return { product_id: surchargeProductId, surcharge: roundMoney(amount) };
    });

    return {
      label,
      is_required: raw?.is_required === false ? 0 : 1,
      max_choices: maxChoices,
      sort_order: Number.isSafeInteger(Number(raw?.sort_order)) ? Number(raw.sort_order) : index,
      categoryIds,
      surcharges,
    };
  });

  const timestamp = now();
  const oldIds = (db.prepare('SELECT id FROM fixed_menu_courses WHERE product_id = ?').all(productId) as { id: string }[]).map((row) => row.id);
  if (oldIds.length > 0) {
    const placeholders = oldIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM fixed_menu_course_categories WHERE course_id IN (${placeholders})`).run(...oldIds);
    db.prepare(`DELETE FROM fixed_menu_course_surcharges WHERE course_id IN (${placeholders})`).run(...oldIds);
    db.prepare('DELETE FROM fixed_menu_courses WHERE product_id = ?').run(productId);
  }

  const insertCourse = db.prepare(
    'INSERT INTO fixed_menu_courses (id, product_id, label, is_required, max_choices, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCategory = db.prepare('INSERT INTO fixed_menu_course_categories (course_id, category_id) VALUES (?, ?)');
  const insertSurcharge = db.prepare('INSERT OR REPLACE INTO fixed_menu_course_surcharges (course_id, product_id, surcharge) VALUES (?, ?, ?)');

  for (const course of normalized) {
    const courseId = randomUUID();
    insertCourse.run(courseId, productId, course.label, course.is_required, course.max_choices, course.sort_order, timestamp, timestamp);
    for (const categoryId of course.categoryIds) insertCategory.run(courseId, categoryId);
    for (const entry of course.surcharges) insertSurcharge.run(courseId, entry.product_id, entry.surcharge);
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
        unit_price_override: null,
      });
      continue;
    }

    const menu = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(productId) as any;
    if (!menu) throw invalid(`Product ${productId} not found`);
    if (!menu.is_active) throw invalid(`${menu.name} is not on the menu right now`);

    // A menu is ordered one at a time. Asking for three of them is three
    // separate menus with the same choices — what the "one more like it"
    // button does at the till — never one row of three, which a split check
    // could not hand to three guests.
    const howMany = Number(item?.quantity ?? 1);
    if (!Number.isSafeInteger(howMany) || howMany < 1 || howMany > MAX_MENUS_PER_LINE) {
      throw invalid(`Invalid quantity for ${menu.name}`);
    }

    const rows = buildMenuRows(db, menu, item?.menu_selection, base);
    for (let copy = 0; copy < howMany; copy++) {
      const groupId = randomUUID();
      for (const row of rows) expanded.push({ ...row, menu_group_id: groupId });
    }
  }

  return expanded;
}

/** The rows of one menu, group id still to be stamped on by the caller. */
function buildMenuRows(
  db: Db,
  menu: any,
  selection: unknown,
  base: Omit<ExpandedOrderItem, 'quantity' | 'menu_group_id' | 'menu_role' | 'unit_price_override'>,
): ExpandedOrderItem[] {
  const courses = readFixedMenuCourses(db, menu.id);
  if (courses.length === 0) throw invalid(`${menu.name} has no courses configured yet`);

  const choices: FixedMenuChoiceInput[] = Array.isArray(selection)
    ? selection.map((entry: any) => ({ course_id: String(entry?.course_id ?? ''), product_id: String(entry?.product_id ?? '') }))
    : [];

  const courseIds = new Set(courses.map((course) => course.id));
  for (const choice of choices) {
    if (!courseIds.has(choice.course_id)) throw invalid(`${menu.name}: a choice refers to a course that is not on this menu`);
  }

  // The package carries the price; the dishes carry the surcharge or nothing.
  const rows: ExpandedOrderItem[] = [{
    ...base,
    product_id: menu.id,
    quantity: 1,
    menu_group_id: null,
    menu_role: 'package',
    unit_price_override: null,
  }];

  for (const course of courses) {
    const picked = choices.filter((choice) => choice.course_id === course.id);
    if (course.is_required && picked.length === 0) throw invalid(`${menu.name}: choose a ${course.label}`);
    if (picked.length > course.max_choices) {
      throw invalid(`${menu.name}: ${course.label} allows at most ${course.max_choices} ${course.max_choices === 1 ? 'choice' : 'choices'}`);
    }

    for (const choice of picked) {
      const dish = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(choice.product_id) as any;
      if (!dish) throw invalid(`${menu.name}: a dish chosen for ${course.label} no longer exists`);
      if (!dish.is_active) throw invalid(`${dish.name} is off the menu right now`);
      // Courses draw from categories, so this is what makes a choice legal —
      // not a list of dishes the owner has to maintain by hand.
      if (!dish.category_id || !course.category_ids.includes(String(dish.category_id))) {
        throw invalid(`${menu.name}: ${dish.name} is not a ${course.label}`);
      }

      const surcharge = course.surcharges.find((entry) => entry.product_id === dish.id)?.surcharge ?? 0;
      rows.push({
        product_id: dish.id,
        special_instructions: null,
        variant_selection: null,
        modifier_selection: null,
        addons: undefined,
        quantity: 1,
        menu_group_id: null,
        menu_role: 'course',
        unit_price_override: roundMoney(surcharge),
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
 * ordinary row. A menu is cancelled whole, from whichever row the floor
 * happens to press: half a menu is not a thing anybody ordered.
 */
export function menuGroupRowIds(db: Db, item: { id: number; order_id: number; menu_group_id?: string | null }): number[] {
  if (!item?.menu_group_id) return [];
  const rows = db.prepare(
    'SELECT id FROM order_items WHERE order_id = ? AND menu_group_id = ?'
  ).all(item.order_id, item.menu_group_id) as { id: number }[];
  return rows.map((row) => Number(row.id));
}
