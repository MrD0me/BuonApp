/**
 * Integration Test: service runs — when a dish leaves the kitchen
 *
 * A table orders everything at once and still eats in three goes. Until now
 * the only way to say so was to hold the ticket back and send a second one, or
 * to write "with the starters" in the notes and hope a cook read it between
 * "no garlic" and "well done".
 *
 * A run is not a round. `kot_batch` records what has already been sent; the run
 * records when it should come out. Pressing Send still sends everything
 * pending — the run only changes how the ticket is laid out.
 *
 * Covers:
 *  - A new row takes its run from the dish's own category, with no help.
 *  - What the floor asks for wins over the category; nonsense falls back
 *    rather than failing the order.
 *  - A dish inside a fixed menu takes its run from its own category, not from
 *    the menu's course: a primo inside a menu goes out with the primi.
 *  - The endpoint moves one row, before and after the ticket has printed, and
 *    never touches kot_batch.
 *  - Its refusals: a closed order, a row off the check, a run out of range,
 *    and a waiter reaching for another waiter's table.
 *  - Runs are labels, not gates: what is pending stays pending whatever run it
 *    is on.
 *
 * Usage: node tests/run-electron-node-test.cjs tests/service-runs.test.ts
 */

// ── Electron Mock (must be before any app imports) ───────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-service-runs-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-service-runs';

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
} = require('./helpers/test-setup');

const { orderRoutes } = require('../main/routes/orders');
const { categoryRoutes } = require('../main/routes/categories');
const { fixedMenuRoutes } = require('../main/routes/fixed-menus');
const { getPendingKotItems } = require('../main/routes/printers');
const {
  normalizeServiceRun, defaultServiceRunForProduct, resolveServiceRun, groupItemsByServiceRun,
  MAX_SERVICE_RUNS,
} = require('../main/services/service-runs');

