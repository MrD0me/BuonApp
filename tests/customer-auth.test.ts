/**
 * Regression test for vuln-0001 (CWE-862):
 * Verifies that all customer endpoints require authentication
 * and enforce role-based access control.
 *
 * Run: npm run test:customer-auth
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const Module = require('module');
const originalLoad = Module._load;
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-customer-auth-'));

Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') {
    return {
      app: {
        isPackaged: true,
        getPath: () => testDir,
        getVersion: () => 'test',
      },
    };
  }
  return originalLoad.apply(this, arguments as any);
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
} = require('./helpers/test-setup');

const { customerRoutes } = require('../main/routes/customers');
const { getJWTSecret } = require('../main/routes/auth');

function makeToken(id: string, role: string, email: string) {
  const token = jwt.sign({ userId: id, email, role }, getJWTSecret(), { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  console.log('Customer Auth Regression Tests (vuln-0001)');
  console.log('='.repeat(60));

  const db = initTestDb();

  // Seed a customer so /:id routes have something to hit
  const custId = 'cust-auth-test-001';
  db.prepare(
    `INSERT OR IGNORE INTO customers (id, name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).run(custId, 'Auth Test Customer', '5550000001', now(), now());

  // Seed users for role checks
  const ownerAuth   = makeToken('owner-auth-001',   'owner',   'owner@auth.test');
  const managerAuth = makeToken('mgr-auth-001',     'manager', 'manager@auth.test');
  const cashierAuth = makeToken('cashier-auth-001', 'cashier', 'cashier@auth.test');
  const waiterAuth  = makeToken('server-auth-001',  'server',  'server@auth.test');
  const chefAuth    = makeToken('chef-auth-001',    'chef',    'chef@auth.test');

  const app = createApp({ '/api/customers': customerRoutes });

  console.log('\n── 1. Unauthenticated requests must return 401 ──────────────');

  const unauthCases: Array<[string, string, object?]> = [
    ['GET',    '/api/customers/'],
    ['GET',    `/api/customers/${custId}`],
    ['GET',    `/api/customers/${custId}/wallet`],
    ['POST',   '/api/customers/', { name: 'Attacker', phone: '5559999999' }],
    ['PUT',    `/api/customers/${custId}`, { name: 'Modified' }],
    ['DELETE', `/api/customers/${custId}`],
    ['DELETE', '/api/customers/admin/cleanup'],
  ];

  for (const [method, url, body] of unauthCases) {
    const req = request(app)[method.toLowerCase()](url).set('Content-Type', 'application/json');
    if (body) req.send(body);
    const res = await req;
    assertEqual(res.status, 401, `No token → ${method} ${url} returns 401`);
  }

  console.log('\n── 2. Read endpoints: cashier + server allowed ──────────────');

  for (const [label, auth] of [['cashier', cashierAuth], ['server', waiterAuth]]) {
    const listRes = await request(app).get('/api/customers/').set(auth as any);
    assertEqual(listRes.status, 200, `${label} can GET /api/customers/`);

    const getRes = await request(app).get(`/api/customers/${custId}`).set(auth as any);
    assertEqual(getRes.status, 200, `${label} can GET /api/customers/:id`);

    const walletRes = await request(app).get(`/api/customers/${custId}/wallet`).set(auth as any);
    assertEqual(walletRes.status, 200, `${label} can GET /api/customers/:id/wallet`);
  }

  console.log('\n── 3. Write endpoints: server cannot PUT ──');

  const waiterPutRes = await request(app)
    .put(`/api/customers/${custId}`)
    .set(waiterAuth as any)
    .send({ name: 'Modified' });
  assertEqual(waiterPutRes.status, 403, 'server cannot PUT /api/customers/:id');

  console.log('\n── 4. Write endpoints: cashier, manager + owner allowed to PUT ──');

  // Cashiers can correct a customer's name/phone from the POS (e.g. a typo
  // caught at checkout), but erasing one is owner/manager work — see 4b below.
  for (const [label, auth] of [['cashier', cashierAuth], ['manager', managerAuth], ['owner', ownerAuth]]) {
    const putRes = await request(app)
      .put(`/api/customers/${custId}`)
      .set(auth as any)
      .send({ name: `Modified by ${label}` });
    assertEqual(putRes.status, 200, `${label} can PUT /api/customers/:id`);
  }

  console.log('\n── 4b. Deleting a customer: owner/manager only, and it erases ──');

  // A guest who asks to be forgotten has to actually be gone: `is_active = 0`
  // was never a delete, since the phone lookup that de-duplicates the book
  // ignores the flag and walks an "archived" guest straight back in. What the
  // delete must not touch is the money — orders and bills keep every amount
  // and only lose the name attached to them.
  db.prepare(
    `INSERT INTO orders (order_number, customer_id, type, status, total, created_at, updated_at)
     VALUES (?, ?, 'takeaway', 'completed', 42.5, ?, ?)`
  ).run('ORD-DEL-001', custId, now(), now());
  db.prepare(
    `INSERT INTO loyalty_ledger (customer_id, type, amount, description, created_at, updated_at)
     VALUES (?, 'credit', 10, 'test credit', ?, ?)`
  ).run(custId, now(), now());

  for (const [label, auth] of [['server', waiterAuth], ['cashier', cashierAuth]]) {
    const res = await request(app).delete(`/api/customers/${custId}`).set(auth as any);
    assertEqual(res.status, 403, `${label} cannot DELETE /api/customers/:id`);
  }

  const ownerDeleteRes = await request(app).delete(`/api/customers/${custId}`).set(ownerAuth);
  assertEqual(ownerDeleteRes.status, 200, 'owner can DELETE /api/customers/:id');

  const gone = db.prepare('SELECT id FROM customers WHERE id = ?').get(custId) as any;
  assertEqual(gone, undefined, 'customer row is really gone, not just flagged inactive');

  const detached = db.prepare('SELECT customer_id, total FROM orders WHERE order_number = ?').get('ORD-DEL-001') as any;
  assertEqual(detached.customer_id, null, 'the order keeps standing, detached from the deleted customer');
  assertEqual(detached.total, 42.5, 'the order keeps its amount, so the takings are untouched');

  const ledgerLeft = db.prepare('SELECT COUNT(*) AS count FROM loyalty_ledger WHERE customer_id = ?').get(custId) as any;
  assertEqual(ledgerLeft.count, 0, 'the loyalty ledger goes with the customer it belonged to');

  const missingDelete = await request(app).delete('/api/customers/no-such-customer').set(ownerAuth);
  assertEqual(missingDelete.status, 404, 'deleting a customer that does not exist returns 404');

  console.log('\n── 5. Admin cleanup: owner only ─────────────────────────────');

  const managerCleanup = await request(app).delete('/api/customers/admin/cleanup').set(managerAuth);
  assertEqual(managerCleanup.status, 403, 'manager cannot DELETE /api/customers/admin/cleanup');

  const ownerCleanup = await request(app).delete('/api/customers/admin/cleanup').set(ownerAuth);
  assertEqual(ownerCleanup.status, 200, 'owner can DELETE /api/customers/admin/cleanup');

  console.log('\n── 6. Chef (kitchen-only role) cannot access customers ───────');

  const chefList = await request(app).get('/api/customers/').set(chefAuth);
  assertEqual(chefList.status, 403, 'chef cannot GET /api/customers/');

  console.log('\n── 7. Customer book switched off: nothing new gets written ──');

  // A business that keeps no customer book must not gain one by the side door
  // — the waiter app files a ticket under a guest, and that call has to be
  // refused at the API, not just hidden in the UI. Reads stay open so orders
  // linked back when the book was on still show who they belong to.
  const bookOffCustId = 'cust-book-off-001';
  db.prepare(
    `INSERT INTO customers (id, name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).run(bookOffCustId, 'Book Off Customer', '5550000002', now(), now());
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('customers_enabled', 'false', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(now());

  const bookOffPost = await request(app)
    .post('/api/customers/')
    .set(ownerAuth)
    .send({ name: 'Walk In', phone: '5551230000' });
  assertEqual(bookOffPost.status, 403, 'POST /api/customers is refused while the book is off');
  assertEqual(bookOffPost.body.code, 'customers_disabled', 'the refusal names the reason');

  const bookOffPut = await request(app)
    .put(`/api/customers/${bookOffCustId}`)
    .set(ownerAuth)
    .send({ name: 'Renamed' });
  assertEqual(bookOffPut.status, 403, 'PUT /api/customers/:id is refused while the book is off');

  const bookOffList = await request(app).get('/api/customers/').set(ownerAuth);
  assertEqual(bookOffList.status, 200, 'reads stay open while the book is off');

  const bookOffDelete = await request(app).delete(`/api/customers/${bookOffCustId}`).set(ownerAuth);
  assertEqual(bookOffDelete.status, 200, 'erasing a customer still works while the book is off');

  db.prepare("UPDATE settings SET value = 'true' WHERE key = 'customers_enabled'").run();

  const results = getResults();
  console.log(`\nResults: ${results.passed}/${results.total} passed`);
  if (results.failed > 0) {
    throw new Error(`${results.failed} customer auth assertion(s) failed`);
  }
}

main()
  .then(() => {
    closeDatabase();
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('\n✅ Customer auth tests passed');
  })
  .catch((error) => {
    try { closeDatabase(); } catch { }
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.error(error);
    process.exit(1);
  });
