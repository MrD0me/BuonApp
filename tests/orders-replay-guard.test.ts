/**
 * What the handheld's send queue relies on (docs/palmare.md):
 *
 * - a create replayed with its key is answered before anything is checked
 *   again, so an order whose answer was lost comes back even after one of its
 *   add-ons, or its order type, has been switched off;
 * - `only_if_table_free` refuses to open a second order on a table, names the
 *   order that is open, and writes nothing under the key;
 * - a dish the check cannot take is a 4xx with a code, never a 500;
 * - the order limiters count per account, not per address: every phone comes
 *   through the Server App from 127.0.0.1, and so does the till.
 */
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buonapp-replay-guard-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

const {
  initTestDb,
  createApp,
  startServer,
  seedOwnerUser,
  seedCategory,
  seedProduct,
  seedTable,
  api,
  assert,
  assertEqual,
  getResults,
  closeDatabase,
  now,
} = require('./helpers/test-setup');
const { orderRoutes } = require('../main/routes/orders');
const { getJWTSecret } = require('../main/routes/auth');

function seedUser(db: any, userId: string, role: string) {
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, username, password, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(userId, userId, userId, bcrypt.hashSync('testpass123', 10), role, now(), now());
  const token = jwt.sign({ userId, username: userId, role }, getJWTSecret(), { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

const count = (db: any, sql: string, ...params: unknown[]) => (db.prepare(sql).get(...params) as { n: number }).n;

async function main() {
  console.log('Order replay before validation, table guard, refusal codes, per-account limits');
  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  const waiter = seedUser(db, 'waiter-guard', 'server');
  seedCategory(db, 'cat-guard', 'Guard menu');
  seedProduct(db, 'p-pasta', 'cat-guard', 'Pasta', 10);
  seedProduct(db, 'p-wine', 'cat-guard', 'Vino', 20, { track_inventory: true, stock_quantity: 1 });
  db.prepare(`INSERT INTO addon_groups (id, name) VALUES ('ag-guard', 'Extra')`).run();
  db.prepare(`INSERT INTO addons (id, addon_group_id, name, price, is_active) VALUES ('addon-parmigiano', 'ag-guard', 'Parmigiano', 1, 1)`).run();
  db.prepare(`INSERT INTO addon_group_product (product_id, addon_group_id) VALUES ('p-pasta', 'ag-guard')`).run();
  seedTable(db, 'tav-5', 5, 4);
  seedTable(db, 'tav-6', 6, 4);

  const app = createApp({ '/api/orders': orderRoutes });
  const { baseUrl, server } = await startServer(app);
  const post = (url: string, body: unknown, headers: Record<string, string>) => api(baseUrl, url, { method: 'POST', body, headers });

  try {
    // ── 1. Replay answered before validation ──────────────────────────────
    console.log('\n1. A create replays even after its add-on is switched off');
    const withAddon = { type: 'takeaway', items: [{ product_id: 'p-pasta', quantity: 1, addons: [{ id: 'addon-parmigiano', quantity: 1 }] }] };
    const keyed = { ...waiter, 'Idempotency-Key': 'replay-first-1' };
    const first = await post('/api/orders', withAddon, keyed);
    assertEqual(first.status, 201, 'the order is created');
    const ordersBefore = count(db, 'SELECT COUNT(*) AS n FROM orders');
    db.prepare(`UPDATE addons SET is_active = 0 WHERE id = 'addon-parmigiano'`).run();
    const replay = await post('/api/orders', withAddon, keyed);
    assertEqual(replay.status, 200, 'the replay is answered with the stored order, not refused');
    assertEqual(replay.data.order?.id, first.data.order.id, 'and it is the same order');
    assertEqual(count(db, 'SELECT COUNT(*) AS n FROM orders'), ordersBefore, 'no second order is made');
    const fresh = await post('/api/orders', withAddon, { ...waiter, 'Idempotency-Key': 'replay-first-2' });
    assertEqual(fresh.status, 400, 'a new request with the switched-off add-on is refused');
    assertEqual(fresh.data.code, 'invalid_item', 'with the invalid_item code');
    db.prepare(`UPDATE addons SET is_active = 1 WHERE id = 'addon-parmigiano'`).run();

    console.log('\n2. ...and after its order type is switched off');
    const takeaway = { type: 'takeaway', items: [{ product_id: 'p-pasta', quantity: 2 }] };
    const typeKey = { ...waiter, 'Idempotency-Key': 'replay-type-1' };
    const typed = await post('/api/orders', takeaway, typeKey);
    assertEqual(typed.status, 201, 'the takeaway order is created');
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('order_types_enabled', 'dine_in')`).run();
    const typedReplay = await post('/api/orders', takeaway, typeKey);
    assertEqual(typedReplay.status, 200, 'the replay still comes back');
    assertEqual(typedReplay.data.order?.id, typed.data.order.id, 'as the same order');
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('order_types_enabled', 'dine_in,takeaway,delivery')`).run();

    console.log('\n3. The same key for a different body is a conflict with a code');
    const conflict = await post('/api/orders', { ...takeaway, items: [{ product_id: 'p-pasta', quantity: 3 }] }, typeKey);
    assertEqual(conflict.status, 409, 'a reused key with another body is refused');
    assertEqual(conflict.data.code, 'idempotency_conflict', 'with the idempotency_conflict code');

    // ── 2. The table guard ────────────────────────────────────────────────
    console.log('\n4. only_if_table_free opens a free table, and refuses an open one');
    const open = { type: 'dine_in', table_id: 'tav-5', guest_count: 2, only_if_table_free: true, items: [{ product_id: 'p-pasta', quantity: 2 }] };
    const opened = await post('/api/orders', open, { ...waiter, 'Idempotency-Key': 'guard-open-1' });
    assertEqual(opened.status, 201, 'a free table is opened');
    const ordersOnTable = () => count(db, `SELECT COUNT(*) AS n FROM orders WHERE table_id = 'tav-5'`);
    const second = await post('/api/orders', { ...open, items: [{ product_id: 'p-pasta', quantity: 1 }] }, { ...authHeader, 'Idempotency-Key': 'guard-open-2' });
    assertEqual(second.status, 409, 'the same table, now open, is refused');
    assertEqual(second.data.code, 'table_has_open_order', 'with the table_has_open_order code');
    assertEqual(second.data.order_id, opened.data.order.id, 'naming the order that is open');
    assertEqual(second.data.order_number, opened.data.order.order_number, 'and its number');
    assertEqual(ordersOnTable(), 1, 'no second order is opened on the table');
    assertEqual(count(db, `SELECT COUNT(*) AS n FROM order_idempotency WHERE idempotency_key = 'guard-open-2'`), 0, 'nothing is stored under the refused key');
    const replayOpen = await post('/api/orders', open, { ...waiter, 'Idempotency-Key': 'guard-open-1' });
    assertEqual(replayOpen.status, 200, 'the order that opened the table replays: the replay comes before the guard');
    assertEqual(replayOpen.data.order?.id, opened.data.order.id, 'as the same order');
    const appended = await post(`/api/orders/${second.data.order_id}/items`, { items: [{ product_id: 'p-pasta', quantity: 1 }] }, { ...authHeader, 'Idempotency-Key': 'guard-open-2:a' });
    assertEqual(appended.status, 200, 'the refused dishes go on as an addition to the open order');

    console.log('\n5. A table that no longer exists is refused');
    const gone = await post('/api/orders', { ...open, table_id: 'tav-gone' }, { ...waiter, 'Idempotency-Key': 'guard-gone' });
    assertEqual(gone.status, 409, 'a missing table is refused');
    assertEqual(gone.data.code, 'table_not_found', 'with the table_not_found code');

    console.log('\n6. Without the flag nothing changes');
    const tillOrder = await post('/api/orders', { type: 'dine_in', table_id: 'tav-6', items: [{ product_id: 'p-pasta', quantity: 1 }] }, authHeader);
    assertEqual(tillOrder.status, 201, 'the till opens a table as before');
    const tillAgain = await post('/api/orders', { type: 'dine_in', table_id: 'tav-6', items: [{ product_id: 'p-pasta', quantity: 1 }] }, authHeader);
    assertEqual(tillAgain.status, 201, 'and a request without the flag is not guarded');

    // ── 3. Refusals with codes ────────────────────────────────────────────
    console.log('\n7. A dish the check cannot take is a refusal with a code');
    const ordersBeforeStock = count(db, 'SELECT COUNT(*) AS n FROM orders');
    const stock = await post('/api/orders', { type: 'takeaway', items: [{ product_id: 'p-wine', quantity: 2 }] }, waiter);
    assertEqual(stock.status, 409, 'too little stock is a 409, not a 500');
    assertEqual(stock.data.code, 'insufficient_stock', 'with the insufficient_stock code');
    assertEqual(count(db, 'SELECT COUNT(*) AS n FROM orders'), ordersBeforeStock, 'and nothing is written');
    const missing = await post('/api/orders', { type: 'takeaway', items: [{ product_id: 'p-nowhere', quantity: 1 }] }, waiter);
    assert(missing.status === 400, `a dish that does not exist is a 400 (got ${missing.status})`);
    assertEqual(missing.data.code, 'invalid_item', 'with the invalid_item code');

    console.log('\n8. An order already closed refuses new dishes with a code');
    db.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).run(opened.data.order.id);
    const closed = await post(`/api/orders/${opened.data.order.id}/items`, { items: [{ product_id: 'p-pasta', quantity: 1 }] }, waiter);
    assertEqual(closed.status, 400, 'adding to a completed order is refused');
    assertEqual(closed.data.code, 'order_closed', 'with the order_closed code');
    const nowhere = await post('/api/orders/999999/items', { items: [{ product_id: 'p-pasta', quantity: 1 }] }, waiter);
    assertEqual(nowhere.status, 404, 'adding to an order that does not exist is a 404');
    assertEqual(nowhere.data.code, 'order_not_found', 'with the order_not_found code');

    // ── 4. Limits per account ─────────────────────────────────────────────
    console.log('\n9. The order write limit is counted per account, not per address');
    const busy = seedUser(db, 'waiter-busy', 'server');
    const calm = seedUser(db, 'waiter-calm', 'server');
    // The limiter answers in plain text, so these go out bare.
    const write = async (headers: Record<string, string>) => (await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ type: 'takeaway', items: [] }),
    })).status;
    let lastBusy = 0;
    for (let request = 0; request < 61; request += 1) lastBusy = await write(busy);
    assertEqual(lastBusy, 429, 'the 61st write in a minute from one account is held back');
    assertEqual(await write(calm), 400, 'another account on the same address is not');
  } finally {
    server.close();
    closeDatabase();
    try { fs.rmSync(testDir, { recursive: true }); } catch {}
  }

  const { passed, failed, total } = getResults();
  console.log(`\n${passed}/${total} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error: any) => { console.error(error); process.exit(1); });
