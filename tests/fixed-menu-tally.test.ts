/**
 * The fixed menu, counted, on the interface side.
 *
 * The floor takes a set menu the way it always wrote it on paper: how many
 * menus, then how many of each dish — three lasagne, two carbonara — without
 * saying which guest had which. These are the helpers the window, the cart and
 * the table screens share to do that sum the way the backend does it.
 *
 * Checks:
 *  - a choice without a count is one portion, and a course holds as many
 *    dishes as the line has menus, times its choices;
 *  - surcharges count per dish, the menu price per menu, and the cart adds a
 *    menu line up that way;
 *  - an expected course is missing while it has fewer dishes than menus;
 *  - a course read back off the check, a row per portion, folds into counts;
 *  - the grid's "inside the menu?" offers a course only while it has room, and
 *    names a line by its count;
 *  - the check folds identical portions into one line for the screen, and an
 *    action on it lands on one portion;
 *  - the cart keeps a menu line with its count, and a dish from the grid joins
 *    the plain count of that dish.
 *
 * Run: ts-node --transpile-only -P tests/tsconfig.json tests/fixed-menu-tally.test.ts
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options?: unknown) {
  const resolved = request.startsWith('@/') ? path.resolve(__dirname, '../frontend/src', request.slice(2)) : request;
  return originalResolveFilename.call(this, resolved, parent, isMain, options);
};

const {
  portionsOf, courseCount, courseCapacity, selectionSurcharge, cartLineTotal, selectionIsValid,
  missingRequiredCourses, tallySelection, menuGroupsOfOrder, menuLinesOfCart, menuLinesOfOrder,
  openSlotsForProduct, compactMenuRows,
} = require('../frontend/src/lib/fixed-menu');
const { useCartStore } = require('../frontend/src/store/cart');

const starters = { id: 'c-start', label: 'Antipasto', is_required: true, max_choices: 1, sort_order: 0, category_ids: ['cat-start'], surcharges: [], included_product_ids: [], excluded_product_ids: [] };
const mains = {
  id: 'c-main', label: 'Secondo', is_required: true, max_choices: 1, sort_order: 1, category_ids: ['cat-main'],
  surcharges: [{ product_id: 'p-steak', surcharge: 3 }], included_product_ids: [], excluded_product_ids: [],
};
const wine = { id: 'c-wine', label: 'Vino', is_required: false, max_choices: 1, sort_order: 2, category_ids: ['cat-wine'], surcharges: [], included_product_ids: [], excluded_product_ids: [] };
const menu = { id: 'p-menu', name: 'Menu completo', price: 25, is_active: true, is_fixed_menu: true, courses: [starters, mains, wine] };

const dish = (id: string, category: string, price = 10) => ({ id, name: id, price, category_id: category, is_active: true });
const lasagne = dish('p-lasagne', 'cat-main');
const steak = dish('p-steak', 'cat-main', 18);
const bruschetta = dish('p-bruschetta', 'cat-start', 6);

function row(id: number, extra: Record<string, unknown>) {
  return {
    id, order_id: 1, product_id: 'p-lasagne', product_name: 'Lasagne', product_sku: null, unit_price: 0, quantity: 1,
    subtotal: 0, total: 0, addons: null, special_instructions: null, status: 'pending', service_run: 2,
    kot_batch: 1, menu_group_id: 'g1', menu_role: 'course', menu_course_id: 'c-main', ...extra,
  };
}

function main() {
  console.log('The fixed menu, counted');
  console.log('='.repeat(60));

  // ── Counting ───────────────────────────────────────────────────────────
  assert.equal(portionsOf({}), 1, 'a choice without a count is one portion');
  assert.equal(portionsOf({ quantity: 3 }), 3, 'a counted choice is that many');
  assert.equal(portionsOf({ quantity: 0 }), 0, 'and one counted down to nothing is none');

  const selection = [
    { course_id: 'c-start', product_id: 'p-bruschetta', quantity: 3 },
    { course_id: 'c-main', product_id: 'p-lasagne', quantity: 2 },
    { course_id: 'c-main', product_id: 'p-steak' },
  ];
  assert.equal(courseCount(selection, 'c-main'), 3, 'a course counts every portion in it');
  assert.equal(courseCapacity(mains, 3), 3, 'a course of one choice holds as many dishes as there are menus');
  assert.equal(courseCapacity({ max_choices: 2 }, 3), 6, 'two choices each on three menus is six');

  // ── Money ──────────────────────────────────────────────────────────────
  const twoSteaks = [{ course_id: 'c-main', product_id: 'p-steak', quantity: 2 }];
  assert.equal(selectionSurcharge(menu, twoSteaks), 6, 'a surcharge counts per steak');
  assert.equal(
    cartLineTotal({ id: 'm', product: menu, quantity: 8, addons: [], special_instructions: '', menu_selection: twoSteaks }),
    25 * 8 + 6,
    'a menu line is its price per menu, and two steaks add two surcharges, not eight',
  );
  assert.equal(
    cartLineTotal({ id: 'd', product: lasagne, quantity: 2, addons: [{ id: 1, name: 'Extra', price: 1.5, quantity: 1 }], special_instructions: '' }),
    23,
    'any other line is its price, add-ons in, times its quantity',
  );

  // ── What a line accepts, and what it still expects ─────────────────────
  assert.equal(selectionIsValid(menu, selection, 3), true, 'three starters and three mains fit three menus');
  assert.equal(selectionIsValid(menu, selection, 2), false, 'and do not fit two');
  assert.deepEqual(
    missingRequiredCourses(menu, [{ course_id: 'c-start', product_id: 'p-bruschetta', quantity: 3 }], 3).map((course: any) => course.id),
    ['c-main'],
    'the mains are expected until each of three menus has one; the wine is not expected at all',
  );
  assert.deepEqual(
    missingRequiredCourses(menu, selection, 4).map((course: any) => course.id),
    ['c-start', 'c-main'],
    'a fourth menu leaves both courses a dish short',
  );

  // ── Reading a course back off the check ────────────────────────────────
  const readBack = tallySelection([
    { course_id: 'c-main', product_id: 'p-lasagne', service_run: 2 },
    { course_id: 'c-main', product_id: 'p-lasagne', service_run: 2 },
    { course_id: 'c-main', product_id: 'p-lasagne', service_run: 2, note: 'senza besciamella' },
    { course_id: 'c-main', product_id: 'p-lasagne', service_run: 1 },
    { course_id: 'c-main', product_id: 'p-steak', quantity: 0 },
  ]);
  assert.equal(readBack.length, 3, 'a row per portion folds into one entry per dish, note and run');
  assert.equal(readBack[0].quantity, 2, 'the two plain lasagne are one entry of two');
  assert.equal(readBack[1].note, 'senza besciamella', 'the one with a note stays its own');
  assert.equal(readBack[2].service_run, 1, 'and so does the one going out with the starters');

  // ── The grid's question ────────────────────────────────────────────────
  const cartLine = { id: 'cart-menu:1', product: menu, quantity: 2, addons: [], special_instructions: '', menu_selection: [{ course_id: 'c-main', product_id: 'p-lasagne' }] };
  const cartLines = menuLinesOfCart([cartLine]);
  assert.equal(cartLines[0].menus, 2, 'a menu line in the cart says how many menus');
  const slots = openSlotsForProduct(steak, cartLines);
  assert.equal(slots.length, 1, 'a steak fits the mains, which still have room for one');
  assert.equal(slots[0].free, 1, 'one more, on two menus with a lasagne already in');
  assert.equal(slots[0].menuLabel, 'Menu completo ×2', 'the line is named by how many it feeds');
  const fullLine = menuLinesOfCart([{ ...cartLine, menu_selection: [{ course_id: 'c-main', product_id: 'p-lasagne', quantity: 2 }] }]);
  assert.equal(openSlotsForProduct(steak, fullLine).length, 0, 'a full course is not offered: that question has one answer');
  const twoLines = openSlotsForProduct(bruschetta, menuLinesOfCart([cartLine, { ...cartLine, id: 'cart-menu:2', quantity: 1 }]));
  assert.deepEqual(
    twoLines.map((slot: any) => slot.menuLabel),
    ['Menu completo ×2 (1)', 'Menu completo ×1 (2)'],
    'two lines of the same menu are told apart',
  );

  // ── A line already on the check ────────────────────────────────────────
  const checkRows = [
    row(10, { product_id: 'p-menu', product_name: 'Menu completo', unit_price: 25, quantity: 3, total: 75, menu_role: 'package', menu_course_id: null }),
    row(11, {}),
    row(12, {}),
    row(13, { status: 'cancelled' }),
  ];
  const [group] = menuGroupsOfOrder(checkRows, [menu]);
  assert.equal(group.menus, 3, 'the line feeds what its package row says');
  const mainSlot = group.slots.find((slot: any) => slot.course.id === 'c-main');
  assert.equal(mainSlot.filled.length, 2, 'the cancelled lasagna frees its place');
  assert.equal(mainSlot.free, 1, 'so one main is still to come');
  assert.deepEqual(group.missingRequired.map((course: any) => course.id), ['c-start', 'c-main'], 'and both courses are short of three');
  assert.equal(menuLinesOfOrder([group])[0].chosen.length, 2, 'the grid sees the two lasagne in it');

  // ── The check, as the screen draws it ──────────────────────────────────
  const lines = compactMenuRows([
    checkRows[0],
    row(11, {}),
    row(12, {}),
    row(14, { special_instructions: 'senza besciamella' }),
    row(15, { service_run: 1 }),
    row(16, { status: 'preparing' }),
    row(17, { kot_batch: null }),
    row(18, { product_id: 'p-steak', product_name: 'Tagliata', unit_price: 3, total: 3 }),
    row(19, { product_id: 'p-steak', product_name: 'Tagliata', unit_price: 3, total: 3 }),
    { ...row(20, {}), menu_group_id: null, menu_role: null, menu_course_id: null, unit_price: 10, total: 10 },
    { ...row(21, {}), menu_group_id: null, menu_role: null, menu_course_id: null, unit_price: 10, total: 10 },
  ]);
  assert.equal(lines.length, 9, 'identical portions of the menu fold; nothing else does');
  assert.equal(lines[1].quantity, 2, 'the two plain lasagne are one line of two');
  assert.equal(lines[1].item.id, 12, 'and a tap on it acts on the newer of the two');
  assert.deepEqual(lines[1].rows.map((entry: any) => entry.id), [11, 12], 'while the line keeps every row it folds');
  assert.equal(lines[6].quantity, 2, 'two steaks fold too');
  assert.equal(lines[6].total, 6, 'with their surcharges summed');
  assert.equal(lines[7].quantity + lines[8].quantity, 2, 'two lasagne ordered from the card stay two lines, as they were');

  // ── The cart ───────────────────────────────────────────────────────────
  const cart = useCartStore.getState();
  cart.clearCart();
  cart.addFixedMenu(menu, 3, [{ course_id: 'c-start', product_id: 'p-bruschetta', quantity: 3 }]);
  const [line] = useCartStore.getState().items;
  assert.equal(line.quantity, 3, 'a menu line carries how many menus it feeds');
  assert.equal(useCartStore.getState().subtotal(), 75, 'and costs that many menus');

  useCartStore.getState().attachToMenu(line.id, 'c-main', 'p-steak');
  useCartStore.getState().attachToMenu(line.id, 'c-main', 'p-steak');
  const afterGrid = useCartStore.getState().items[0].menu_selection;
  assert.equal(afterGrid.length, 2, 'two steaks from the grid are one entry');
  assert.equal(afterGrid[1].quantity, 2, 'counted two');
  assert.equal(useCartStore.getState().subtotal(), 75 + 6, 'and they add their two surcharges');

  useCartStore.getState().updateMenuSelection(line.id, 4, afterGrid);
  assert.equal(useCartStore.getState().items[0].quantity, 4, 'the window changes how many menus');
  assert.equal(useCartStore.getState().subtotal(), 100 + 6, 'and the line follows');

  cart.addFixedMenu(menu, 1, []);
  assert.equal(useCartStore.getState().items.length, 2, 'a second line of the same menu is never merged into the first');
  useCartStore.getState().clearCart();

  console.log('All checks passed');
}

main();
