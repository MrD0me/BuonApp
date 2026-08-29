/**
 * Integration Test: enabled order types
 *
 * A place that only serves at the table switches takeaway and delivery off.
 * The POS hides what is off, but hiding a button is not enforcement, so this
 * covers the API side:
 *
 *  - `order_types_enabled` defaults to all three types (what the app did
 *    before the setting existed), and an install whose row is missing keeps
 *    behaving that way.
 *  - PUT stores a canonical list and refuses an empty or unknown one — a
 *    tenant with no enabled type could not take an order at all.
 *  - POST /api/orders refuses a disabled type and still accepts an enabled
 *    one; `online` is not gated, because nothing in the app creates it.
 *  - Converting a dine-in order to takeaway is refused while takeaway is off.
 *
 * Usage: node tests/run-electron-node-test.cjs tests/order-types.test.ts
 */

// ── Electron Mock (must be before any app imports) ───────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-order-types-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assertEqual,
  getResults, closeDatabase, getDatabase,
} = require('./helpers/test-setup');

const { orderRoutes } = require('../main/routes/orders');
const { settingsRoutes } = require('../main/routes/settings');

const SETTING = '/api/settings/order_types_enabled';

async function main() {
  console.log('Integration Test: enabled order types');
  console.log('='.repeat(60));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-types', 'Test Menu');
  seedProduct(db, 'prod-types', 'cat-types', 'Amaro', 400);

  const app = createApp({
    '/api/orders': orderRoutes,
    '/api/settings': settingsRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const placeOrder = (type: string) => api(baseUrl, '/api/orders', {
    method: 'POST',
    body: { type, items: [{ product_id: 'prod-types', quantity: 1 }] },
    headers: authHeader,
  });

  try {
    // ── Defaults ──────────────────────────────────────────────────────────
    console.log('\n1. A fresh install takes every type');
    const initial = await api(baseUrl, SETTING, { headers: authHeader });
    assertEqual(initial.status, 200, 'GET order_types_enabled succeeds');
    assertEqual(initial.data.setting?.value, 'dine_in,takeaway,delivery', 'defaults to all three types');

    // ── Storage shape ─────────────────────────────────────────────────────
    console.log('\n2. The stored list is canonical, and cannot be emptied');
    const reordered = await api(baseUrl, SETTING, {
      method: 'PUT', body: { value: 'delivery,dine_in' }, headers: authHeader,
    });
    assertEqual(reordered.status, 200, 'PUT accepts a valid list');
    assertEqual(
      (await api(baseUrl, SETTING, { headers: authHeader })).data.setting?.value,
      'dine_in,delivery',
      'stored in a fixed order regardless of how it was sent',
    );

    assertEqual(
      (await api(baseUrl, SETTING, { method: 'PUT', body: { value: '' }, headers: authHeader })).status,
      400,
      'an empty list is refused',
    );
    assertEqual(
      (await api(baseUrl, SETTING, { method: 'PUT', body: { value: 'pigeon_post' }, headers: authHeader })).status,
      400,
      'an unknown type is refused',
    );
    assertEqual(
      (await api(baseUrl, SETTING, { headers: authHeader })).data.setting?.value,
      'dine_in,delivery',
      'a refused write leaves the stored list untouched',
    );

    // ── Enforcement on create ─────────────────────────────────────────────
    console.log('\n3. A disabled type is refused by the API, not just hidden');
    const takeawayRes = await placeOrder('takeaway');
    assertEqual(takeawayRes.status, 400, 'POST /api/orders refuses a disabled type');
    assertEqual(takeawayRes.data.code, 'order_type_disabled', 'refusal is identifiable by code');

    assertEqual((await placeOrder('dine_in')).status, 201, 'an enabled type is still accepted');
    assertEqual((await placeOrder('online')).status, 201, 'online is not gated by this setting');

    // ── Conversion ────────────────────────────────────────────────────────
    console.log('\n4. Dine-in cannot be converted to a takeaway nobody takes');
    const dineIn = await placeOrder('dine_in');
    assertEqual(dineIn.status, 201, 'dine-in order created for the conversion check');
    const convertPath = `/api/orders/${dineIn.data.order.id}/convert-to-takeaway`;

    const blocked = await api(baseUrl, convertPath, { method: 'PATCH', headers: authHeader });
    assertEqual(blocked.status, 400, 'conversion is refused while takeaway is off');
    assertEqual(blocked.data.error, 'Takeaway is disabled', 'refusal says why');

    await api(baseUrl, SETTING, {
      method: 'PUT', body: { value: 'dine_in,takeaway,delivery' }, headers: authHeader,
    });
    assertEqual(
      (await api(baseUrl, convertPath, { method: 'PATCH', headers: authHeader })).status,
      200,
      'conversion works again once takeaway is switched back on',
    );

    // ── Missing row ───────────────────────────────────────────────────────
    console.log('\n5. An install that predates the setting takes everything');
    getDatabase().prepare("DELETE FROM settings WHERE key = 'order_types_enabled'").run();
    assertEqual(
      (await api(baseUrl, SETTING, { headers: authHeader })).data.setting?.value,
      'dine_in,takeaway,delivery',
      'a missing row reads as every type',
    );
    assertEqual((await placeOrder('takeaway')).status, 201, 'and no type is refused');

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
