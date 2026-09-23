/**
 * Integration Test: the fixed menu
 *
 * A set menu at one price — starter, pasta, main, fruit or dessert — that has
 * to reach the kitchen as dishes and the guest as one price. The rule the whole
 * design rests on is that ordering one writes **real rows**, one per dish
 * chosen, because the kitchen ticket sections dishes by product category and a
 * commercial package has no category to be sectioned by.
 *
 * Covers:
 *  - Composing a menu writes a package row plus a row per dish, one group.
 *  - The price sits on the package; the dishes carry nothing, or a surcharge.
 *  - The backend prices it: a client that sends its own numbers is ignored.
 *  - A menu can be taken with a required course still empty, and filled in
 *    later; a dish from the wrong course is still refused.
 *  - The note and the wave hang off the chosen dish, never off the menu: the
 *    package row reaches no kitchen ticket, so a note on it reached nobody.
 *  - Filling one in writes a row that goes out on the next round by itself,
 *    swapping a choice re-prices the check and the open preconto with it,
 *    and a dish the kitchen has already started is never overruled here.
 *  - A course draws from categories, and the owner's two exception lists
 *    override them dish by dish, in both directions.
 *  - An optional course (the house wine) is free to skip and changes no price.
 *  - Three menus are one line of three: one package row that says three, and
 *    under it the dishes counted, a row per portion; a course holds that many
 *    dishes and not one more.
 *  - A line already sent is counted into course by course, gives back a dish
 *    still waiting before one in the pan, and changes how many it feeds —
 *    never below what its courses already hold.
 *  - A menu that includes the cover takes its guest off the cover charge, and
 *    never below zero however many menus a small table orders.
 *  - Adding or cancelling a menu re-prices the cover on an open order.
 *  - Cancelling the menu's own row takes the whole menu off the check;
 *    cancelling one of its dishes takes only that dish.
 *  - The kitchen ticket skips the package row and sections the dishes.
 *  - The printed bill indents the dishes, prices only surcharges, and never
 *    calls a menu course "on the house".
 *
 * Usage: node tests/run-electron-node-test.cjs tests/fixed-menu.test.ts
 */

// ── Electron Mock (must be before any app imports) ───────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-fixed-menu-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-fixed-menu';

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedServerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
} = require('./helpers/test-setup');

const { registerRoutes } = require('../main/routes');
const { orderRoutes } = require('../main/routes/orders');
const { billRoutes } = require('../main/routes/bills');
const { settingsRoutes } = require('../main/routes/settings');
const { fixedMenuRoutes } = require('../main/routes/fixed-menus');
const { productRoutes } = require('../main/routes/products');
const { routeItemsToStations, getPendingKotItems } = require('../main/routes/printers');
const { formatKOT, formatReceipt, escPosToText } = require('../main/printers/thermal');

const MENU_PRICE = 25;
const STEAK_SURCHARGE = 3;

