/**
 * Integration Test: the cover charge
 *
 * The covers were counted and never priced. Now the house can set a price per
 * head, and the table pays it — but only a laid table: a takeaway is not a
 * cover however many people share the bag.
 *
 * Covers:
 *  - Off by default: nothing changes for a house that does not charge one.
 *  - A dine-in order is charged per guest, and the total carries it.
 *  - Takeaway pays none.
 *  - The bill generated from the order carries it too, so the printed total
 *    and the order agree.
 *  - PATCH /api/orders/:id/guests re-prices it when a friend turns up late,
 *    and follows the change through to the unpaid bill.
 *
 * Usage: node tests/run-electron-node-test.cjs tests/cover-charge.test.ts
 */

// ── Electron Mock (must be before any app imports) ───────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-cover-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-cover';

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
} = require('./helpers/test-setup');

// Splitting is parked for the dining room (main/lib/split-checks.ts). These
// suites switch it on for themselves so the code stays exercised and ready
// for whoever unparks it, instead of rotting untested behind a constant.
const { setSplitChecksAvailableForTests } = require('../main/lib/split-checks');
setSplitChecksAvailableForTests(true);

const { orderRoutes } = require('../main/routes/orders');
const { billRoutes } = require('../main/routes/bills');
const { settingsRoutes } = require('../main/routes/settings');

