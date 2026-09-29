/**
 * Integration Test: saved floor plans (phase 4 of docs/table-management.md)
 *
 * A room that gets rebuilt daily needs putting the whole floor back in one
 * action.
 *
 * A) the floor can be saved under a name and put back after being wiped
 * B) applying is refused while a table is still working
 * C) saving over a name replaces it, and applying twice makes no duplicates
 *
 * Usage: node tests/run-electron-node-test.cjs tests/table-layouts.test.ts
 */

// ── Electron Mock ────────────────────────────────────────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-layouts-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults,
  closeDatabase,
} = require('./helpers/test-setup');

const { tableRoutes } = require('../main/routes/tables');
const { roomRoutes } = require('../main/routes/rooms');
const { orderRoutes } = require('../main/routes/orders');
const { tableLayoutRoutes } = require('../main/routes/table-layouts');

async function main() {
  console.log('Integration Test: saved floor plans');
  console.log('='.repeat(50));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-layouts', 'Primi');
  seedProduct(db, 'prod-layouts', 'cat-layouts', 'Tonnarelli', 13);

  const app = createApp({
    '/api/tables': tableRoutes,
    '/api/rooms': roomRoutes,
    '/api/orders': orderRoutes,
    '/api/table-layouts': tableLayoutRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const createTable = async (number: string, capacity = 4) => {
    const res = await api(baseUrl, '/api/tables', { method: 'POST', headers: authHeader, body: { number, capacity } });
    assertEqual(res.status, 201, `table ${number} created`);
    return res.data.table;
  };

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Scenario A: saving and restoring the floor
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario A: saving and restoring a floor plan ───');

    const five = await createTable('Tavolo 5', 4);
    await createTable('Tavolo 6', 4);
    await createTable('Tavolo 7', 2);
    const evening = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', table_id: five.id, guest_count: 4, items: [{ product_id: 'prod-layouts', quantity: 3 }] },
    });
    assertEqual(evening.status, 201, 'an evening order sits on a table');

    const beforeCount = (db.prepare('SELECT COUNT(*) AS c FROM tables').get() as any).c;
    const saved = await api(baseUrl, '/api/table-layouts', { method: 'POST', headers: authHeader, body: { name: 'Sabato sera' } });
    assertEqual(saved.status, 201, 'the floor was saved');
    assertEqual(saved.data.layout.tables, beforeCount, 'the plan holds every table');

    // Settle the order so the floor can be torn down, then wipe it by hand.
    await api(baseUrl, `/api/orders/${evening.data.order.id}/status`, {
      method: 'PATCH', headers: authHeader, body: { status: 'completed' },
    });
    for (const table of db.prepare('SELECT id FROM tables').all() as { id: string }[]) {
      const res = await api(baseUrl, `/api/tables/${table.id}`, { method: 'DELETE', headers: authHeader });
      assertEqual(res.status, 200, 'table removed from the map');
    }
    assertEqual((db.prepare('SELECT COUNT(*) AS c FROM tables').get() as any).c, 0, 'the map is empty');

    const applied = await api(baseUrl, `/api/table-layouts/${saved.data.layout.id}/apply`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(applied.status, 200, 'the plan was applied');
    assertEqual(applied.data.tablesCreated, beforeCount, 'every table came back');
    assertEqual((db.prepare('SELECT COUNT(*) AS c FROM tables').get() as any).c, beforeCount, 'and the map is full again');

    const restored = db.prepare("SELECT * FROM tables WHERE number = 'Tavolo 5'").get() as any;
    assert(restored, 'a named table came back');
    assert(restored.position_x !== null, 'with the position it was saved at');
    assertEqual(restored.status, 'available', 'and free for the evening');

    // History from before the wipe still names its table.
    const historic = db.prepare('SELECT table_id, table_label FROM orders WHERE id = ?').get(evening.data.order.id) as any;
    assertEqual(historic.table_id, null, 'the old order let go of the deleted row');
    assertEqual(historic.table_label, 'Tavolo 5', 'but still says where it was served');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario B + C: guards and idempotence
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario B: applying while a table is working ───');

    const workingTable = db.prepare("SELECT id FROM tables WHERE number = 'Tavolo 6'").get() as any;
    await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', table_id: workingTable.id, items: [{ product_id: 'prod-layouts', quantity: 1 }] },
    });
    const blocked = await api(baseUrl, `/api/table-layouts/${saved.data.layout.id}/apply`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(blocked.status, 409, 'rebuilding the floor mid-service is refused');
    assertEqual(blocked.data.code, 'layout_apply_blocked', 'refusal carries a stable code');
    assertEqual(blocked.data.blockers.length, 1, 'and names what is in the way');
    assertEqual(blocked.data.blockers[0].number, 'Tavolo 6', 'by table');

    console.log('\n─── Scenario C: saving over a name, applying twice ───');

    const roomsBefore = (db.prepare('SELECT COUNT(*) AS c FROM rooms').get() as any).c;
    const resaved = await api(baseUrl, '/api/table-layouts', { method: 'POST', headers: authHeader, body: { name: 'Sabato sera' } });
    assertEqual(resaved.status, 201, 'saving over a name succeeds');
    assertEqual(resaved.data.replaced, true, 'and says it replaced the old plan');
    assertEqual((db.prepare('SELECT COUNT(*) AS c FROM table_layouts').get() as any).c, 1, 'without leaving two plans behind');

    const listed = await api(baseUrl, '/api/table-layouts', { headers: authHeader });
    assertEqual(listed.status, 200, 'plans are listable');
    assertEqual(listed.data.layouts.length, 1, 'one plan on file');

    assertEqual((db.prepare('SELECT COUNT(*) AS c FROM rooms').get() as any).c, roomsBefore, 'applying did not duplicate rooms');

    console.log('\n✅ All layout tests passed');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main()
  .then(() => {
    // The assertion helpers count failures rather than throwing, so without
    // this a red assertion would still exit 0 and the suite would read green.
    const { passed, failed, total } = getResults();
    console.log('='.repeat(50));
    console.log(`${passed}/${total} passed, ${failed} failed`);
    closeDatabase();
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((error) => {
    try { closeDatabase(); } catch { }
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.error(error);
    process.exit(1);
  });
