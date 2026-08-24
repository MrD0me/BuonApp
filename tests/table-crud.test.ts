/**
 * Integration Test: Table CRUD (phase 1 of docs/table-management.md)
 *
 * The dining room is rebuilt every day here, so tables must be editable and
 * genuinely deletable — which migration v20 had ruled out, because hard
 * deletes orphaned orders.table_id. Orders now carry their own
 * table_label/room_label snapshot, and these scenarios pin down that contract:
 *
 * A) PUT /tables/:id edits a table and can CLEAR an optional field
 *    (the old COALESCE(?, col) form silently ignored every null)
 * B) Renaming retags live orders; closed orders keep the label they were
 *    served under
 * C) DELETE is refused while an order is open on the table
 * D) DELETE is refused while a held cart sits on the table
 * E) DELETE succeeds otherwise, and history still names the table afterwards
 * F) DELETE backfills the label on history that predates the snapshot columns
 *
 * Usage: node tests/run-electron-node-test.cjs tests/table-crud.test.ts
 */

// ── Electron Mock ────────────────────────────────────────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-table-crud-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  closeDatabase, now,
} = require('./helpers/test-setup');

const { tableRoutes } = require('../main/routes/tables');
const { orderRoutes } = require('../main/routes/orders');

async function main() {
  console.log('Integration Test: Table CRUD');
  console.log('='.repeat(50));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-tables', 'Primi');
  seedProduct(db, 'prod-tables', 'cat-tables', 'Carbonara', 12);

  const app = createApp({
    '/api/tables': tableRoutes,
    '/api/orders': orderRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const createTable = async (payload: Record<string, unknown>) => {
    const res = await api(baseUrl, '/api/tables', { method: 'POST', headers: authHeader, body: payload });
    assertEqual(res.status, 201, `table ${payload.number} created`);
    return res.data.table;
  };

  const openOrder = async (tableId: string) => {
    const res = await api(baseUrl, '/api/orders', {
      method: 'POST',
      headers: authHeader,
      body: { type: 'dine_in', table_id: tableId, items: [{ product_id: 'prod-tables', quantity: 1 }] },
    });
    assertEqual(res.status, 201, 'dine-in order created');
    return res.data.order.id;
  };

  const labelsOf = (orderId: number) =>
    db.prepare('SELECT table_id, table_label, room_label FROM orders WHERE id = ?').get(orderId);

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Scenario A: editing a table, including clearing an optional field
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario A: PUT /tables/:id edits and clears ───');

    const edited = await createTable({ number: 'Tavolo 1', capacity: 4, floor: 'Sala Interna', section: 'Finestra' });

    const editRes = await api(baseUrl, `/api/tables/${edited.id}`, {
      method: 'PUT',
      headers: authHeader,
      body: { name: 'Tavolo 1 bis', capacity: 6, floor: 'Dehors' },
    });
    assertEqual(editRes.status, 200, 'PUT returns 200');
    assertEqual(editRes.data.table.number, 'Tavolo 1 bis', 'table number updated');
    assertEqual(editRes.data.table.name, 'Tavolo 1 bis', 'response carries the frontend `name` alias');
    assertEqual(editRes.data.table.capacity, 6, 'capacity updated');
    assertEqual(editRes.data.table.floor, 'Dehors', 'floor updated');
    assertEqual(editRes.data.table.section, 'Finestra', 'untouched field left alone');

    const clearRes = await api(baseUrl, `/api/tables/${edited.id}`, {
      method: 'PUT',
      headers: authHeader,
      body: { section: '' },
    });
    assertEqual(clearRes.status, 200, 'clearing PUT returns 200');
    assertEqual(clearRes.data.table.section, null, 'section can be cleared (COALESCE regression)');
    assertEqual(clearRes.data.table.number, 'Tavolo 1 bis', 'clearing one field does not disturb the others');

    const badCapacity = await api(baseUrl, `/api/tables/${edited.id}`, {
      method: 'PUT',
      headers: authHeader,
      body: { capacity: 0 },
    });
    assertEqual(badCapacity.status, 400, 'capacity below 1 is rejected');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario B: renames retag live orders only
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario B: rename retags live orders, not closed ones ───');

    const renamed = await createTable({ number: 'Tavolo 2', capacity: 2, floor: 'Sala Interna' });
    const liveOrderId = await openOrder(renamed.id);

    const stamped = labelsOf(liveOrderId);
    assertEqual(stamped.table_label, 'Tavolo 2', 'order stamped with the table label at creation');
    assertEqual(stamped.room_label, 'Sala Interna', 'order stamped with the room label at creation');

    await api(baseUrl, `/api/tables/${renamed.id}`, {
      method: 'PUT',
      headers: authHeader,
      body: { name: 'Tavolo 2 unito', floor: 'Dehors' },
    });
    const afterRename = labelsOf(liveOrderId);
    assertEqual(afterRename.table_label, 'Tavolo 2 unito', 'open order follows the rename');
    assertEqual(afterRename.room_label, 'Dehors', 'open order follows the room change');

    const closeRes = await api(baseUrl, `/api/orders/${liveOrderId}/status`, {
      method: 'PATCH',
      headers: authHeader,
      body: { status: 'completed' },
    });
    assertEqual(closeRes.status, 200, 'order completed');

    await api(baseUrl, `/api/tables/${renamed.id}`, {
      method: 'PUT',
      headers: authHeader,
      body: { name: 'Tavolo 2 sera' },
    });
    const afterClose = labelsOf(liveOrderId);
    assertEqual(afterClose.table_label, 'Tavolo 2 unito', 'closed order keeps the label it was served under');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario C: deletion refused while an order is open
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario C: DELETE blocked by an open order ───');

    const busy = await createTable({ number: 'Tavolo 3', capacity: 4, floor: 'Sala Interna' });
    const busyOrderId = await openOrder(busy.id);

    const blockedRes = await api(baseUrl, `/api/tables/${busy.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(blockedRes.status, 409, 'DELETE refused with 409');
    assertEqual(blockedRes.data.code, 'table_has_open_order', 'conflict carries a stable code for the UI');
    assert(db.prepare('SELECT id FROM tables WHERE id = ?').get(busy.id), 'table survived the refused delete');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario D: deletion refused while a held cart sits on the table
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario D: DELETE blocked by a held cart ───');

    const held = await createTable({ number: 'Tavolo 4', capacity: 4, floor: 'Sala Interna' });
    db.prepare(`
      INSERT INTO held_orders (id, table_id, items, guest_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('held-tbl-4', held.id, '[]', 2, now(), now());

    const heldRes = await api(baseUrl, `/api/tables/${held.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(heldRes.status, 409, 'DELETE refused with 409');
    assertEqual(heldRes.data.code, 'table_has_held_cart', 'held-cart conflict carries its own code');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario E: deletion succeeds, history keeps naming the table
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario E: DELETE succeeds and history survives ───');

    await api(baseUrl, `/api/orders/${busyOrderId}/status`, {
      method: 'PATCH',
      headers: authHeader,
      body: { status: 'completed' },
    });

    const deleteRes = await api(baseUrl, `/api/tables/${busy.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(deleteRes.status, 200, 'DELETE succeeds once nothing live points at the table');
    assertEqual(deleteRes.data.deleted.name, 'Tavolo 3', 'response names what was deleted');
    assertEqual(db.prepare('SELECT id FROM tables WHERE id = ?').get(busy.id), undefined, 'table row is gone');

    const orphaned = labelsOf(busyOrderId);
    assertEqual(orphaned.table_id, null, 'order link released');
    assertEqual(orphaned.table_label, 'Tavolo 3', 'order still names its table');
    assertEqual(orphaned.room_label, 'Sala Interna', 'order still names its room');

    const historyRes = await api(baseUrl, `/api/orders/${busyOrderId}`, { headers: authHeader });
    assertEqual(historyRes.status, 200, 'order still readable');
    assertEqual(historyRes.data.order.table.name, 'Tavolo 3', 'GET /orders/:id resolves the table from the snapshot');
    assertEqual(historyRes.data.order.table.is_deleted, true, 'snapshot-resolved tables are flagged as deleted');

    const listRes = await api(baseUrl, '/api/tables', { headers: authHeader });
    assert(!listRes.data.tables.some((t: any) => t.id === busy.id), 'deleted table no longer listed');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario F: history predating the snapshot columns is backfilled
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario F: DELETE backfills pre-snapshot history ───');

    const legacy = await createTable({ number: 'Tavolo 9', capacity: 4, floor: 'Sala Vecchia' });
    db.prepare(`
      INSERT INTO orders (order_number, table_id, type, status, created_at, updated_at)
      VALUES (?, ?, 'dine_in', 'completed', ?, ?)
    `).run('ORD-LEGACY-9', legacy.id, now(), now());
    const legacyOrderId = (db.prepare('SELECT id FROM orders WHERE order_number = ?').get('ORD-LEGACY-9') as any).id;
    assertEqual(labelsOf(legacyOrderId).table_label, null, 'legacy order starts with no label');

    const legacyDelete = await api(baseUrl, `/api/tables/${legacy.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(legacyDelete.status, 200, 'legacy table deleted');
    const backfilled = labelsOf(legacyOrderId);
    assertEqual(backfilled.table_label, 'Tavolo 9', 'label backfilled before the link was cut');
    assertEqual(backfilled.room_label, 'Sala Vecchia', 'room label backfilled too');

    console.log('\n✅ All table CRUD tests passed');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main()
  .then(() => {
    closeDatabase();
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
  })
  .catch((error) => {
    try { closeDatabase(); } catch { }
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.error(error);
    process.exit(1);
  });
