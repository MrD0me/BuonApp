/**
 * Discount System Tests
 *
 * Verifies that:
 * 1. Discount settings exist in the database after migration v7
 * 2. PATCH /api/orders/:id/discount validates type, value, and limits
 * 3. PATCH /api/orders/:id/discount calculates discount and updates totals
 * 4. PATCH /api/orders/:id/items/:itemId/discount validates and updates item
 * 5. Returns 404 for missing order/item
 * 6. A new total ("it's 53.40, call it 50") becomes the discount that gets
 *    there, within the cover, the limits and the methods switched on, and
 *    stays the agreed euros when a row price changes afterwards
 *
 * Uses Electron runtime (via run-electron-node-test.cjs) because
 * better-sqlite3 is built for Electron's Node ABI.
 *
 * Usage: node tests/run-electron-node-test.cjs tests/discount-system.test.ts
 */

const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

// Mock electron before any imports that reference it
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-discount-test-'));
const mockApp = {
  isPackaged: true,
  getPath: (name: string) => {
    if (name === 'userData') return testDir;
    if (name === 'documents') return testDir;
    return testDir;
  },
  getVersion: () => 'test',
};

Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: mockApp };
  return originalLoad.apply(this, arguments as any);
};

const express = require('express');
const { initDatabase, getDatabase, closeDatabase, now } = require('../main/db');
const { orderRoutes } = require('../main/routes/orders');

// ── Test Helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, message: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  total++;
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack: string, needle: string, message: string) {
  total++;
  if (haystack.includes(needle)) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message} — "${haystack}" does not contain "${needle}"`);
  }
}

function assertGreaterThan(actual: number, expected: number, message: string) {
  total++;
  if (actual > expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message} — expected > ${expected}, got ${actual}`);
  }
}

async function listen(app: any): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1');
    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
}