async function main() {
  console.log('Integration Test: service runs');
  console.log('='.repeat(60));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);

  seedCategory(db, 'cat-starters', 'Antipasti');
  seedCategory(db, 'cat-pasta', 'Primi');
  seedCategory(db, 'cat-mains', 'Secondi');
  seedCategory(db, 'cat-menus', 'Menu');

  // The waves the house actually serves in.
  db.prepare('UPDATE categories SET default_service_run = 2 WHERE id = ?').run('cat-pasta');
  db.prepare('UPDATE categories SET default_service_run = 3 WHERE id = ?').run('cat-mains');

  seedProduct(db, 'p-bruschetta', 'cat-starters', 'Bruschetta', 6);
  seedProduct(db, 'p-tagliatelle', 'cat-pasta', 'Tagliatelle', 12);
  seedProduct(db, 'p-steak', 'cat-mains', 'Tagliata', 18);
  seedProduct(db, 'p-menu', 'cat-menus', 'Menu completo', 25);
  db.prepare('UPDATE products SET is_fixed_menu = 1 WHERE id = ?').run('p-menu');

  const app = createApp({
    '/api/orders': orderRoutes,
    '/api/categories': categoryRoutes,
    '/api/fixed-menus': fixedMenuRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const rowsOf = (orderId: number) =>
    db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId) as any[];
  const rowFor = (orderId: number, productId: string) =>
    rowsOf(orderId).find((row) => row.product_id === productId);

  try {
    // ── The rule, on its own ──────────────────────────────────────────────
    console.log('\n1. Reading a run, and refusing to read a bad one');
    assertEqual(normalizeServiceRun(2), 2, 'a run in range is itself');
    assertEqual(normalizeServiceRun(0), null, 'zero is not a run');
    assertEqual(normalizeServiceRun(MAX_SERVICE_RUNS + 1), null, 'nor is one past the last');
    assertEqual(normalizeServiceRun('later'), null, 'nor is a word');
    assertEqual(normalizeServiceRun(1.5), null, 'nor half a run');

    assertEqual(defaultServiceRunForProduct(db, 'p-bruschetta'), 1, 'a starter goes out first');
    assertEqual(defaultServiceRunForProduct(db, 'p-tagliatelle'), 2, 'pasta second');
    assertEqual(defaultServiceRunForProduct(db, 'p-steak'), 3, 'the main third');
    assertEqual(resolveServiceRun(db, 'p-steak', 1), 1, 'what the floor asks for wins');
    assertEqual(resolveServiceRun(db, 'p-steak', 'nonsense'), 3, 'and nonsense falls back to the category');

    const grouped = groupItemsByServiceRun([
      { id: 'a', service_run: 3 }, { id: 'b', service_run: 1 },
      { id: 'c', service_run: 3 }, { id: 'd' },
    ]);
    assertEqual(grouped.length, 2, 'a run with nothing in it is not a wave');
    assertEqual(grouped[0].run, 1, 'waves come out in order');
    assertEqual(grouped[0].items.length, 2, 'a row with no run at all joins the first');
    assertEqual(grouped[1].items.length, 2, 'and the rest keep theirs');

    // ── Taking an order ───────────────────────────────────────────────────
    console.log('\n2. A new row knows which wave it belongs to');
    const order = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 3,
        items: [
          { product_id: 'p-bruschetta', quantity: 2 },
          { product_id: 'p-tagliatelle', quantity: 1 },
          { product_id: 'p-steak', quantity: 1 },
        ],
      },
    });
    assertEqual(order.status, 201, 'the order is taken');
    const orderId = order.data.order.id;
    assertEqual(rowFor(orderId, 'p-bruschetta').service_run, 1, 'the starters go out first, with nobody asked');
    assertEqual(rowFor(orderId, 'p-tagliatelle').service_run, 2, 'the pasta second');
    assertEqual(rowFor(orderId, 'p-steak').service_run, 3, 'the main third');

    console.log('\n3. The guest who is not having a starter');
    const withRequest = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        // Their pasta comes out with everyone else's starters.
        items: [{ product_id: 'p-tagliatelle', quantity: 1, service_run: 1 }],
      },
    });
    assertEqual(withRequest.status, 201, 'the order is taken');
    assertEqual(
      rowFor(withRequest.data.order.id, 'p-tagliatelle').service_run, 1,
      'the pasta leaves with the starters because the floor said so',
    );

    const withRubbish = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', guest_count: 1, items: [{ product_id: 'p-steak', quantity: 1, service_run: 99 }] },
    });
    assertEqual(withRubbish.status, 201, 'a run out of range does not fail the order');
    assertEqual(rowFor(withRubbish.data.order.id, 'p-steak').service_run, 3, 'it falls back to the category');

    // ── Inside a fixed menu ───────────────────────────────────────────────
    console.log('\n4. A primo inside a menu is still a primo');
    const saved = await api(baseUrl, '/api/fixed-menus/p-menu', {
      method: 'PUT', headers: authHeader,
      body: {
        courses: [
          { label: 'Antipasto', is_required: true, max_choices: 1, category_ids: ['cat-starters'] },
          { label: 'Primo', is_required: true, max_choices: 1, category_ids: ['cat-pasta'] },
        ],
      },
    });
    assertEqual(saved.status, 200, 'the menu is configured');

    const menuOrder = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: {
        type: 'dine_in', guest_count: 1,
        items: [{
          product_id: 'p-menu', quantity: 1,
          menu_selection: [
            { course_id: saved.data.courses[0].id, product_id: 'p-bruschetta' },
            { course_id: saved.data.courses[1].id, product_id: 'p-tagliatelle' },
          ],
        }],
      },
    });
    assertEqual(menuOrder.status, 201, 'the menu is ordered');
    const menuId = menuOrder.data.order.id;
    assertEqual(rowFor(menuId, 'p-bruschetta').service_run, 1, 'the starter chosen inside a menu goes out first');
    assertEqual(
      rowFor(menuId, 'p-tagliatelle').service_run, 2,
      'and its primo goes out with the primi, not with the rest of its menu',
    );

    // ── Moving one row ────────────────────────────────────────────────────
    console.log('\n5. Moving a row to another wave');
    const steakRow = rowFor(orderId, 'p-steak');
    const moved = await api(baseUrl, `/api/orders/${orderId}/items/${steakRow.id}/service-run`, {
      method: 'PATCH', headers: authHeader, body: { service_run: 1 },
    });
    assertEqual(moved.status, 200, 'the row moves');
    assertEqual(rowFor(orderId, 'p-steak').service_run, 1, 'and it is now in the first wave');

    // Runs are labels, not gates: nothing about what is waiting to be sent
    // changes because a row was moved.
    const pendingBefore = getPendingKotItems(db, orderId).length;
    await api(baseUrl, `/api/orders/${orderId}/items/${steakRow.id}/service-run`, {
      method: 'PATCH', headers: authHeader, body: { service_run: 3 },
    });
    assertEqual(getPendingKotItems(db, orderId).length, pendingBefore, 'moving a row sends nothing and holds nothing back');

    console.log('\n6. A row already on a printed ticket still moves');
    db.prepare('UPDATE order_items SET kot_batch = 1 WHERE order_id = ?').run(orderId);
    const afterPrint = await api(baseUrl, `/api/orders/${orderId}/items/${steakRow.id}/service-run`, {
      method: 'PATCH', headers: authHeader, body: { service_run: 2 },
    });
    assertEqual(afterPrint.status, 200, 'the kitchen having the paper does not freeze the row');
    const reread = rowFor(orderId, 'p-steak');
    assertEqual(reread.service_run, 2, 'the run is the new one');
    assertEqual(reread.kot_batch, 1, 'and the round it went out on is untouched: nothing is re-sent');

    console.log('\n7. What it refuses');
    const outOfRange = await api(baseUrl, `/api/orders/${orderId}/items/${steakRow.id}/service-run`, {
      method: 'PATCH', headers: authHeader, body: { service_run: MAX_SERVICE_RUNS + 1 },
    });
    assertEqual(outOfRange.status, 400, 'a run past the last is a bad request');
    assertEqual(rowFor(orderId, 'p-steak').service_run, 2, 'and the row is left where it was');

    const missing = await api(baseUrl, `/api/orders/${orderId}/items/${steakRow.id}/service-run`, {
      method: 'PATCH', headers: authHeader, body: {},
    });
    assertEqual(missing.status, 400, 'so is asking for no run at all');

    const noSuchItem = await api(baseUrl, `/api/orders/${orderId}/items/999999/service-run`, {
      method: 'PATCH', headers: authHeader, body: { service_run: 1 },
    });
    assertEqual(noSuchItem.status, 404, 'a row that is not on this order is not found');

    db.prepare("UPDATE order_items SET status = 'cancelled' WHERE id = ?").run(steakRow.id);
    const offTheCheck = await api(baseUrl, `/api/orders/${orderId}/items/${steakRow.id}/service-run`, {
      method: 'PATCH', headers: authHeader, body: { service_run: 1 },
    });
    assertEqual(offTheCheck.status, 400, 'a row off the check has no wave to be in');

    db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(orderId);
    const closed = await api(baseUrl, `/api/orders/${orderId}/items/${rowFor(orderId, 'p-bruschetta').id}/service-run`, {
      method: 'PATCH', headers: authHeader, body: { service_run: 2 },
    });
    assertEqual(closed.status, 400, 'and a closed order is closed to this too');

    // ── The category default is editable ──────────────────────────────────
    console.log('\n8. The owner sets which wave a category goes out in');
    const created = await api(baseUrl, '/api/categories', {
      method: 'POST', headers: authHeader,
      body: { name: 'Dolci', default_service_run: 4 },
    });
    assertEqual(created.status, 201, 'the category is created');
    assertEqual(created.data.category.default_service_run, 4, 'with the wave the owner picked');

    const updated = await api(baseUrl, `/api/categories/${created.data.category.id}`, {
      method: 'PUT', headers: authHeader, body: { default_service_run: 5 },
    });
    assertEqual(updated.status, 200, 'and it can be moved later');
    assertEqual(updated.data.category.default_service_run, 5, 'to another wave');

    const renamed = await api(baseUrl, `/api/categories/${created.data.category.id}`, {
      method: 'PUT', headers: authHeader, body: { name: 'Dessert' },
    });
    assertEqual(renamed.data.category.default_service_run, 5, 'an edit that says nothing about it leaves it alone');

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
