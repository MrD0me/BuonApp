/**
 * Kitchen-ticket rounds — only the new dishes go out
 *
 * Before `order_items.kot_batch` existed, every send re-read the whole order,
 * so adding a second round re-printed the dishes the kitchen had already
 * cooked. The batch ledger fixes that: NULL means "never sent", an integer
 * means "went out on ticket N".
 *
 * These cover the ledger helpers directly — no printer dispatch, so no network
 * or USB I/O is involved:
 *  - a fresh order offers every row as pending
 *  - claiming stamps exactly the claimed rows and numbers rounds sequentially
 *  - a second round offers only the rows added after the first send
 *  - cancelled and voided rows never reach a ticket
 *  - a failed print releases the claim so the rows queue up again, and a
 *    partial failure requeues only the station whose ticket never printed
 *  - re-printing an issued round returns that round's rows and nothing else
 *
 * Usage: node tests/run-electron-node-test.cjs tests/kot-batch-rounds.test.ts
 */

const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-kot-batch-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-kot-batch';

const {
  initTestDb, seedCategory, seedProduct,
  assert, assertEqual, getResults, closeDatabase, now,
} = require('./helpers/test-setup');
const {
  getPendingKotItems, getKotBatchItems, getLastKotBatch, claimKotBatch, releaseKotBatch, releaseKotItems,
} = require('../main/routes/printers');

let nextItemId = 1;

function seedOrder(db: any, orderNumber: string): number {
  const info = db.prepare(`
    INSERT INTO orders (order_number, type, status, subtotal, total, created_at, updated_at)
    VALUES (?, 'dine_in', 'pending', 0, 0, ?, ?)
  `).run(orderNumber, now(), now());
  return Number(info.lastInsertRowid);
}

