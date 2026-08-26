/**
 * Integration Test: joined tables and saved floor plans (phase 4 of
 * docs/table-management.md)
 *
 * Two things a room that gets rebuilt daily needs: pushing tables together for
 * one party, and putting the whole floor back in one action.
 *
 * A) tables fold into a leader, which is where the order lives
 * B) a group offers the seats of everyone in it
 * C) a table that is working, booked, or already grouped refuses to be folded in
 * D) an order cannot be placed on a table that has been folded into another
 * E) splitting works from the leader or from any member
 * F) deleting a leader releases its members instead of stranding them
 * G) the floor can be saved under a name and put back after being wiped
 * H) applying is refused while a table is still working
 * I) saving over a name replaces it, and applying twice makes no duplicates
 *
 * Usage: node tests/run-electron-node-test.cjs tests/table-merge-layouts.test.ts
 */

// ── Electron Mock ────────────────────────────────────────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-merge-layouts-'));
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
  console.log('Integration Test: joined tables and saved floor plans');
  console.log('='.repeat(50));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-merge', 'Primi');
  seedProduct(db, 'prod-merge', 'cat-merge', 'Tonnarelli', 13);

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
  const row = (id: string) => db.prepare('SELECT * FROM tables WHERE id = ?').get(id) as any;
  const merge = (leaderId: string, tableIds: string[]) =>
    api(baseUrl, `/api/tables/${leaderId}/merge`, { method: 'POST', headers: authHeader, body: { table_ids: tableIds } });

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Scenario A + B: folding tables together
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario A: joining tables ───');

    const five = await createTable('Tavolo 5', 4);
    const six = await createTable('Tavolo 6', 4);
    const seven = await createTable('Tavolo 7', 2);

    const joined = await merge(five.id, [six.id]);
    assertEqual(joined.status, 200, 'tables joined');
    assertEqual(joined.data.merged, 1, 'one table was folded in');
    assertEqual(row(six.id).merged_into, five.id, 'the member points at the leader');
    assertEqual(row(five.id).merged_into, null, 'the leader keeps its own identity');
    assertEqual(row(six.id).status, 'held', 'a folded table is not separately available');

    console.log('\n─── Scenario B: a group offers combined seats ───');
    assertEqual(joined.data.group_capacity, 8, 'four plus four');

    const grown = await merge(five.id, [seven.id]);
    assertEqual(grown.status, 200, 'a third table joins the group');
    assertEqual(grown.data.group_capacity, 10, 'and its seats count too');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario C: what refuses to be folded in
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario C: refusals ───');

    const booked = await createTable('Tavolo 8');
    await api(baseUrl, `/api/tables/${booked.id}/reserve`, { method: 'POST', headers: authHeader, body: { name: 'Rossi', guests: 2 } });
    const spare = await createTable('Tavolo 9');
    const bookedMerge = await merge(spare.id, [booked.id]);
    assertEqual(bookedMerge.status, 409, 'a booked table refuses to be folded in');
    assertEqual(bookedMerge.data.code, 'table_has_reservation', 'refusal carries a stable code');
    assert(bookedMerge.data.error.includes('Tavolo 8'), 'refusal names the table in the way');

    const alreadyIn = await merge(spare.id, [six.id]);
    assertEqual(alreadyIn.status, 409, 'a table already in a group refuses');
    assertEqual(alreadyIn.data.code, 'table_already_merged', 'refusal carries a stable code');

    const leaderMerge = await merge(spare.id, [five.id]);
    assertEqual(leaderMerge.status, 409, 'a table leading a group refuses');
    assertEqual(leaderMerge.data.code, 'table_leads_group', 'refusal carries a stable code');

    const nothing = await merge(spare.id, []);
    assertEqual(nothing.status, 400, 'merging nothing is refused');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario D: orders belong to the leader
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario D: an order on a folded table ───');

    const onMember = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', table_id: six.id, items: [{ product_id: 'prod-merge', quantity: 1 }] },
    });
    assertEqual(onMember.status, 409, 'ordering on a folded table is refused');
    assertEqual(onMember.data.code, 'table_is_merged', 'refusal carries a stable code');
    assertEqual(onMember.data.leader_table_id, five.id, 'and points at the table to use instead');

    const onLeader = await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', table_id: five.id, guest_count: 9, items: [{ product_id: 'prod-merge', quantity: 3 }] },
    });
    assertEqual(onLeader.status, 201, 'the leader takes the order');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario E: breaking a group up
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario E: splitting ───');

    const fromMember = await api(baseUrl, `/api/tables/${six.id}/split`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(fromMember.status, 200, 'splitting works from a member');
    assertEqual(fromMember.data.released, 2, 'the whole group was released');
    assertEqual(row(six.id).merged_into, null, 'the member is free');
    assertEqual(row(six.id).status, 'available', 'and available again');
    assertEqual(row(seven.id).merged_into, null, 'so is the other one');

    const notGrouped = await api(baseUrl, `/api/tables/${six.id}/split`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(notGrouped.status, 400, 'splitting a lone table is refused');
    assertEqual(notGrouped.data.code, 'not_merged', 'refusal carries a stable code');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario F: deleting a leader
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario F: deleting a leader ───');

    const leadA = await createTable('Tavolo 10');
    const leadB = await createTable('Tavolo 11');
    await merge(leadA.id, [leadB.id]);
    const deleted = await api(baseUrl, `/api/tables/${leadA.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(deleted.status, 200, 'the leader was deleted');
    assertEqual(row(leadB.id).merged_into, null, 'its member was released, not stranded');
    assertEqual(row(leadB.id).status, 'available', 'and is usable again');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario G: saving and restoring the floor
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario G: saving and restoring a floor plan ───');

    const beforeCount = (db.prepare('SELECT COUNT(*) AS c FROM tables').get() as any).c;
    const saved = await api(baseUrl, '/api/table-layouts', { method: 'POST', headers: authHeader, body: { name: 'Sabato sera' } });
    assertEqual(saved.status, 201, 'the floor was saved');
    assertEqual(saved.data.layout.tables, beforeCount, 'the plan holds every table');

    // Settle the order so the floor can be torn down, then wipe it by hand.
    await api(baseUrl, `/api/orders/${onLeader.data.order.id}/status`, {
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
    assertEqual(restored.merged_into, null, 'and no leftover grouping');

    // History from before the wipe still names its table.
    const historic = db.prepare('SELECT table_id, table_label FROM orders WHERE id = ?').get(onLeader.data.order.id) as any;
    assertEqual(historic.table_id, null, 'the old order let go of the deleted row');
    assertEqual(historic.table_label, 'Tavolo 5', 'but still says where it was served');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario H + I: guards and idempotence
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario H: applying while a table is working ───');

    const workingTable = db.prepare("SELECT id FROM tables WHERE number = 'Tavolo 6'").get() as any;
    await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', table_id: workingTable.id, items: [{ product_id: 'prod-merge', quantity: 1 }] },
    });
    const blocked = await api(baseUrl, `/api/table-layouts/${saved.data.layout.id}/apply`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(blocked.status, 409, 'rebuilding the floor mid-service is refused');
    assertEqual(blocked.data.code, 'layout_apply_blocked', 'refusal carries a stable code');
    assertEqual(blocked.data.blockers.length, 1, 'and names what is in the way');
    assertEqual(blocked.data.blockers[0].number, 'Tavolo 6', 'by table');

    console.log('\n─── Scenario I: saving over a name, applying twice ───');

    const roomsBefore = (db.prepare('SELECT COUNT(*) AS c FROM rooms').get() as any).c;
    const resaved = await api(baseUrl, '/api/table-layouts', { method: 'POST', headers: authHeader, body: { name: 'Sabato sera' } });
    assertEqual(resaved.status, 201, 'saving over a name succeeds');
    assertEqual(resaved.data.replaced, true, 'and says it replaced the old plan');
    assertEqual((db.prepare('SELECT COUNT(*) AS c FROM table_layouts').get() as any).c, 1, 'without leaving two plans behind');

    const listed = await api(baseUrl, '/api/table-layouts', { headers: authHeader });
    assertEqual(listed.status, 200, 'plans are listable');
    assertEqual(listed.data.layouts.length, 1, 'one plan on file');

    assertEqual((db.prepare('SELECT COUNT(*) AS c FROM rooms').get() as any).c, roomsBefore, 'applying did not duplicate rooms');

    console.log('\n✅ All merge and layout tests passed');
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