async function request(
  baseUrl: string,
  urlPath: string,
  options: Record<string, any> = {}
): Promise<{ status: number; data: any }> {
  const response = await (globalThis as any).fetch(baseUrl + urlPath, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  return { status: response.status, data };
}

function isNativeAbiMismatch(error: any): boolean {
  return (
    error?.code === 'ERR_DLOPEN_FAILED' &&
    String(error?.message || '').includes('NODE_MODULE_VERSION')
  );
}

// ── Expected discount settings ────────────────────────────────────────────────

const EXPECTED_DISCOUNT_SETTINGS: Record<string, string> = {
  // v99 turned the old "percentage" mode into the new total plus percentage.
  discount_methods: 'total,percentage',
  discount_requires_approval: '0',
  discount_max_percentage: '25',
  discount_max_amount: '0',
};

// ── Setup ─────────────────────────────────────────────────────────────────────

function seedTestData() {
  const db = getDatabase();

  // Create a category and product for order items
  db.prepare(
    `INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)`
  ).run('cat-disc', 'Test Category', 1);
  db.prepare(
    `INSERT INTO products (id, category_id, name, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
  ).run('prod-disc', 'cat-disc', 'Test Item', 500, 1, 1);

  // Create an order with a known total (500 for 1 item)
  db.prepare(
    `INSERT INTO orders (order_number, table_id, type, status, subtotal, tax_amount, total, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('ORD-DISC-001', null, 'takeaway', 'pending', 500, 0, 500, now(), now());
  const orderId = (db.prepare('SELECT id FROM orders WHERE order_number = ?').get('ORD-DISC-001') as any).id;

  // Create order item
  db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, tax_amount, total, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(orderId, 'prod-disc', 'Test Item', 500, 1, 500, 0, 500, 'pending', now(), now());

  const itemId = (db.prepare('SELECT id FROM order_items WHERE order_id = ?').get(orderId) as any).id;

  return { orderId, itemId };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Discount System Tests');
  console.log('='.repeat(50));

  // Init database
  try {
    initDatabase();
  } catch (error: any) {
    if (isNativeAbiMismatch(error)) {
      console.log('  ⚠ Skipping: better-sqlite3 ABI mismatch (run via Electron)');
      process.exit(77); // exit code 77 = skip (GNU convention)
    }
    throw error;
  }

  const { orderId, itemId } = seedTestData();

  // Start Express server
  const app = express();
  app.use(express.json());
  // Mock auth middleware — must run before routes
  app.use((req: any, _res: any, next: any) => {
    req.user = { id: 1, role: 'owner', name: 'Test Owner' };
    next();
  });
  app.use('/api/orders', orderRoutes);
  const server = await listen(app);
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // ── Test 1: Discount settings exist in database ──────────────────────
    console.log('\n1. Discount settings exist in database');
    {
      const db = getDatabase();
      for (const [key, expectedValue] of Object.entries(EXPECTED_DISCOUNT_SETTINGS)) {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
        assert(row !== undefined, `setting "${key}" exists`);
        if (row) {
          assertEqual(row.value, expectedValue, `setting "${key}" has value "${expectedValue}"`);
        }
      }
      const legacy = db.prepare(`SELECT value FROM settings WHERE key = 'discount_mode'`).get();
      assert(legacy === undefined, 'the old discount_mode setting is gone');
    }

    // ── Test 2: Order-level percentage discount ──────────────────────────
    console.log('\n2. PATCH /api/orders/:id/discount — percentage discount');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'percentage',
          discount_value: 10,
          discount_reason: 'Happy hour',
        }),
      });
      assertEqual(res.status, 200, 'returns 200');
      assertEqual(res.data.order.discount_type, 'percentage', 'discount_type is percentage');
      assertEqual(res.data.order.discount_value, 10, 'discount_value is 10');
      assertEqual(res.data.order.discount_amount, 50, 'discount_amount is 50 (10% of 500)');
      assertEqual(res.data.order.total, 450, 'total updated to 450');
    }

    // The install default is percentage-only. Enable flat discounts for
    // the legacy flat-discount behavior checks below.
    {
      const db = getDatabase();
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('total,percentage,amount', 'discount_methods');
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('100', 'discount_max_amount');
    }

    // ── Test 3: Order-level amount discount ──────────────────────────────
    console.log('\n3. PATCH /api/orders/:id/discount — amount discount');
    {
      // Reset order to original state (clear previous discount)
      const db = getDatabase();
      db.prepare('UPDATE orders SET discount_type = NULL, discount_value = 0, discount_amount = 0, total = 500 WHERE id = ?').run(orderId);

      const res = await request(baseUrl, `/api/orders/${orderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'amount',
          discount_value: 75,
        }),
      });
      assertEqual(res.status, 200, 'returns 200');
      assertEqual(res.data.order.discount_type, 'amount', 'discount_type is amount');
      assertEqual(res.data.order.discount_value, 75, 'discount_value is 75');
      assertEqual(res.data.order.discount_amount, 75, 'discount_amount is 75');
      assertEqual(res.data.order.total, 425, 'total updated to 425');
    }

    // ── Test 4: Invalid discount type ────────────────────────────────────
    console.log('\n4. PATCH /api/orders/:id/discount — invalid type');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'invalid',
          discount_value: 10,
        }),
      });
      assertEqual(res.status, 400, 'returns 400');
      assertIncludes(res.data.error, 'discount_type', 'error mentions discount_type');
    }

    // ── Test 5: Negative discount value ──────────────────────────────────
    console.log('\n5. PATCH /api/orders/:id/discount — negative value');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'percentage',
          discount_value: -5,
        }),
      });
      assertEqual(res.status, 400, 'returns 400');
      assertIncludes(res.data.error, 'non-negative', 'error mentions non-negative');
    }

    // ── Test 6: Percentage exceeds max ───────────────────────────────────
    console.log('\n6. PATCH /api/orders/:id/discount — percentage exceeds max');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'percentage',
          discount_value: 60,
        }),
      });
      assertEqual(res.status, 400, 'returns 400');
      assertIncludes(res.data.error, 'maximum', 'error mentions maximum');
    }

    // ── Test 7: Amount exceeds max ───────────────────────────────────────
    console.log('\n7. PATCH /api/orders/:id/discount — amount exceeds max');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'amount',
          discount_value: 150,
        }),
      });
      assertEqual(res.status, 400, 'returns 400');
      assertIncludes(res.data.error, 'maximum', 'error mentions maximum');
    }

    // ── Test 8: 404 for missing order ────────────────────────────────────
    console.log('\n8. PATCH /api/orders/:id/discount — 404 for missing order');
    {
      const res = await request(baseUrl, '/api/orders/99999/discount', {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'percentage',
          discount_value: 10,
        }),
      });
      assertEqual(res.status, 404, 'returns 404');
      assertIncludes(res.data.error, 'Order not found', 'error mentions Order not found');
    }

    // ── Test 9: Item-level amount discount ───────────────────────────────
    console.log('\n9. PATCH /api/orders/:id/items/:itemId/discount — amount discount');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/items/${itemId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'amount',
          discount_value: 25,
        }),
      });
      assertEqual(res.status, 200, 'returns 200');
      assertEqual(res.data.item.discount_amount, 25, 'item discount_amount is 25');
    }

    // ── Test 10: Item-level percentage discount ──────────────────────────
    console.log('\n10. PATCH /api/orders/:id/items/:itemId/discount — percentage discount');
    {
      // Reset item to original state (clear previous discount)
      const db = getDatabase();
      db.prepare('UPDATE order_items SET discount_amount = 0, subtotal = 500, total = 500 WHERE id = ?').run(itemId);

      const res = await request(baseUrl, `/api/orders/${orderId}/items/${itemId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'percentage',
          discount_value: 10,
        }),
      });
      assertEqual(res.status, 200, 'returns 200');
      assertEqual(res.data.item.discount_amount, 50, 'item discount_amount is 50 (10% of 500)');
    }

    // ── Test 11: 404 for missing item ────────────────────────────────────
    console.log('\n11. PATCH /api/orders/:id/items/:itemId/discount — 404 for missing item');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/items/99999/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'amount',
          discount_value: 10,
        }),
      });
      assertEqual(res.status, 404, 'returns 404');
      assertIncludes(res.data.error, 'Item not found', 'error mentions Item not found');
    }

    // ── Test 12: 404 for missing order on item discount ──────────────────
    console.log('\n12. PATCH /api/orders/:id/items/:itemId/discount — 404 for missing order');
    {
      const res = await request(baseUrl, '/api/orders/99999/items/1/discount', {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'amount',
          discount_value: 10,
        }),
      });
      assertEqual(res.status, 404, 'returns 404');
      assertIncludes(res.data.error, 'Order not found', 'error mentions Order not found');
    }

    // ── Test 13: Zero discount value removes discount ────────────────────
    console.log('\n13. PATCH /api/orders/:id/discount — zero value removes discount');
    {
      const res = await request(baseUrl, `/api/orders/${orderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({
          discount_type: 'percentage',
          discount_value: 0,
        }),
      });
      assertEqual(res.status, 200, 'returns 200 (zero removes discount)');
    }

    // ── New total ─────────────────────────────────────────────────────────
    // A table of four with a cover of 2.00 a head: 30.00 + 15.40 of food and
    // 8.00 of cover make 53.40, and the table is told 50.
    const db = getDatabase();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('cover_charge_amount', '2', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(now());
    db.prepare(
      `INSERT INTO orders (order_number, table_id, type, status, guest_count, subtotal, tax_amount, cover_charge, total, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('ORD-DISC-TOT', null, 'dine_in', 'pending', 4, 45.4, 0, 8, 53.4, now(), now());
    const tableOrderId = (db.prepare('SELECT id FROM orders WHERE order_number = ?').get('ORD-DISC-TOT') as any).id;
    const insertRow = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, tax_amount, total, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertRow.run(tableOrderId, 'prod-disc', 'Pizza', 30, 1, 30, 0, 30, 'pending', now(), now());
    insertRow.run(tableOrderId, 'prod-disc', 'Vino', 15.4, 1, 15.4, 0, 15.4, 'pending', now(), now());
    const wineRowId = (db.prepare("SELECT id FROM order_items WHERE order_id = ? AND product_name = 'Vino'").get(tableOrderId) as any).id;
    const setTotal = (body: Record<string, unknown>) => request(baseUrl, `/api/orders/${tableOrderId}/discount`, {
      method: 'PATCH',
      body: JSON.stringify({ discount_type: 'total', ...body }),
    });

    console.log('\n14. PATCH /api/orders/:id/discount — new total');
    {
      const res = await setTotal({ target_total: 50, discount_reason: 'Arrotondamento' });
      assertEqual(res.status, 200, 'returns 200');
      assertEqual(res.data.order.discount_type, 'total', 'discount_type is total');
      assertEqual(res.data.order.discount_amount, 3.4, 'the discount is what gets to 50: 3.40');
      assertEqual(res.data.order.discount_value, 3.4, 'and the euros are what is kept');
      assertEqual(res.data.order.total, 50, 'total is 50');
    }

    console.log('\n15. A second rounding replaces the first');
    {
      const res = await setTotal({ target_total: 48 });
      assertEqual(res.status, 200, 'returns 200');
      assertEqual(res.data.order.discount_amount, 5.4, 'worked from 53.40, not from 50');
      assertEqual(res.data.order.total, 48, 'total is 48');
    }

    console.log('\n16. What a new total refuses');
    {
      const belowCover = await setTotal({ target_total: 7 });
      assertEqual(belowCover.status, 400, 'below the cover');
      assertIncludes(belowCover.data.error, 'cover', 'error mentions the cover');
      assertEqual((await setTotal({ target_total: 53.4 })).status, 400, 'the total as it already is');
      assertEqual((await setTotal({ target_total: 60 })).status, 400, 'a total above the check');
      assertEqual((await setTotal({ target_total: 'cinquanta' })).status, 400, 'a total that is not a number');
      assertEqual((await setTotal({ target_total: -1 })).status, 400, 'a negative total');
      assertEqual((await setTotal({})).status, 400, 'no total at all');

      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('5', 'discount_max_amount');
      const overLimit = await setTotal({ target_total: 40 });
      assertEqual(overLimit.status, 400, 'a discount over the euro limit');
      assertIncludes(overLimit.data.error, 'maximum', 'error mentions maximum');
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('100', 'discount_max_amount');

      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('percentage,amount', 'discount_methods');
      const switchedOff = await setTotal({ target_total: 45 });
      assertEqual(switchedOff.status, 400, 'the method switched off');
      assertIncludes(switchedOff.data.error, 'disabled', 'error says it is disabled');
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('total,percentage,amount', 'discount_methods');

      const unchanged = db.prepare('SELECT discount_amount, total FROM orders WHERE id = ?').get(tableOrderId) as any;
      assertEqual(unchanged.discount_amount, 5.4, 'a refusal leaves the agreed discount alone');
      assertEqual(unchanged.total, 48, 'and the total');
    }

    console.log('\n17. The agreed euros survive a row price change');
    {
      const res = await request(baseUrl, `/api/orders/${tableOrderId}/items/${wineRowId}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ unit_price: 10 }),
      });
      assertEqual(res.status, 200, 'the wine is repriced');
      const order = db.prepare('SELECT subtotal, discount_amount, total FROM orders WHERE id = ?').get(tableOrderId) as any;
      assertEqual(order.subtotal, 40, 'the food comes to 40');
      assertEqual(order.discount_amount, 5.4, 'the discount is still 5.40, not scaled down');
      assertEqual(order.total, 42.6, '40 - 5.40 + 8 of cover');
    }

    console.log('\n18. Zero takes a new-total discount off');
    {
      const res = await request(baseUrl, `/api/orders/${tableOrderId}/discount`, {
        method: 'PATCH',
        body: JSON.stringify({ discount_type: 'total', discount_value: 0 }),
      });
      assertEqual(res.status, 200, 'returns 200');
      assertEqual(res.data.order.discount_amount, 0, 'no discount left');
      assertEqual(res.data.order.discount_type, null, 'and no type');
      assertEqual(res.data.order.total, 48, 'the check is back to 40 + 8');
    }
  } finally {
    server.close();
    closeDatabase();
  }

  // Cleanup
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {}

  console.log('\n' + '='.repeat(50));
  console.log(`${passed}/${total} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
