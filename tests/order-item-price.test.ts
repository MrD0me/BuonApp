/**
 * Integration Test: setting the price of an order row
 *
 * A dish agreed at the table has no price in the menu, and when the waiter
 * writes it down nobody knows what it costs yet — the price arrives later,
 * from whoever does know. That is why this is not a discount: it can go up as
 * well as down.
 *
 * Covers:
 *  - PATCH /api/orders/:id/items/:itemId/price moves the row and the order
 *    total with it, upwards as well as downwards.
 *  - A row discount agreed on the old price is clamped to the new one, so a
 *    row can never go negative and quietly pay the guest.
 *  - Refusals: a nonsense price, a completed order, a cashier.
 *  - With `discount_requires_approval` on, the manager PIN gates it exactly as
 *    it gates a discount.
 *
 * Usage: node tests/run-electron-node-test.cjs tests/order-item-price.test.ts
 */

// ── Electron Mock (must be before any app imports) ───────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-item-price-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-item-price';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
} = require('./helpers/test-setup');

const { orderRoutes } = require('../main/routes/orders');
const { getJWTSecret } = require('../main/routes/auth');

function seedCashier(db: any) {
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, password, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run('price-cashier', 'Cashier', 'price-cashier@test.local',
    bcrypt.hashSync('testpass123', 10), 'cashier', now(), now());
  const token = jwt.sign({ userId: 'price-cashier', email: 'price-cashier@test.local', role: 'cashier' }, getJWTSecret(), { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  console.log('Integration Test: order row price');
  console.log('='.repeat(60));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  const cashierAuth = seedCashier(db);
  seedCategory(db, 'cat-price', 'Fuori menu');
  // The off-menu placeholder: zero in the menu, priced when the bill is made.
  seedProduct(db, 'prod-generic', 'cat-price', 'Generico', 0);
  seedProduct(db, 'prod-wine', 'cat-price', 'Vino', 1200);

  const app = createApp({ '/api/orders': orderRoutes });
  const { baseUrl, server } = await startServer(app);

  const placeOrder = async (productId: string) => {
    const res = await api(baseUrl, '/api/orders', {
      method: 'POST',
      body: { type: 'dine_in', items: [{ product_id: productId, quantity: 2 }] },
      headers: authHeader,
    });
    assertEqual(res.status, 201, 'order created');
    return res.data.order;
  };
  const readOrder = async (orderId: number) =>
    (await api(baseUrl, `/api/orders/${orderId}`, { headers: authHeader })).data.order;
  const setPrice = (orderId: number, itemId: number, body: Record<string, unknown>, headers = authHeader) =>
    api(baseUrl, `/api/orders/${orderId}/items/${itemId}/price`, { method: 'PATCH', body, headers });

  try {
    // ── The ordinary case ─────────────────────────────────────────────────
    console.log('\n1. A row with no menu price gets one at the table');
    const order = await placeOrder('prod-generic');
    const itemId = order.items[0].id;
    assertEqual(Number(order.total), 0, 'the placeholder starts at nothing');

    const priced = await setPrice(order.id, itemId, { unit_price: 1800 });
    assertEqual(priced.status, 200, 'the price is accepted');
    assertEqual(Number(priced.data.item.unit_price), 1800, 'the row carries the new price');
    assertEqual(Number(priced.data.item.total), 3600, 'two of them, so twice the price');

    const afterPricing = await readOrder(order.id);
    assertEqual(Number(afterPricing.total), 3600, 'the order total follows the row');

    // ── Upwards, unlike a discount ────────────────────────────────────────
    console.log('\n2. The price can go up as well as down');
    const wineOrder = await placeOrder('prod-wine');
    const wineItemId = wineOrder.items[0].id;
    assertEqual(
      (await setPrice(wineOrder.id, wineItemId, { unit_price: 1500 })).status,
      200,
      'a higher price than the menu is allowed',
    );
    assertEqual(Number((await readOrder(wineOrder.id)).total), 3000, 'and the order says so');

    // ── A discount cannot outlive the price it was agreed on ──────────────
    console.log('\n3. A row discount is clamped to the new price');
    // Percentage, because that is the mode a fresh install ships with.
    const discounted = await api(baseUrl, `/api/orders/${wineOrder.id}/items/${wineItemId}/discount`, {
      method: 'PATCH', body: { discount_type: 'percentage', discount_value: 25 }, headers: authHeader,
    });
    assertEqual(discounted.status, 200, 'a discount is applied to the row');
    assertEqual(Number(discounted.data.item.discount_amount), 750, 'a quarter off three thousand');

    const cheaper = await setPrice(wineOrder.id, wineItemId, { unit_price: 200 });
    assertEqual(cheaper.status, 200, 'the price drops below the discount');
    assertEqual(Number(cheaper.data.item.discount_amount), 400, 'the discount is clamped to what the row is worth');
    assertEqual(Number(cheaper.data.item.total), 0, 'and the row bottoms out at zero, never below');

    // ── Refusals ──────────────────────────────────────────────────────────
    console.log('\n4. What it refuses');
    assertEqual((await setPrice(order.id, itemId, { unit_price: -5 })).status, 400, 'a negative price');
    assertEqual((await setPrice(order.id, itemId, { unit_price: 'tanto' })).status, 400, 'a price that is not a number');
    assertEqual((await setPrice(order.id, itemId, { unit_price: 99_000_000 })).status, 400, 'a price with a slipped finger');
    assertEqual((await setPrice(order.id, itemId, {})).status, 400, 'no price at all');
    assertEqual((await setPrice(order.id, 999999, { unit_price: 100 })).status, 404, 'a row that is not there');
    assertEqual((await setPrice(order.id, itemId, { unit_price: 100 }, cashierAuth)).status, 403, 'a cashier');

    await api(baseUrl, `/api/orders/${order.id}/status`, {
      method: 'PATCH', body: { status: 'completed' }, headers: authHeader,
    });
    assertEqual(
      (await setPrice(order.id, itemId, { unit_price: 900 })).status,
      400,
      'an order that is already finished',
    );

    // ── The manager PIN ───────────────────────────────────────────────────
    console.log('\n5. Gated by the same PIN as a discount');
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('discount_requires_approval', 'true', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(now());
    db.prepare("UPDATE users SET pin_hash = ? WHERE id = 'owner-test-001'").run(bcrypt.hashSync('4321', 10));

    const pinless = await setPrice(wineOrder.id, wineItemId, { unit_price: 1400 });
    assertEqual(pinless.status, 403, 'without a PIN it is refused');
    assert(pinless.data.requiresApproval === true, 'and it says a PIN is what is missing');
    assertEqual(
      (await setPrice(wineOrder.id, wineItemId, { unit_price: 1400, override_pin: '0000' })).status,
      403,
      'a wrong PIN is refused',
    );
    assertEqual(
      (await setPrice(wineOrder.id, wineItemId, { unit_price: 1400, override_pin: '4321' })).status,
      200,
      'the right PIN goes through',
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
