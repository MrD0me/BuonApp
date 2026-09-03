/**
 * Integration Test: splitting a check is parked
 *
 * The owner stopped offering it on 2026-09-04 (see main/lib/split-checks.ts for
 * why). The code stays, so this suite guards the parking itself rather than the
 * feature: with the real default — no test switching it on — the route refuses,
 * the setting cannot be turned back on through the API, and reading it answers
 * the question actually being asked, which is "can this till split a check".
 *
 * The one thing it must NOT do is throw away what the house had chosen: the
 * stored row is a preference for when splitting comes back, and unparking has
 * to give each house its own answer without anybody remembering what it was.
 *
 * Note that this file deliberately never calls setSplitChecksAvailableForTests:
 * the suites that keep the feature covered do, this one checks the shipped
 * default.
 *
 * Usage: node tests/run-electron-node-test.cjs tests/split-checks-parked.test.ts
 */

// ── Electron Mock (must be before any app imports) ───────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-split-parked-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-split-parked';

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
} = require('./helpers/test-setup');

const { orderRoutes } = require('../main/routes/orders');
const { billRoutes } = require('../main/routes/bills');
const { settingsRoutes } = require('../main/routes/settings');
const { splitChecksAvailable, SPLIT_CHECKS_SETTING_KEY } = require('../main/lib/split-checks');

async function main() {
  console.log('Integration Test: split checks are parked');
  console.log('='.repeat(60));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-parked', 'Cucina');
  seedProduct(db, 'prod-parked', 'cat-parked', 'Amatriciana', 10);

  const app = createApp({
    '/api/orders': orderRoutes,
    '/api/bills': billRoutes,
    '/api/settings': settingsRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  try {
    console.log('\n1. This build does not offer it');
    assertEqual(splitChecksAvailable(), false, 'the shipped default is off');

    console.log('\n2. The API refuses to switch it back on');
    const turnedOn = await api(baseUrl, `/api/settings/${SPLIT_CHECKS_SETTING_KEY}`, {
      method: 'PUT', body: { value: 'true' }, headers: authHeader,
    });
    assertEqual(turnedOn.status, 403, 'enabling it is refused');
    assertEqual(turnedOn.data.code, 'split_checks_unavailable', 'and says why in a code the till can read');

    const turnedOff = await api(baseUrl, `/api/settings/${SPLIT_CHECKS_SETTING_KEY}`, {
      method: 'PUT', body: { value: 'false' }, headers: authHeader,
    });
    assertEqual(turnedOff.status, 200, 'switching it off is still allowed');

    console.log('\n3. A house that had it on reads back "off", and keeps its choice');
    // Straight into the table, the way an install upgrading from a version
    // that offered it would already look.
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, 'true', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = 'true'`
    ).run(SPLIT_CHECKS_SETTING_KEY);

    const read = await api(baseUrl, `/api/settings/${SPLIT_CHECKS_SETTING_KEY}`, { headers: authHeader });
    assertEqual(read.status, 200, 'the setting still reads');
    assertEqual(read.data.setting.value, 'false', 'and answers "can this till split a check" with no');

    const stored = db.prepare('SELECT value FROM settings WHERE key = ?').get(SPLIT_CHECKS_SETTING_KEY) as { value: string };
    assertEqual(stored.value, 'true', 'while the house keeps the choice it had made, for when splitting returns');

    const bulk = await api(baseUrl, '/api/settings', { headers: authHeader });
    assertEqual(bulk.data.settings[SPLIT_CHECKS_SETTING_KEY], 'false', 'the bulk read agrees with the single one');

    console.log('\n4. And the route refuses, whatever is stored');
    const order = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', guest_count: 2, items: [{ product_id: 'prod-parked', quantity: 2 }] },
    });
    assertEqual(order.status, 201, 'an order is taken as usual');

    const bill = await api(baseUrl, '/api/bills/generate', {
      method: 'POST', headers: authHeader, body: { order_id: order.data.order.id },
    });
    assertEqual(bill.status, 201, 'and billed as usual');

    const items = db.prepare('SELECT id, quantity FROM order_items WHERE order_id = ?').all(order.data.order.id) as any[];
    const split = await api(baseUrl, `/api/bills/${bill.data.bill.id}/split-check`, {
      method: 'POST', headers: authHeader,
      body: {
        checks: [
          { label: 'Guest 1', items: [{ order_item_id: items[0].id, quantity: 1 }] },
          { label: 'Guest 2', items: [{ order_item_id: items[0].id, quantity: 1 }] },
        ],
      },
    });
    // Hiding the button in the till is not enforcement: a handheld running an
    // older screen has to be refused here.
    assertEqual(split.status, 403, 'splitting is refused at the route');
    assertEqual(split.data.code, 'split_checks_unavailable', 'with the same code');
    assertEqual(
      db.prepare('SELECT COUNT(*) AS n FROM bills WHERE order_id = ?').get(order.data.order.id).n,
      1,
      'and nothing was carved up',
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