async function main() {
  console.log('Integration Test: fixed menu');
  console.log('='.repeat(60));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);

  seedCategory(db, 'cat-starters', 'Antipasti');
  seedCategory(db, 'cat-mains', 'Secondi');
  seedCategory(db, 'cat-wine', 'Vini');
  seedCategory(db, 'cat-menus', 'Menu');
  seedCategory(db, 'cat-fish', 'Pesce');

  seedProduct(db, 'p-bruschetta', 'cat-starters', 'Bruschetta', 6);
  seedProduct(db, 'p-olives', 'cat-starters', 'Olive', 4);
  seedProduct(db, 'p-steak', 'cat-mains', 'Tagliata', 18);
  seedProduct(db, 'p-soup', 'cat-mains', 'Zuppa', 9);
  seedProduct(db, 'p-house-wine', 'cat-wine', 'Vino della casa', 8);
  seedProduct(db, 'p-menu', 'cat-menus', 'Menu completo', MENU_PRICE);
  seedProduct(db, 'p-coffee', 'cat-starters', 'Caffe', 1.5);
  // The two the per-dish exceptions are for: the lobster that sits in Mains
  // and is not in the menu, and the fish main that sits outside Mains and is.
  seedProduct(db, 'p-lobster', 'cat-mains', 'Aragosta', 40);
  seedProduct(db, 'p-branzino', 'cat-fish', 'Branzino', 22);

  db.prepare('UPDATE products SET is_fixed_menu = 1, fixed_menu_includes_cover = 1 WHERE id = ?').run('p-menu');

  const app = createApp({
    '/api/orders': orderRoutes,
    '/api/bills': billRoutes,
    '/api/settings': settingsRoutes,
    '/api/fixed-menus': fixedMenuRoutes,
    '/api/products': productRoutes,
  });
  // The item cancel/restore endpoints are registered inline on the app rather
  // than on a router, so the whole route table has to be mounted to reach them.
  registerRoutes(app);
  const { baseUrl, server } = await startServer(app);

  const readOrder = async (orderId: number) =>
    (await api(baseUrl, `/api/orders/${orderId}`, { headers: authHeader })).data.order;
  const rowsOf = (orderId: number) =>
    db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId) as any[];

  try {
    // ── Configuration ─────────────────────────────────────────────────────
    console.log('\n1. Building the menu out of courses');
    const saved = await api(baseUrl, '/api/fixed-menus/p-menu', {
      method: 'PUT',
      headers: authHeader,
      body: {
        courses: [
          { label: 'Antipasto', is_required: true, max_choices: 1, category_ids: ['cat-starters'] },
          {
            label: 'Secondo', is_required: true, max_choices: 1, category_ids: ['cat-mains'],
            surcharges: [{ product_id: 'p-steak', surcharge: STEAK_SURCHARGE }],
          },
          { label: 'Vino', is_required: false, max_choices: 1, category_ids: ['cat-wine'] },
        ],
      },
    });
    assertEqual(saved.status, 200, 'the menu configuration saves');
    assertEqual(saved.data.courses.length, 3, 'three courses come back');
    assertEqual(saved.data.courses[1].surcharges[0].surcharge, STEAK_SURCHARGE, 'the steak carries its surcharge');

    const listed = await api(baseUrl, '/api/products?active=true', { headers: authHeader });
    const menuInList = listed.data.products.find((product: any) => product.id === 'p-menu');
    assert(menuInList?.is_fixed_menu === true, 'the till sees the product as a fixed menu');
    assertEqual(menuInList?.courses?.length, 3, 'and its courses ride along with it');

    // ── Composing one ─────────────────────────────────────────────────────
    console.log('\n2. One menu becomes a package and its dishes');
    const first = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-bruschetta' },
            { course_id: saved.data.courses[1].id, product_id: 'p-soup' },
          ],
        }],
      },
    });
    assertEqual(first.status, 201, 'the order is taken');

    const firstRows = rowsOf(first.data.order.id);
    assertEqual(firstRows.length, 3, 'one package row and two dishes');
    const pkg = firstRows.find((row) => row.menu_role === 'package');
    const courses = firstRows.filter((row) => row.menu_role === 'course');
    assert(Boolean(pkg), 'the package row is marked as one');
    assertEqual(courses.length, 2, 'both chosen dishes are real rows');
    assertEqual(Number(pkg.total), MENU_PRICE, 'the price is on the package');
    assertEqual(courses.every((row: any) => Number(row.total) === 0), true, 'the dishes carry nothing');
    assertEqual(new Set(firstRows.map((row) => row.menu_group_id)).size, 1, 'all three share one group');
    assert(Boolean(pkg.menu_group_id), 'and the group is a real id');
    assertEqual(Number(first.data.order.subtotal), MENU_PRICE, 'the order adds up to the menu price');
    assertEqual(
      courses.map((row: any) => row.product_name).sort().join(','),
      'Bruschetta,Zuppa',
      'the rows name the dishes, not the package',
    );

    // ── Surcharges ────────────────────────────────────────────────────────
    console.log('\n3. A dish with a surcharge puts it on its own row');
    const withSteak = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-olives' },
            { course_id: saved.data.courses[1].id, product_id: 'p-steak' },
          ],
        }],
      },
    });
    assertEqual(withSteak.status, 201, 'the order is taken');
    const steakRow = rowsOf(withSteak.data.order.id).find((row) => row.product_id === 'p-steak');
    assertEqual(Number(steakRow.total), STEAK_SURCHARGE, 'the steak row is the surcharge alone');
    assertEqual(Number(withSteak.data.order.total), MENU_PRICE + STEAK_SURCHARGE, 'and the total adds up');

    // ── Backend authority ─────────────────────────────────────────────────
    console.log('\n4. The client does not get to price its own dinner');
    const forged = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 1, unit_price_override: 0, unit_price: 0,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-olives' },
            { course_id: saved.data.courses[1].id, product_id: 'p-steak' },
          ],
        }],
      },
    });
    assertEqual(Number(forged.data.order.total), MENU_PRICE + STEAK_SURCHARGE, 'a forged price is ignored');

    // ── What a menu takes, and what it refuses ────────────────────────────
    console.log('\n5. A menu can be taken before the table has decided');
    // The table orders the starters and thinks about the main over them. A
    // required course left empty is the order the floor is actually being
    // given, so it is taken — the gap is shown on the check and asked for
    // again at the till, never used to refuse the order.
    const missingCourse = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [{ course_id: saved.data.courses[0].id, product_id: 'p-olives' }],
        }],
      },
    });
    assertEqual(missingCourse.status, 201, 'a menu with a course still to choose is taken');
    const halfRows = rowsOf(missingCourse.data.order.id);
    assertEqual(halfRows.length, 2, 'it writes the package and the one dish chosen, and nothing for the empty course');
    assertEqual(
      Number(missingCourse.data.order.total), MENU_PRICE,
      'and it costs the price of the menu: the price is on the package, not on the dishes',
    );

    const wrongCourse = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-olives' },
            // A starter offered as the main: the course draws from Secondi.
            { course_id: saved.data.courses[1].id, product_id: 'p-coffee' },
          ],
        }],
      },
    });
    assertEqual(wrongCourse.status, 400, 'a dish from the wrong course is refused');

    console.log('\n6. The optional course is free to skip, and free');
    const withWine = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-olives' },
            { course_id: saved.data.courses[1].id, product_id: 'p-soup' },
            { course_id: saved.data.courses[2].id, product_id: 'p-house-wine' },
          ],
        }],
      },
    });
    assertEqual(withWine.status, 201, 'the wine can be ticked');
    assertEqual(Number(withWine.data.order.total), MENU_PRICE, 'and the price does not move');
    assertEqual(rowsOf(withWine.data.order.id).length, 4, 'the wine is a row of its own for the bar');

    // ── A line of menus ───────────────────────────────────────────────────
    console.log('\n7. Three menus are one line of three, with the dishes counted');
    // The floor counts dishes, not guests: three olives, two soups and a
    // steak, and nobody says which of the three had the steak.
    const three = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 3,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-olives', quantity: 3 },
            { course_id: saved.data.courses[1].id, product_id: 'p-soup', quantity: 2 },
            { course_id: saved.data.courses[1].id, product_id: 'p-steak' },
          ],
        }],
      },
    });
    assertEqual(three.status, 201, 'three menus are taken in one go');
    const threeRows = rowsOf(three.data.order.id);
    assertEqual(new Set(threeRows.map((row) => row.menu_group_id)).size, 1, 'one group, however many guests');
    const threePackages = threeRows.filter((row) => row.menu_role === 'package');
    assertEqual(threePackages.length, 1, 'one package row');
    assertEqual(threePackages[0].quantity, 3, 'that says three menus');
    assertEqual(Number(threePackages[0].total), MENU_PRICE * 3, 'and costs three');
    const threeDishes = threeRows.filter((row) => row.menu_role === 'course');
    assertEqual(threeDishes.length, 6, 'a row per portion: three starters and three mains');
    assertEqual(threeDishes.every((row: any) => row.quantity === 1), true, 'every portion is a single');
    assertEqual(threeDishes.filter((row: any) => row.product_id === 'p-soup').length, 2, 'two soups counted are two rows');
    assertEqual(
      Number(three.data.order.total), MENU_PRICE * 3 + STEAK_SURCHARGE,
      'the total is three menus and the one surcharge',
    );

    const overfull = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 2,
          menu_selection: [{ course_id: saved.data.courses[0].id, product_id: 'p-olives', quantity: 3 }],
        }],
      },
    });
    assertEqual(overfull.status, 400, 'three starters on two menus is a mis-ring, and refused');

    const notACount = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 2,
          menu_selection: [{ course_id: saved.data.courses[0].id, product_id: 'p-olives', quantity: 1.5 }],
        }],
      },
    });
    assertEqual(notACount.status, 400, 'and so is a count that is not a whole number');

    // ── The cover ─────────────────────────────────────────────────────────
    console.log('\n8. A menu that includes the cover takes its guest off it');
    await api(baseUrl, '/api/settings/cover_charge_amount', {
      method: 'PUT', body: { value: '2.00' }, headers: authHeader,
    });

    const menuFor = (courseZero: string, courseOne: string) => ({
      product_id: 'p-menu', quantity: 1,
      menu_selection: [
        { course_id: saved.data.courses[0].id, product_id: courseZero },
        { course_id: saved.data.courses[1].id, product_id: courseOne },
      ],
    });

    const mixedTable = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 4,
        items: [menuFor('p-olives', 'p-soup'), { product_id: 'p-steak', quantity: 3 }],
      },
    });
    assertEqual(Number(mixedTable.data.order.cover_charge), 6, 'four heads less the one on a menu, at 2,00');

    const smallTable = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 2,
        items: [menuFor('p-olives', 'p-soup'), menuFor('p-olives', 'p-soup'), menuFor('p-olives', 'p-soup')],
      },
    });
    assertEqual(Number(smallTable.data.order.cover_charge), 0, 'three menus at a table of two never go negative');
    assertEqual(Number(smallTable.data.order.total), MENU_PRICE * 3, 'and the total is the three menus');

    const lineOfThree = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 4,
        items: [{ product_id: 'p-menu', quantity: 3, menu_selection: [] }],
      },
    });
    assertEqual(Number(lineOfThree.data.order.cover_charge), 2, 'a line of three menus carries three of four covers');

    console.log('\n9. A menu added later re-prices the cover');
    const laterTable = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', guest_count: 2, items: [{ product_id: 'p-steak', quantity: 2 }] },
    });
    assertEqual(Number(laterTable.data.order.cover_charge), 4, 'two covers to start with');

    const appended = await api(baseUrl, `/api/orders/${laterTable.data.order.id}/items`, {
      method: 'POST', headers: authHeader, body: { items: [menuFor('p-olives', 'p-soup')] },
    });
    assertEqual(appended.status, 200, 'the menu is added to the open order');
    assertEqual(Number(appended.data.order.cover_charge), 2, 'and one cover goes with it');

    console.log('\n10. A dish comes off on its own; the menu comes off whole');
    const appendedRows = rowsOf(laterTable.data.order.id);
    const oneDish = appendedRows.find((row) => row.menu_role === 'course');
    const cancelled = await api(baseUrl, `/api/orders/${laterTable.data.order.id}/items/${oneDish.id}/cancel`, {
      method: 'PATCH', headers: authHeader, body: { reason: 'test' },
    });
    assertEqual(cancelled.status, 200, 'the row is cancelled');

    // The guest changing their mind about the main does not lose the starter
    // they have already eaten.
    const afterDish = rowsOf(laterTable.data.order.id).filter((row) => row.menu_group_id);
    assertEqual(afterDish.find((row) => row.id === oneDish.id).status, 'cancelled', 'the dish is off the check');
    assertEqual(
      afterDish.filter((row) => row.status !== 'cancelled').length, afterDish.length - 1,
      'and it took nothing else with it',
    );
    const stillCovered = await readOrder(laterTable.data.order.id);
    assertEqual(
      Number(stillCovered.cover_charge), 2,
      'the menu is still on the check, so it still carries its guest\'s cover',
    );

    // The package is the menu itself: pressing that row takes the lot.
    const pkgRow = appendedRows.find((row) => row.menu_role === 'package');
    const cancelledMenu = await api(baseUrl, `/api/orders/${laterTable.data.order.id}/items/${pkgRow.id}/cancel`, {
      method: 'PATCH', headers: authHeader, body: { reason: 'test' },
    });
    assertEqual(cancelledMenu.status, 200, 'the menu row is cancelled');

    const afterCancel = rowsOf(laterTable.data.order.id).filter((row) => row.menu_group_id);
    assertEqual(afterCancel.every((row: any) => row.status === 'cancelled'), true, 'every row of the menu went with it');
    const repriced = await readOrder(laterTable.data.order.id);
    assertEqual(Number(repriced.cover_charge), 4, 'and the table owes its cover again');

    // ── Printing ──────────────────────────────────────────────────────────
    console.log('\n11. The kitchen never sees the package');
    const kotOrder = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', guest_count: 1, items: [menuFor('p-bruschetta', 'p-steak')] },
    });
    const pending = getPendingKotItems(db, kotOrder.data.order.id);
    assertEqual(pending.length, 3, 'all three rows are claimed into the ticket batch');
    assert(
      pending.some((item: any) => item.menu_role === 'package'),
      'the package is claimed too, so it is not left pending forever',
    );

    const groups = routeItemsToStations(db, pending);
    const ticketItems = groups.flatMap((group: any) => group.items);
    assertEqual(ticketItems.length, 2, 'but only the dishes reach a station');
    assertEqual(
      ticketItems.every((item: any) => item.menu_role !== 'package'),
      true,
      'the package is not something anyone cooks',
    );

    const ticket = escPosToText(formatKOT(
      { order_number: 'T-1', type: 'dine_in', table: { name: '4' }, created_at: now() },
      ticketItems, 'Kitchen', 48, false, 'full', 'it-IT', undefined, [], false, 1, 'it',
    ));
    assert(!ticket.includes('MENU COMPLETO'), 'the ticket does not name the package');
    assert(ticket.toUpperCase().includes('BRUSCHETTA'), 'it names the starter');
    assert(ticket.toUpperCase().includes('TAGLIATA'), 'and the main');

    console.log('\n12. The bill shows the dishes under the price, and offers nothing');
    const billOrder = await readOrder(kotOrder.data.order.id);
    const billRows = db.prepare(`
      SELECT oi.*, COALESCE(p.price_required, 0) AS price_required
      FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? ORDER BY oi.id
    `).all(kotOrder.data.order.id) as any[];

    const receipt = escPosToText(formatReceipt(
      { ...billOrder, items: billRows },
      { bill_number: 'B-1', subtotal: MENU_PRICE + STEAK_SURCHARGE, total: MENU_PRICE + STEAK_SURCHARGE + 2, cover_charge: 2, discount_amount: 0 },
      { name: 'Trattoria', currency_symbol: 'E', country: 'IT' },
      'compact', 48, false, false, 'full', [], false, 'it',
    ));
    assert(receipt.includes('Menu completo'), 'the package is on the bill');
    assert(receipt.includes('  Bruschetta'), 'the dishes sit under it, indented');
    assert(!receipt.includes('Offerto'), 'a dish worth nothing inside a menu is not a gift');
    assert(/\+\s*E?\s*3/.test(receipt.replace(/\s+/g, ' ')), 'and the surcharge shows with its sign');

    console.log('\n13. The cover line says the covers actually charged');
    // The bill that found this: four at the table, three of them on a menu
    // that includes the cover, so one cover at 2,00. The old line divided the
    // 2,00 by four heads and announced "Coperto 4 x 0,50" — a price nobody had
    // ever set, which multiplies back correctly and so looked right.
    const fourWithThreeMenus = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 4,
        items: [
          menuFor('p-olives', 'p-soup'), menuFor('p-olives', 'p-soup'), menuFor('p-olives', 'p-soup'),
          { product_id: 'p-steak', quantity: 1 },
        ],
      },
    });
    assertEqual(Number(fourWithThreeMenus.data.order.cover_charge), 2, 'one cover left to charge, at 2,00');

    const coverOrder = await readOrder(fourWithThreeMenus.data.order.id);
    const coverReceipt = escPosToText(formatReceipt(
      coverOrder,
      { bill_number: 'B-2', subtotal: 93, total: 95, cover_charge: 2, discount_amount: 0 },
      { name: 'Trattoria', currency_symbol: 'E', country: 'IT' },
      'compact', 48, false, false, 'full', [], false, 'it',
    ));
    assert(!/Coperto\s+4\s*x/.test(coverReceipt), 'it does not divide the cover by the whole table');
    assert(/Coperto\s+1\s*x/.test(coverReceipt), 'it says one cover, the one actually charged');

    // ── Filling a menu in after it has been sent ──────────────────────────
    console.log('\n15. The main is decided half an hour later');
    const openMenu = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [{ course_id: saved.data.courses[0].id, product_id: 'p-bruschetta' }],
        }],
      },
    });
    assertEqual(openMenu.status, 201, 'the menu is taken with the main still open');
    const openId = openMenu.data.order.id;
    const groupId = rowsOf(openId).find((row) => row.menu_role === 'package').menu_group_id;
    const mainCourseId = saved.data.courses[1].id;
    const fillUrl = `/api/orders/${openId}/menu-groups/${groupId}/courses/${mainCourseId}`;

    // The starters go to the kitchen while the table is still deciding.
    const claimed = getPendingKotItems(db, openId).map((row: any) => row.id);
    db.prepare(`UPDATE order_items SET kot_batch = 1 WHERE id IN (${claimed.map(() => '?').join(',')})`).run(...claimed);

    const filled = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-soup'] },
    });
    assertEqual(filled.status, 200, 'the main is chosen later');
    const soupRow = rowsOf(openId).find((row) => row.product_id === 'p-soup');
    assertEqual(soupRow.menu_group_id, groupId, 'the dish joins the menu that pays for it');
    assertEqual(soupRow.menu_course_id, mainCourseId, 'and it knows which course it fills');
    assertEqual(soupRow.kot_batch, null, 'it has not been to the kitchen yet');
    assertEqual(Number(filled.data.order.total), MENU_PRICE, 'a dish with no surcharge changes no price');
    const nextRound = getPendingKotItems(db, openId);
    assertEqual(nextRound.length, 1, 'so the next round carries it alone');
    assertEqual(nextRound[0].product_id, 'p-soup', 'and nothing the kitchen already cooked');

    // The waiter who passes by with the handheld is rarely the one who took
    // the starters. Same list again, so nothing changes but the answer.
    const { authHeader: serverAuth } = seedServerUser(db);
    const colleagueReads = await api(baseUrl, `/api/orders/${openId}`, { headers: serverAuth });
    assertEqual(colleagueReads.status, 200, 'a waiter can read a menu somebody else opened');
    const colleagueFills = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: serverAuth, body: { product_ids: ['p-soup'] },
    });
    assertEqual(colleagueFills.status, 200, 'and fill it in from their own handheld');
    assertEqual(rowsOf(openId).filter((row) => row.product_id === 'p-soup').length, 1, 'without doubling the dish');

    console.log('\n16. Changing a choice that has not been cooked');
    const bill = await api(baseUrl, '/api/bills/generate', {
      method: 'POST', headers: authHeader, body: { order_id: openId },
    });
    assertEqual(bill.status, 201, 'the preconto is drawn up');

    const swapped = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-steak'] },
    });
    assertEqual(swapped.status, 200, 'they change their mind to the steak');
    assertEqual(
      rowsOf(openId).find((row) => row.product_id === 'p-soup').status, 'cancelled',
      'the dish they dropped goes off the check',
    );
    assertEqual(
      Number(swapped.data.order.total), MENU_PRICE + STEAK_SURCHARGE,
      'and the check moves by the surcharge alone',
    );
    const billAfterSwap = await api(baseUrl, `/api/bills/order/${openId}`, { headers: authHeader });
    assertEqual(
      Number(billAfterSwap.data.bill.subtotal), MENU_PRICE + STEAK_SURCHARGE,
      'the open preconto follows, subtotal and all',
    );

    const replayed = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-steak'] },
    });
    assertEqual(replayed.status, 200, 'asking for what is already there is allowed');
    assertEqual(
      rowsOf(openId).filter((row) => row.product_id === 'p-steak' && row.status !== 'cancelled').length, 1,
      'and writes nothing: a retry cannot double a dish',
    );

    const forgedFill = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader,
      body: { product_ids: ['p-steak'], unit_price_override: 0, unit_price: 0 },
    });
    assertEqual(
      Number(forgedFill.data.order.total), MENU_PRICE + STEAK_SURCHARGE,
      'a price sent from the till is still ignored here',
    );

    console.log('\n17. What filling a menu refuses');
    const tooMany = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-steak', 'p-soup'] },
    });
    assertEqual(tooMany.status, 400, 'two mains in a course that allows one');

    const wrongDish = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-coffee'] },
    });
    assertEqual(wrongDish.status, 400, 'a starter offered as the main');

    const notAList = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: 'p-steak' },
    });
    assertEqual(notAList.status, 400, 'and a dish where a list belongs');

    const noSuchGroup = await api(baseUrl, `/api/orders/${openId}/menu-groups/not-a-group/courses/${mainCourseId}`, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-steak'] },
    });
    assertEqual(noSuchGroup.status, 404, 'a menu that is not on this order');

    // The kitchen has the dish: this endpoint does not get to overrule that.
    // Taking it off the check is the cancel route's business, with the manager
    // PIN and the void adjustment it already owns.
    const cookingRow = rowsOf(openId).find((row) => row.product_id === 'p-steak' && row.status !== 'cancelled');
    db.prepare("UPDATE order_items SET status = 'preparing' WHERE id = ?").run(cookingRow.id);
    const cooking = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-soup'] },
    });
    assertEqual(cooking.status, 409, 'swapping a dish the kitchen has started is refused');
    assertEqual(cooking.data.code, 'course_in_progress', 'and says why, so the till can offer the void instead');
    assertEqual(cooking.data.item_id, cookingRow.id, 'naming the row that is holding it up');
    assertEqual(
      rowsOf(openId).find((row) => row.id === cookingRow.id).status, 'preparing',
      'nothing is written when the plan is refused',
    );
    assert(
      !rowsOf(openId).some((row) => row.product_id === 'p-soup' && row.status === 'pending'),
      'and the dish it would have swapped in is not there either',
    );
    db.prepare("UPDATE order_items SET status = 'pending' WHERE id = ?").run(cookingRow.id);

    console.log('\n18. Clearing a course, and a closed check');
    const cleared = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: [] },
    });
    assertEqual(cleared.status, 200, 'an empty list clears the course');
    assert(
      !rowsOf(openId).some((row) => row.product_id === 'p-steak' && row.status !== 'cancelled'),
      'the dish is off the check',
    );
    assertEqual(Number(cleared.data.order.total), MENU_PRICE, 'and the surcharge goes with it');

    db.prepare("UPDATE bills SET payment_status = 'paid', paid_amount = 25 WHERE order_id = ?").run(openId);
    const paidOrder = await api(baseUrl, fillUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-soup'] },
    });
    assertEqual(paidOrder.status, 409, 'once the guest has paid, the rows stop moving');

    // ── Per-dish exceptions ───────────────────────────────────────────────
    console.log('\n14. A course takes one dish in and leaves another out');
    const withExceptions = await api(baseUrl, '/api/fixed-menus/p-menu', {
      method: 'PUT',
      headers: authHeader,
      body: {
        courses: [
          { label: 'Antipasto', is_required: true, max_choices: 1, category_ids: ['cat-starters'] },
          {
            label: 'Secondo', is_required: true, max_choices: 1, category_ids: ['cat-mains'],
            surcharges: [
              { product_id: 'p-steak', surcharge: STEAK_SURCHARGE },
              { product_id: 'p-branzino', surcharge: 5 },
            ],
            // The lobster is a main and is not in the menu; the sea bass is
            // not a main and is.
            excluded_product_ids: ['p-lobster'],
            included_product_ids: ['p-branzino'],
          },
        ],
      },
    });
    assertEqual(withExceptions.status, 200, 'the exceptions save');
    const mainCourse = withExceptions.data.courses[1];
    assertEqual(mainCourse.excluded_product_ids.join(), 'p-lobster', 'the lobster is on the way out');
    assertEqual(mainCourse.included_product_ids.join(), 'p-branzino', 'the sea bass is on the way in');

    const catalogue = await api(baseUrl, '/api/products?active=true', { headers: authHeader });
    const tillMenu = catalogue.data.products.find((product: any) => product.id === 'p-menu');
    assertEqual(
      tillMenu?.courses?.[1]?.included_product_ids?.join(), 'p-branzino',
      'and the till is told, so it offers what the check will accept',
    );

    const excludedPick = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [
            { course_id: withExceptions.data.courses[0].id, product_id: 'p-bruschetta' },
            { course_id: mainCourse.id, product_id: 'p-lobster' },
          ],
        }],
      },
    });
    assertEqual(excludedPick.status, 400, 'a dish struck off its own category is refused');

    const includedPick = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [
            { course_id: withExceptions.data.courses[0].id, product_id: 'p-bruschetta' },
            { course_id: mainCourse.id, product_id: 'p-branzino' },
          ],
        }],
      },
    });
    assertEqual(includedPick.status, 201, 'a dish taken in from another category is accepted');
    const fishRows = rowsOf(includedPick.data.order.id);
    const fishRow = fishRows.find((row) => row.product_id === 'p-branzino');
    assertEqual(Number(fishRow.total), 5, 'and it carries its surcharge, not its own price');
    assertEqual(Number(includedPick.data.order.total), MENU_PRICE + 5, 'the menu comes to its price plus the supplement');

    const contradiction = await api(baseUrl, '/api/fixed-menus/p-menu', {
      method: 'PUT',
      headers: authHeader,
      body: {
        courses: [{
          label: 'Secondo', is_required: true, max_choices: 1, category_ids: ['cat-mains'],
          included_product_ids: ['p-lobster'], excluded_product_ids: ['p-lobster'],
        }],
      },
    });
    assertEqual(contradiction.status, 400, 'a dish cannot be both taken in and left out');

    // Dropping the category the exclusion referred to drops the exclusion with
    // it — left behind it would spring back the day the category returns. An
    // inclusion is not the category's to take away.
    const withoutMains = await api(baseUrl, '/api/fixed-menus/p-menu', {
      method: 'PUT',
      headers: authHeader,
      body: {
        courses: [{
          label: 'Secondo', is_required: true, max_choices: 1, category_ids: ['cat-fish'],
          excluded_product_ids: ['p-lobster'], included_product_ids: ['p-branzino', 'p-steak'],
        }],
      },
    });
    assertEqual(withoutMains.status, 200, 'the course saves without its old category');
    assertEqual(withoutMains.data.courses[0].excluded_product_ids.length, 0, 'the orphaned exclusion is dropped');
    assertEqual(withoutMains.data.courses[0].included_product_ids.join(), 'p-steak', 'the steak is now the one taken in');
    assert(
      !withoutMains.data.courses[0].included_product_ids.includes('p-branzino'),
      'and a dish its own category already covers is not stored twice',
    );

    // ── The note and the wave belong to the dish ──────────────────────────
    console.log('\n19. A note on one dish of a menu, and its own wave');
    const noted = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        items: [{
          product_id: 'p-menu', quantity: 1,
          special_instructions: 'nota del pacchetto',
          menu_selection: [
            { course_id: withoutMains.data.courses[0].id, product_id: 'p-branzino', note: 'senza sale', service_run: 1 },
          ],
        }],
      },
    });
    assertEqual(noted.status, 201, 'the menu is ordered with a note on its dish');

    const notedRows = rowsOf(noted.data.order.id);
    const fishWithNote = notedRows.find((row) => row.product_id === 'p-branzino');
    assertEqual(fishWithNote.special_instructions, 'senza sale', 'the note is on the dish the cook will read');
    assertEqual(fishWithNote.service_run, 1, 'and so is the wave the floor asked for');

    // The package row is filtered out of every ticket, so anything written
    // against the menu itself would have reached nobody. It is not kept.
    const notedPackage = notedRows.find((row) => row.menu_role === 'package');
    assertEqual(notedPackage.special_instructions, null, 'a note against the menu itself is not kept');

    const notedTicket = escPosToText(formatKOT(
      { order_number: noted.data.order.order_number, table: { name: '4' } },
      routeItemsToStations(db, getPendingKotItems(db, noted.data.order.id))[0].items,
      'Cucina', 48, false, 'full', 'it-IT', undefined, [], false, 1, 'it',
    ));
    assert(/SENZA SALE|senza sale/i.test(notedTicket), 'the note reaches the kitchen ticket');

    // Nothing asked for: the dish takes the wave its own category says, not
    // one belonging to the menu it was chosen from.
    db.prepare('UPDATE categories SET default_service_run = 3 WHERE id = ?').run('cat-fish');
    const unasked = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [{ course_id: withoutMains.data.courses[0].id, product_id: 'p-branzino' }],
        }],
      },
    });
    assertEqual(
      rowsOf(unasked.data.order.id).find((row) => row.product_id === 'p-branzino').service_run, 3,
      'a dish inside a menu goes out with its own category',
    );

    // ── Counting into a line already sent ─────────────────────────────────
    console.log('\n20. A course of a line of menus holds that many dishes');
    const counted = await api(baseUrl, '/api/fixed-menus/p-menu', {
      method: 'PUT',
      headers: authHeader,
      body: {
        courses: [
          { label: 'Antipasto', is_required: true, max_choices: 1, category_ids: ['cat-starters'] },
          {
            label: 'Secondo', is_required: true, max_choices: 1, category_ids: ['cat-mains'],
            surcharges: [{ product_id: 'p-steak', surcharge: STEAK_SURCHARGE }],
          },
        ],
      },
    });
    assertEqual(counted.status, 200, 'the menu is back to a starter and a main');
    const [starterCourse, mainsCourse] = counted.data.courses;

    const countedTable = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 4,
        items: [{
          product_id: 'p-menu', quantity: 3,
          menu_selection: [{ course_id: starterCourse.id, product_id: 'p-bruschetta', quantity: 3 }],
        }],
      },
    });
    assertEqual(countedTable.status, 201, 'three menus with the starters counted and the mains still open');
    const countedId = countedTable.data.order.id;
    const lineId = rowsOf(countedId).find((row) => row.menu_role === 'package').menu_group_id;
    const mainsUrl = `/api/orders/${countedId}/menu-groups/${lineId}/courses/${mainsCourse.id}`;
    const liveMains = () => rowsOf(countedId).filter((row) => (
      row.menu_course_id === mainsCourse.id && row.status !== 'cancelled'
    ));

    const mains = await api(baseUrl, mainsUrl, {
      method: 'PUT', headers: authHeader,
      body: { product_ids: [{ product_id: 'p-soup', quantity: 2 }, 'p-steak'] },
    });
    assertEqual(mains.status, 200, 'the mains are counted in later: two soups and a steak');
    assertEqual(liveMains().length, 3, 'three rows, one per portion');
    assertEqual(
      Number(mains.data.order.total), MENU_PRICE * 3 + STEAK_SURCHARGE + 2,
      'and the check moves by the one surcharge, the fourth guest\'s cover still on it',
    );

    const fourthMain = await api(baseUrl, mainsUrl, {
      method: 'PUT', headers: authHeader,
      body: { product_ids: [{ product_id: 'p-soup', quantity: 3 }, 'p-steak'] },
    });
    assertEqual(fourthMain.status, 400, 'a fourth main on three menus is refused');
    assertEqual(liveMains().length, 3, 'and nothing is written');

    console.log('\n21. One soup fewer releases a soup still waiting');
    const soups = liveMains().filter((row) => row.product_id === 'p-soup');
    db.prepare("UPDATE order_items SET status = 'preparing' WHERE id = ?").run(soups[0].id);
    const oneSoupFewer = await api(baseUrl, mainsUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-soup', 'p-steak'] },
    });
    assertEqual(oneSoupFewer.status, 200, 'taking one soup off two is allowed while one still waits');
    assertEqual(rowsOf(countedId).find((row) => row.id === soups[0].id).status, 'preparing', 'the soup in the pan stays');
    assertEqual(rowsOf(countedId).find((row) => row.id === soups[1].id).status, 'cancelled', 'the one still waiting goes');

    console.log('\n22. How many the line feeds changes after it was sent');
    const countUrl = `/api/orders/${countedId}/menu-groups/${lineId}`;
    const packageOf = () => rowsOf(countedId).find((row) => row.menu_role === 'package');

    const four = await api(baseUrl, countUrl, { method: 'PATCH', headers: authHeader, body: { quantity: 4 } });
    assertEqual(four.status, 200, 'a friend arrives and takes the menu too');
    assertEqual(packageOf().quantity, 4, 'the line now feeds four');
    assertEqual(Number(packageOf().total), MENU_PRICE * 4, 'and costs four');
    assertEqual(Number(four.data.order.cover_charge), 0, 'the fourth cover is inside a menu now');
    assertEqual(Number(four.data.order.total), MENU_PRICE * 4 + STEAK_SURCHARGE, 'and the check follows');

    const tooFew = await api(baseUrl, countUrl, { method: 'PATCH', headers: authHeader, body: { quantity: 2 } });
    assertEqual(tooFew.status, 409, 'two menus cannot hold three starters');
    assertEqual(tooFew.data.code, 'menu_course_overflow', 'and it says why');
    assertEqual(tooFew.data.course_id, starterCourse.id, 'naming the course that is too full');
    assertEqual(packageOf().quantity, 4, 'nothing moves when it is refused');

    const back = await api(baseUrl, countUrl, { method: 'PATCH', headers: serverAuth, body: { quantity: 3 } });
    assertEqual(back.status, 200, 'a waiter takes one back off, from the handheld');
    assertEqual(Number(back.data.order.cover_charge), 2, 'the fourth guest pays their cover again');
    assertEqual(Number(back.data.order.total), MENU_PRICE * 3 + STEAK_SURCHARGE + 2, 'and the menu comes off the total');

    const sameAgain = await api(baseUrl, countUrl, { method: 'PATCH', headers: authHeader, body: { quantity: 3 } });
    assertEqual(sameAgain.status, 200, 'asking for the count it already has is allowed');
    assertEqual(Number(sameAgain.data.order.total), MENU_PRICE * 3 + STEAK_SURCHARGE + 2, 'and changes nothing');

    const zero = await api(baseUrl, countUrl, { method: 'PATCH', headers: authHeader, body: { quantity: 0 } });
    assertEqual(zero.status, 400, 'no menus at all is a cancel, not a count');
    const noSuchLine = await api(baseUrl, `/api/orders/${countedId}/menu-groups/not-a-group`, {
      method: 'PATCH', headers: authHeader, body: { quantity: 2 },
    });
    assertEqual(noSuchLine.status, 404, 'a line that is not on this order');

    const countedBill = await api(baseUrl, '/api/bills/generate', {
      method: 'POST', headers: authHeader, body: { order_id: countedId },
    });
    assertEqual(countedBill.status, 201, 'the preconto is drawn up');
    db.prepare("UPDATE bills SET payment_status = 'paid', paid_amount = 80 WHERE order_id = ?").run(countedId);
    const afterPaying = await api(baseUrl, countUrl, { method: 'PATCH', headers: authHeader, body: { quantity: 4 } });
    assertEqual(afterPaying.status, 409, 'once the guests have paid, the count stops moving');

    console.log('\n23. Filling a course keeps what each portion already says');
    const notedLine = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 3,
        items: [{
          product_id: 'p-menu', quantity: 3,
          menu_selection: [
            { course_id: mainsCourse.id, product_id: 'p-soup', note: 'senza sale' },
            { course_id: mainsCourse.id, product_id: 'p-soup', service_run: 2 },
          ],
        }],
      },
    });
    assertEqual(notedLine.status, 201, 'two soups, one without salt and one out in the second wave');
    const notedId = notedLine.data.order.id;
    const notedGroup = rowsOf(notedId).find((row) => row.menu_role === 'package').menu_group_id;
    const notedUrl = `/api/orders/${notedId}/menu-groups/${notedGroup}/courses/${mainsCourse.id}`;
    const soupRows = () => rowsOf(notedId).filter((row) => row.product_id === 'p-soup' && row.status !== 'cancelled');
    const soupIds = soupRows().map((row) => row.id).join(',');

    // What the grid sends when a third soup is dropped in: the dishes already
    // there as bare ids, and the new one.
    const fromGrid = await api(baseUrl, notedUrl, {
      method: 'PUT', headers: authHeader, body: { product_ids: ['p-soup', 'p-soup', 'p-soup'] },
    });
    assertEqual(fromGrid.status, 200, 'a third soup from the grid joins the course');
    assertEqual(soupRows().length, 3, 'three soups');
    assert(soupRows().some((row) => row.special_instructions === 'senza sale'), 'and the one without salt still says so');
    assertEqual(
      rowsOf(notedId).filter((row) => row.product_id === 'p-soup' && row.status === 'cancelled').length, 0,
      'nothing already there was cancelled and written again',
    );

    // What the window sends: the plain count first, the one with its own run
    // after it. The plain soup must not take the row of the second wave.
    const beforeWindow = soupRows().map((row) => row.id).join(',');
    const fromWindow = await api(baseUrl, notedUrl, {
      method: 'PUT', headers: authHeader,
      body: {
        product_ids: [
          { product_id: 'p-soup', quantity: 1 },
          { product_id: 'p-soup', note: 'senza sale' },
          { product_id: 'p-soup', service_run: 2 },
        ],
      },
    });
    assertEqual(fromWindow.status, 200, 'the window saves the course as it shows it');
    assertEqual(soupRows().map((row) => row.id).join(','), beforeWindow, 'and not a row moves: every portion found its own');
    assert(soupIds.length > 0, 'the soups were there to begin with');

    console.log('\n24. Fewer menus take their share of the discounts with them');
    // A discount agreed on the menu row was agreed on the line as it stood.
    // Kept whole, eight menus' worth of it would land on the one menu left —
    // and the count is something the floor may change, while agreeing a
    // discount is not.
    const discounted = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'takeaway', items: [{ product_id: 'p-menu', quantity: 4, menu_selection: [] }] },
    });
    assertEqual(discounted.status, 201, 'four menus, nothing chosen yet');
    const discountedId = discounted.data.order.id;
    const discountedPackage = () => rowsOf(discountedId).find((row) => row.menu_role === 'package');

    const rowDiscount = await api(baseUrl, `/api/orders/${discountedId}/items/${discountedPackage().id}/discount`, {
      method: 'PATCH', headers: authHeader, body: { discount_type: 'percentage', discount_value: 20 },
    });
    assertEqual(rowDiscount.status, 200, 'the manager takes 20% off the menus');
    assertEqual(Number(discountedPackage().discount_amount), 20, 'twenty euro off a hundred');

    const halved = await api(baseUrl, `/api/orders/${discountedId}/menu-groups/${discountedPackage().menu_group_id}`, {
      method: 'PATCH', headers: serverAuth, body: { quantity: 2 },
    });
    assertEqual(halved.status, 200, 'two of the four cancel, and a waiter says so');
    assertEqual(Number(discountedPackage().discount_amount), 10, 'and half the discount goes with them');
    assertEqual(Number(discountedPackage().total), MENU_PRICE * 2 - 10, 'the row is two menus less their share');
    assertEqual(Number(halved.data.order.total), MENU_PRICE * 2 - 10, 'and so is the check');

    console.log('\n25. A discount in euros never outgrows what is left on the check');
    const flat = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'takeaway', items: [{ product_id: 'p-menu', quantity: 4, menu_selection: [] }] },
    });
    const flatId = flat.data.order.id;
    const flatGroup = rowsOf(flatId).find((row) => row.menu_role === 'package').menu_group_id;
    // The house has to allow discounts in euros before one can be given.
    const allowFlat = await api(baseUrl, '/api/settings/discount', {
      method: 'PUT', headers: authHeader, body: { discount_mode: 'both' },
    });
    assertEqual(allowFlat.status, 200, 'the house allows discounts in euros too');
    const orderDiscount = await api(baseUrl, `/api/orders/${flatId}/discount`, {
      method: 'PATCH', headers: authHeader, body: { discount_type: 'amount', discount_value: 50 },
    });
    assertEqual(orderDiscount.status, 200, 'fifty euro off the whole order');

    const downToOne = await api(baseUrl, `/api/orders/${flatId}/menu-groups/${flatGroup}`, {
      method: 'PATCH', headers: authHeader, body: { quantity: 1 },
    });
    assertEqual(downToOne.status, 200, 'three of the four menus come off');
    assertEqual(
      Number(downToOne.data.order.discount_amount), MENU_PRICE,
      'the discount stops at what is left, so the printed lines still add up',
    );
    assertEqual(Number(downToOne.data.order.total), 0, 'and the check comes to nothing, not below it');

    console.log('\n26. An absurd count is refused, not built');
    const absurd = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [{ course_id: starterCourse.id, product_id: 'p-bruschetta', quantity: 990 }],
        }],
      },
    });
    assertEqual(absurd.status, 400, 'nine hundred starters on one menu');
    const absurdFill = await api(baseUrl, notedUrl, {
      method: 'PUT', headers: authHeader,
      body: { product_ids: [{ product_id: 'p-soup', quantity: 990 }] },
    });
    assertEqual(absurdFill.status, 400, 'and the same asked of a course already on the check');

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    const results = getResults();
    console.log(`Results: ${results.passed}/${results.total} passed, ${results.failed} failed`);
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error(`\n✗ Test crashed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    server?.close();
    closeDatabase();
  }
}

main();