async function main() {
  console.log('Integration Test: cover charge');
  console.log('='.repeat(60));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-cover', 'Cucina');
  seedProduct(db, 'prod-cover', 'cat-cover', 'Amatriciana', 1000);

  const app = createApp({
    '/api/orders': orderRoutes,
    '/api/bills': billRoutes,
    '/api/settings': settingsRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const placeOrder = async (type: string, guests: number | null) => {
    const res = await api(baseUrl, '/api/orders', {
      method: 'POST',
      body: { type, guest_count: guests, items: [{ product_id: 'prod-cover', quantity: 1 }] },
      headers: authHeader,
    });
    assertEqual(res.status, 201, `${type} order created`);
    return res.data.order;
  };
  const readOrder = async (orderId: number) =>
    (await api(baseUrl, `/api/orders/${orderId}`, { headers: authHeader })).data.order;

  try {
    // ── Off by default ────────────────────────────────────────────────────
    console.log('\n1. A house that charges no cover sees nothing change');
    const setting = await api(baseUrl, '/api/settings/cover_charge_amount', { headers: authHeader });
    assertEqual(setting.status, 200, 'the setting reads');
    assertEqual(setting.data.setting?.value, '0', 'and defaults to nothing');

    const free = await placeOrder('dine_in', 4);
    assertEqual(Number(free.cover_charge || 0), 0, 'no cover on the order');
    assertEqual(Number(free.total), 1000, 'the total is the food and nothing else');

    // ── Priced per head ───────────────────────────────────────────────────
    console.log('\n2. With a price set, a laid table pays per head');
    const saved = await api(baseUrl, '/api/settings/cover_charge_amount', {
      method: 'PUT', body: { value: '2.50' }, headers: authHeader,
    });
    assertEqual(saved.status, 200, 'the price is saved');

    const seated = await placeOrder('dine_in', 4);
    assertEqual(Number(seated.cover_charge), 10, 'four covers at two and a half');
    assertEqual(Number(seated.total), 1010, 'and the total carries them');

    console.log('\n3. A takeaway is not a laid table');
    const bag = await placeOrder('takeaway', 4);
    assertEqual(Number(bag.cover_charge || 0), 0, 'no cover on a takeaway');
    assertEqual(Number(bag.total), 1000, 'its total is the food alone');

    // ── The bill agrees with the order ────────────────────────────────────
    console.log('\n4. The bill carries what the order says');
    const bill = await api(baseUrl, '/api/bills/generate', {
      method: 'POST', body: { order_id: seated.id }, headers: authHeader,
    });
    assertEqual(bill.status, 201, 'bill generated');
    assertEqual(Number(bill.data.bill.cover_charge), 10, 'the bill carries the cover');
    assertEqual(Number(bill.data.bill.total), 1010, 'and its total matches the order');

    // ── Correcting the covers ─────────────────────────────────────────────
    console.log('\n5. A friend turns up late');
    const changed = await api(baseUrl, `/api/orders/${seated.id}/guests`, {
      method: 'PATCH', body: { guest_count: 5 }, headers: authHeader,
    });
    assertEqual(changed.status, 200, 'the covers are corrected');
    assertEqual(Number(changed.data.order.guest_count), 5, 'the order counts five');
    assertEqual(Number(changed.data.order.cover_charge), 12.5, 'and charges five covers');
    assertEqual(Number(changed.data.order.total), 1012.5, 'the total follows');

    const billAfter = await api(baseUrl, `/api/bills/order/${seated.id}`, { headers: authHeader });
    assertEqual(Number(billAfter.data.bill.total), 1012.5, 'the open bill follows too');
    assertEqual(Number(billAfter.data.bill.balance), 1012.5, 'and so does what is owed');
    // The line, not just the bottom of the bill: with the total right and the
    // cover stale, the print divided the old charge by the new head count and
    // invented a price per cover nobody had ever set.
    assertEqual(Number(billAfter.data.bill.cover_charge), 12.5, 'and so does the cover line itself');

    console.log('\n6. Splitting the check divides the cover per head, not per plate');
    db.prepare("UPDATE settings SET value = 'true' WHERE key = 'split_checks_enabled'").run();
    seedProduct(db, 'prod-cheap', 'cat-cover', 'Caffe', 100);

    const shared = await api(baseUrl, '/api/orders', {
      method: 'POST',
      body: {
        type: 'dine_in',
        guest_count: 4,
        items: [{ product_id: 'prod-cover', quantity: 1 }, { product_id: 'prod-cheap', quantity: 1 }],
      },
      headers: authHeader,
    });
    const steak = shared.data.order.items.find((item: any) => item.product_id === 'prod-cover');
    const coffee = shared.data.order.items.find((item: any) => item.product_id === 'prod-cheap');
    assertEqual(Number(shared.data.order.cover_charge), 10, 'four covers on the shared table');

    const wholeBill = await api(baseUrl, '/api/bills/generate', {
      method: 'POST', body: { order_id: shared.data.order.id }, headers: authHeader,
    });
    const split = await api(baseUrl, `/api/bills/${wholeBill.data.bill.id}/split-check`, {
      method: 'POST',
      body: { checks: [
        { label: 'Guest 1', items: [{ order_item_id: steak.id, quantity: 1 }] },
        { label: 'Guest 2', items: [{ order_item_id: coffee.id, quantity: 1 }] },
      ] },
      headers: authHeader,
    });
    assertEqual(split.status, 201, 'the check splits');
    const [first, second] = split.data.bills;
    // The one who took the steak was paying 9,90 of the cover and the one who
    // took the coffee 0,10: it was being spread by the price of the food.
    assertEqual(Number(first.cover_charge), 5, 'the steak carries its own head and no more');
    assertEqual(Number(second.cover_charge), 5, 'and so does the coffee');
    assertEqual(Number(first.total), 1005, 'the share adds up: its own food plus its own cover');
    assertEqual(Number(second.total), 105, 'and so does the other');
    assertEqual(
      Number((Number(first.total) + Number(second.total)).toFixed(2)),
      Number(wholeBill.data.bill.total),
      'and together they are still the whole check',
    );

    console.log('\n7. What it refuses');
    assertEqual(
      (await api(baseUrl, `/api/orders/${seated.id}/guests`, { method: 'PATCH', body: { guest_count: 0 }, headers: authHeader })).status,
      400,
      'a table of nobody',
    );
    assertEqual(
      (await api(baseUrl, `/api/orders/${seated.id}/guests`, { method: 'PATCH', body: { guest_count: 2.5 }, headers: authHeader })).status,
      400,
      'half a person',
    );
    await api(baseUrl, `/api/orders/${seated.id}/status`, {
      method: 'PATCH', body: { status: 'completed' }, headers: authHeader,
    });
    assertEqual(
      (await api(baseUrl, `/api/orders/${seated.id}/guests`, { method: 'PATCH', body: { guest_count: 3 }, headers: authHeader })).status,
      400,
      'an order already finished',
    );

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
