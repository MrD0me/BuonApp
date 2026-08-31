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
 *  - Required courses are enforced; a dish from the wrong course is refused.
 *  - An optional course (the house wine) is free to skip and changes no price.
 *  - Three menus are three groups, never one row of three.
 *  - A menu that includes the cover takes its guest off the cover charge, and
 *    never below zero however many menus a small table orders.
 *  - Adding or cancelling a menu re-prices the cover on an open order.
 *  - Cancelling any row of a menu takes the whole menu off the check.
 *  - A split check refuses to break a menu across two guests.
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
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
} = require('./helpers/test-setup');

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

  seedProduct(db, 'p-bruschetta', 'cat-starters', 'Bruschetta', 6);
  seedProduct(db, 'p-olives', 'cat-starters', 'Olive', 4);
  seedProduct(db, 'p-steak', 'cat-mains', 'Tagliata', 18);
  seedProduct(db, 'p-soup', 'cat-mains', 'Zuppa', 9);
  seedProduct(db, 'p-house-wine', 'cat-wine', 'Vino della casa', 8);
  seedProduct(db, 'p-menu', 'cat-menus', 'Menu completo', MENU_PRICE);
  seedProduct(db, 'p-coffee', 'cat-starters', 'Caffe', 1.5);

  db.prepare('UPDATE products SET is_fixed_menu = 1, fixed_menu_includes_cover = 1 WHERE id = ?').run('p-menu');

  const app = createApp({
    '/api/orders': orderRoutes,
    '/api/bills': billRoutes,
    '/api/settings': settingsRoutes,
    '/api/fixed-menus': fixedMenuRoutes,
    '/api/products': productRoutes,
  });
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

    // ── What a menu refuses ───────────────────────────────────────────────
    console.log('\n5. A half-composed menu is refused');
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
    assertEqual(missingCourse.status, 400, 'a missing required course is a bad request');

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

    // ── One menu, one group ───────────────────────────────────────────────
    console.log('\n7. Three menus are three groups, not one row of three');
    const three = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'takeaway',
        items: [{
          product_id: 'p-menu', quantity: 3,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-olives' },
            { course_id: saved.data.courses[1].id, product_id: 'p-soup' },
          ],
        }],
      },
    });
    const threeRows = rowsOf(three.data.order.id);
    assertEqual(new Set(threeRows.map((row) => row.menu_group_id)).size, 3, 'three distinct groups');
    assertEqual(threeRows.length, 9, 'nine rows in all');
    assertEqual(threeRows.every((row: any) => row.quantity === 1), true, 'every row is a single');
    assertEqual(Number(three.data.order.total), MENU_PRICE * 3, 'and the total is three menus');

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

    console.log('\n10. Cancelling any row of a menu takes the whole menu off');
    const appendedRows = rowsOf(laterTable.data.order.id);
    const oneDish = appendedRows.find((row) => row.menu_role === 'course');
    const cancelled = await api(baseUrl, `/api/orders/${laterTable.data.order.id}/items/${oneDish.id}/cancel`, {
      method: 'PATCH', headers: authHeader, body: { reason: 'test' },
    });
    assertEqual(cancelled.status, 200, 'the row is cancelled');

    const afterCancel = rowsOf(laterTable.data.order.id).filter((row) => row.menu_group_id);
    assertEqual(afterCancel.every((row: any) => row.status === 'cancelled'), true, 'every row of the menu went with it');
    const repriced = await readOrder(laterTable.data.order.id);
    assertEqual(Number(repriced.cover_charge), 4, 'and the table owes its cover again');

    // ── Splitting ─────────────────────────────────────────────────────────
    console.log('\n11. A split check will not break a menu in two');
    const splitOrder = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 2,
        items: [menuFor('p-olives', 'p-soup'), { product_id: 'p-steak', quantity: 1 }],
      },
    });
    await api(baseUrl, '/api/settings/split_checks_enabled', {
      method: 'PUT', body: { value: 'true' }, headers: authHeader,
    });
    const billed = await api(baseUrl, '/api/bills', {
      method: 'POST', headers: authHeader, body: { order_id: splitOrder.data.order.id },
    });
    assertEqual(billed.status, 201, 'the check is drawn up');

    const splitRows = rowsOf(splitOrder.data.order.id);
    const splitPkg = splitRows.find((row) => row.menu_role === 'package');
    const splitCourse = splitRows.find((row) => row.menu_role === 'course');
    const splitSteak = splitRows.find((row) => !row.menu_group_id);

    const broken = await api(baseUrl, `/api/bills/${billed.data.bill.id}/split-check`, {
      method: 'POST', headers: authHeader,
      body: {
        checks: [
          { label: 'Guest 1', items: [{ order_item_id: splitPkg.id, quantity: 1 }] },
          {
            label: 'Guest 2',
            items: splitRows
              .filter((row: any) => row.id !== splitPkg.id)
              .map((row: any) => ({ order_item_id: row.id, quantity: row.quantity })),
          },
        ],
      },
    });
    assertEqual(broken.status, 400, 'splitting the package away from its dishes is refused');

    const whole = await api(baseUrl, `/api/bills/${billed.data.bill.id}/split-check`, {
      method: 'POST', headers: authHeader,
      body: {
        checks: [
          {
            label: 'Guest 1',
            items: splitRows
              .filter((row: any) => row.menu_group_id)
              .map((row: any) => ({ order_item_id: row.id, quantity: row.quantity })),
          },
          { label: 'Guest 2', items: [{ order_item_id: splitSteak.id, quantity: 1 }] },
        ],
      },
    });
    assertEqual(whole.status, 201, 'the menu kept whole splits fine');
    assert(splitCourse.menu_group_id === splitPkg.menu_group_id, 'the dish and its package were one group all along');

    // ── Printing ──────────────────────────────────────────────────────────
    console.log('\n12. The kitchen never sees the package');
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

    console.log('\n13. The bill shows the dishes under the price, and offers nothing');
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

  } finally {
    server.close();
    closeDatabase();
  }

  const { failed } = getResults();
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