function addItem(db: any, orderId: number, productId: string, name: string, status = 'pending'): number {
  const id = nextItemId++;
  db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, subtotal, total, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 10, 1, 10, 10, ?, ?, ?)
  `).run(id, orderId, productId, name, status, now(), now());
  return id;
}

function names(items: any[]): string[] {
  return items.map((item) => item.product_name).sort();
}

function main() {
  console.log('Kitchen-ticket rounds — only the new dishes go out');
  console.log('='.repeat(60));

  const db = initTestDb();
  seedCategory(db, 'cat-food', 'Food');
  seedProduct(db, 'prod-starter', 'cat-food', 'Starter', 800);
  seedProduct(db, 'prod-pasta', 'cat-food', 'Pasta', 1200);
  seedProduct(db, 'prod-main', 'cat-food', 'Main', 1800);
  seedProduct(db, 'prod-dessert', 'cat-food', 'Dessert', 600);

  console.log('\n─── A: a fresh order has every row waiting ───');
  const orderA = seedOrder(db, 'ORD-A');
  addItem(db, orderA, 'prod-starter', 'Starter');
  addItem(db, orderA, 'prod-pasta', 'Pasta');
  {
    assertEqual(getLastKotBatch(db, orderA), 0, 'A: no round issued yet');
    const pending = getPendingKotItems(db, orderA);
    assertEqual(pending.length, 2, 'A: both rows are pending');
    assertEqual(names(pending).join(','), 'Pasta,Starter', 'A: pending rows are the two dishes');
  }

  console.log('\n─── B: claiming stamps the claimed rows as round 1 ───');
  {
    const pending = getPendingKotItems(db, orderA);
    const batch = claimKotBatch(db, orderA, pending.map((i: any) => i.id));
    assertEqual(batch, 1, 'B: first send is round 1');
    assertEqual(getLastKotBatch(db, orderA), 1, 'B: the ledger records round 1');
    assertEqual(getPendingKotItems(db, orderA).length, 0, 'B: nothing is left pending');
  }

  console.log('\n─── C: a second round carries only what was added after ───');
  {
    addItem(db, orderA, 'prod-main', 'Main');
    const pending = getPendingKotItems(db, orderA);
    assertEqual(pending.length, 1, 'C: only the newly added dish is pending');
    assertEqual(pending[0].product_name, 'Main', 'C: the pending dish is the main course');

    const batch = claimKotBatch(db, orderA, pending.map((i: any) => i.id));
    assertEqual(batch, 2, 'C: the second send is round 2');

    const round1 = getKotBatchItems(db, orderA, 1);
    assertEqual(names(round1).join(','), 'Pasta,Starter', 'C: round 1 still holds the first two dishes');
    assert(!names(round1).includes('Main'), 'C: round 1 was not rewritten by the second send');
  }

  console.log('\n─── D: cancelled and voided rows never reach a ticket ───');
  const orderB = seedOrder(db, 'ORD-B');
  {
    addItem(db, orderB, 'prod-pasta', 'Pasta');
    addItem(db, orderB, 'prod-dessert', 'Cancelled dessert', 'cancelled');
    addItem(db, orderB, 'prod-dessert', 'Voided dessert', 'voided');
    const pending = getPendingKotItems(db, orderB);
    assertEqual(pending.length, 1, 'D: only the live row is pending');
    assertEqual(pending[0].product_name, 'Pasta', 'D: the live row is the one that goes out');
  }

  console.log('\n─── E: a failed print releases the claim ───');
  {
    const pending = getPendingKotItems(db, orderB);
    const batch = claimKotBatch(db, orderB, pending.map((i: any) => i.id));
    assertEqual(getPendingKotItems(db, orderB).length, 0, 'E: the claim removed the row from the queue');

    releaseKotBatch(db, orderB, batch);
    const requeued = getPendingKotItems(db, orderB);
    assertEqual(requeued.length, 1, 'E: releasing puts the row back so the cashier can retry');
    assertEqual(requeued[0].product_name, 'Pasta', 'E: the same dish is queued again');
    assertEqual(getLastKotBatch(db, orderB), 0, 'E: the released round number is free again');
  }

  console.log('\n─── F: claiming never renumbers rows from an earlier round ───');
  {
    const orderC = seedOrder(db, 'ORD-C');
    const first = addItem(db, orderC, 'prod-starter', 'Starter');
    claimKotBatch(db, orderC, [first]);
    const second = addItem(db, orderC, 'prod-pasta', 'Pasta');

    // Passing an already-stamped id alongside a new one must not renumber it:
    // the UPDATE is guarded on kot_batch IS NULL.
    const batch = claimKotBatch(db, orderC, [first, second]);
    assertEqual(batch, 2, 'F: the new send is round 2');
    assertEqual(getKotBatchItems(db, orderC, 1).length, 1, 'F: round 1 still has its single dish');
    assertEqual(getKotBatchItems(db, orderC, 2).length, 1, 'F: round 2 has only the new dish');
    assertEqual(getKotBatchItems(db, orderC, 2)[0].product_name, 'Pasta', 'F: round 2 carries the pasta');
  }

  console.log('\n─── G: one station failing requeues only its own rows ───');
  {
    const orderD = seedOrder(db, 'ORD-D');
    const kitchenRow = addItem(db, orderD, 'prod-pasta', 'Pasta');
    const barRow = addItem(db, orderD, 'prod-dessert', 'Coffee');
    const batch = claimKotBatch(db, orderD, [kitchenRow, barRow]);
    assertEqual(batch, 1, 'G: both rows went out on round 1');

    // The bar printer jammed; the kitchen ticket is on paper. Only the bar row
    // returns to the queue, so a re-send does not duplicate the kitchen's.
    releaseKotItems(db, [barRow]);

    const pending = getPendingKotItems(db, orderD);
    assertEqual(pending.length, 1, 'G: only the failed station row is queued again');
    assertEqual(pending[0].product_name, 'Coffee', 'G: the requeued row is the bar item');
    assertEqual(getKotBatchItems(db, orderD, 1).length, 1, 'G: the delivered row keeps its round');
    assertEqual(getKotBatchItems(db, orderD, 1)[0].product_name, 'Pasta', 'G: the kitchen row stays on round 1');
  }

  closeDatabase();

  const results = getResults();
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${results.passed}/${results.passed + results.failed} passed, ${results.failed} failed`);
  if (results.failed > 0) {
    console.log('FAILED');
    process.exit(1);
  }
  console.log('ALL PASSED');
}

main();
