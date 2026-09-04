/**
 * Integration Test: Service days (phase 3 of docs/table-management.md)
 *
 * A restaurant's day is not the UTC date — a service running past midnight is
 * one evening. Orders are therefore filed against an explicit business day, and
 * the close is a ritual that refuses to run while anything is unsettled, freezes
 * the totals, and resets the floor.
 *
 * A) placing an order with no day running opens one and stamps the order
 * B) GET /service-days/current reports the live day, its totals and blockers
 * C) close is refused while an order is open, naming what blocks it
 * D) force-close is owner-only and needs a reason
 * E) a clean close freezes the summary, clears held carts and frees tables
 * F) closing with clear_tables wipes the map without losing history
 * G) only one day may be open at a time
 * H) reopening drops the frozen summary so totals go live again
 * I) orders placed after a close land in a new day
 * J) the closing report renders from the frozen summary
 * K) migration v74 files pre-existing orders into backfilled days
 *
 * Usage: node tests/run-electron-node-test.cjs tests/service-days.test.ts
 */

// ── Electron Mock ────────────────────────────────────────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-service-days-'));
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  return originalLoad.apply(this, arguments as any);
};

const {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedManagerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults,
  closeDatabase, now,
} = require('./helpers/test-setup');

const { tableRoutes } = require('../main/routes/tables');
const { roomRoutes } = require('../main/routes/rooms');
const { orderRoutes } = require('../main/routes/orders');
const { serviceDayRoutes } = require('../main/routes/service-days');
const { MIGRATIONS } = require('../main/db');

async function main() {
  console.log('Integration Test: Service days');
  console.log('='.repeat(50));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  const { authHeader: managerHeader } = seedManagerUser(db);
  seedCategory(db, 'cat-days', 'Primi');
  seedProduct(db, 'prod-days', 'cat-days', 'Amatriciana', 10);

  const app = createApp({
    '/api/tables': tableRoutes,
    '/api/rooms': roomRoutes,
    '/api/orders': orderRoutes,
    '/api/service-days': serviceDayRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  // Rooms replaced the free-text `floor` in phase 2; the order labels read the
  // room's name, so the suite needs a real one.
  let roomId = '';
  const createTable = async (number: string) => {
    if (!roomId) {
      const room = await api(baseUrl, '/api/rooms', { method: 'POST', headers: authHeader, body: { name: 'Sala Interna' } });
      assertEqual(room.status, 201, 'room Sala Interna created');
      roomId = room.data.room.id;
    }
    const res = await api(baseUrl, '/api/tables', {
      method: 'POST', headers: authHeader, body: { number, capacity: 4, room_id: roomId },
    });
    assertEqual(res.status, 201, `table ${number} created`);
    return res.data.table;
  };

  const placeOrder = async (tableId: string | null, guests = 2) => {
    const res = await api(baseUrl, '/api/orders', {
      method: 'POST',
      headers: authHeader,
      body: {
        type: tableId ? 'dine_in' : 'takeaway',
        table_id: tableId,
        guest_count: guests,
        items: [{ product_id: 'prod-days', quantity: 2 }],
      },
    });
    assertEqual(res.status, 201, 'order created');
    return res.data.order.id;
  };

  const completeOrder = async (orderId: number) => {
    const res = await api(baseUrl, `/api/orders/${orderId}/status`, {
      method: 'PATCH', headers: authHeader, body: { status: 'completed' },
    });
    assertEqual(res.status, 200, `order ${orderId} completed`);
  };

  const payBill = (orderId: number, billNumber: string, amount: number, method = 'cash') => {
    db.prepare(`
      INSERT INTO bills (bill_number, order_id, subtotal, total, paid_amount, balance, payment_status, payment_details, paid_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 'paid', ?, ?, ?, ?)
    `).run(billNumber, orderId, amount, amount, amount,
      JSON.stringify([{ method, amount }]), now(), now(), now());
  };

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Scenario A: an order with no day running opens one
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario A: first order opens the day ───');

    assertEqual(db.prepare('SELECT COUNT(*) AS c FROM service_days').get().c, 0, 'no day exists yet');

    const tableOne = await createTable('Tavolo 1');
    const firstOrderId = await placeOrder(tableOne.id, 4);

    const days = db.prepare('SELECT * FROM service_days').all();
    assertEqual(days.length, 1, 'placing an order opened exactly one day');
    assertEqual(days[0].status, 'open', 'the day is open');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(days[0].business_date), `business_date is a calendar date: ${days[0].business_date}`);

    const dayId = days[0].id;
    assertEqual(
      db.prepare('SELECT service_day_id FROM orders WHERE id = ?').get(firstOrderId).service_day_id,
      dayId,
      'order stamped with the open day',
    );

    const secondOrderId = await placeOrder(null, 1);
    assertEqual(db.prepare('SELECT COUNT(*) AS c FROM service_days').get().c, 1, 'a second order reuses the same day');
    assertEqual(
      db.prepare('SELECT service_day_id FROM orders WHERE id = ?').get(secondOrderId).service_day_id,
      dayId,
      'takeaway order filed under the same day',
    );

    // ═══════════════════════════════════════════════════════════════════
    // Scenario B: the live view
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario B: GET /service-days/current ───');

    const currentRes = await api(baseUrl, '/api/service-days/current', { headers: authHeader });
    assertEqual(currentRes.status, 200, 'current day readable');
    assertEqual(currentRes.data.day.id, dayId, 'reports the open day');
    assertEqual(currentRes.data.summary.orders.total, 2, 'live summary counts both orders');
    assertEqual(currentRes.data.summary.covers, 5, 'covers summed across orders');
    assertEqual(currentRes.data.blockers.openOrders.length, 2, 'both orders block the close');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario C: close refused while orders are open
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario C: close blocked by open orders ───');

    const blockedRes = await api(baseUrl, `/api/service-days/${dayId}/close`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(blockedRes.status, 409, 'close refused with 409');
    assertEqual(blockedRes.data.code, 'service_day_has_blockers', 'refusal carries a stable code');
    assertEqual(blockedRes.data.blockers.openOrders.length, 2, 'refusal names the open orders');
    assertEqual(db.prepare('SELECT status FROM service_days WHERE id = ?').get(dayId).status, 'open', 'day still open');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario D: forcing is owner-only and needs a reason
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario D: force-close guards ───');

    const managerForce = await api(baseUrl, `/api/service-days/${dayId}/close`, {
      method: 'POST', headers: managerHeader, body: { force: true, reason: 'chiusura anticipata' },
    });
    assertEqual(managerForce.status, 403, 'manager cannot force a close');
    assertEqual(managerForce.data.code, 'force_close_requires_owner', 'refusal explains the role requirement');

    const noReason = await api(baseUrl, `/api/service-days/${dayId}/close`, {
      method: 'POST', headers: authHeader, body: { force: true },
    });
    assertEqual(noReason.status, 400, 'forcing without a reason is rejected');
    assertEqual(noReason.data.code, 'force_close_requires_reason', 'refusal explains the missing reason');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario E: a clean close freezes and resets
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario E: clean close ───');

    await completeOrder(firstOrderId);
    await completeOrder(secondOrderId);
    payBill(firstOrderId, 'BILL-D-1', 20, 'cash');
    payBill(secondOrderId, 'BILL-D-2', 20, 'card');

    db.prepare(`
      INSERT INTO held_orders (id, table_id, items, guest_count, created_at, updated_at)
      VALUES (?, ?, '[]', 2, ?, ?)
    `).run('held-day-1', tableOne.id, now(), now());
    db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(tableOne.id);

    const closeRes = await api(baseUrl, `/api/service-days/${dayId}/close`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(closeRes.status, 200, 'close succeeds once everything is settled');
    assertEqual(closeRes.data.day.status, 'closed', 'day marked closed');
    assert(closeRes.data.day.closed_at, 'closed_at stamped');
    assertEqual(closeRes.data.heldCartsCleared, 1, 'held carts cleared');
    assertEqual(closeRes.data.summary.takings.total, 40, 'takings summed across bills');
    assertEqual(closeRes.data.summary.takings.byMethod.length, 2, 'takings split by payment method');
    assertEqual(closeRes.data.summary.topProducts[0].quantity, 4, 'top products counted across the day');
    assertEqual(closeRes.data.tablesCleared, 0, 'map kept when clear_tables is not asked for');

    assertEqual(db.prepare('SELECT status FROM tables WHERE id = ?').get(tableOne.id).status, 'available', 'tables freed');
    assertEqual(db.prepare('SELECT COUNT(*) AS c FROM held_orders').get().c, 0, 'held carts gone');

    // The frozen summary must survive later edits to the underlying rows.
    db.prepare("UPDATE bills SET paid_amount = 999 WHERE bill_number = 'BILL-D-1'").run();
    const frozenRes = await api(baseUrl, `/api/service-days/${dayId}`, { headers: authHeader });
    assertEqual(frozenRes.status, 200, 'closed day readable');
    assertEqual(frozenRes.data.summary.takings.total, 40, 'closed day reports the frozen total, not the edited rows');
    assertEqual(frozenRes.data.orders.length, 2, 'closed day lists its orders');
    // The archive opens each order to show what was served, so the rows have to
    // carry their items — and the note with them, since an off-menu dish is a
    // generic line plus whatever the waiter wrote.
    const archivedItems = frozenRes.data.orders[0].items;
    assert(Array.isArray(archivedItems) && archivedItems.length > 0, 'archived orders carry their items');
    assert('product_name' in archivedItems[0], 'each item says what it was');
    assert('special_instructions' in archivedItems[0], 'each item carries its note');
    assert(frozenRes.data.day.layout_snapshot, 'layout snapshot captured');
    assertEqual(JSON.parse(frozenRes.data.day.layout_snapshot).tables.length, 1, 'snapshot holds the room as it was');
    db.prepare("UPDATE bills SET paid_amount = 20 WHERE bill_number = 'BILL-D-1'").run();

    // ═══════════════════════════════════════════════════════════════════
    // Scenario J: the paper closing report
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario J: closing report ───');

    const previewRes = await api(baseUrl, `/api/service-days/${dayId}/print`, {
      method: 'POST', headers: authHeader, body: { preview: true },
    });
    assertEqual(previewRes.status, 200, 'report renders without touching a printer');
    const report = previewRes.data.text as string;
    assert(report.includes('END OF DAY'), 'report is titled');
    assert(report.includes('TAKINGS'), 'report shows the takings line');
    assert(report.includes('40.00'), `report carries the day total: ${report.slice(0, 120)}`);
    assert(report.includes('Covers'), 'report shows covers');
    assert(report.includes('Amatriciana'), 'report lists the best sellers');

    const missingDayPrint = await api(baseUrl, '/api/service-days/sd-nope/print', {
      method: 'POST', headers: authHeader, body: { preview: true },
    });
    assertEqual(missingDayPrint.status, 404, 'printing an unknown day is a 404');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario I (here, because it follows the close): a new day starts
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario I: the next order starts a new day ───');

    const nextOrderId = await placeOrder(tableOne.id, 2);
    const nextDayId = db.prepare('SELECT service_day_id FROM orders WHERE id = ?').get(nextOrderId).service_day_id;
    assert(nextDayId && nextDayId !== dayId, 'order after the close landed in a new day');
    assertEqual(db.prepare('SELECT COUNT(*) AS c FROM service_days').get().c, 2, 'exactly two days exist');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario G: one open day at a time
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario G: only one day open at a time ───');

    const doubleOpen = await api(baseUrl, '/api/service-days/open', { method: 'POST', headers: authHeader, body: {} });
    assertEqual(doubleOpen.status, 409, 'opening a second day is refused');
    assertEqual(doubleOpen.data.code, 'service_day_already_open', 'refusal carries a stable code');

    const reopenBlocked = await api(baseUrl, `/api/service-days/${dayId}/reopen`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(reopenBlocked.status, 409, 'reopening while another day runs is refused');
    assertEqual(reopenBlocked.data.code, 'service_day_another_open', 'refusal names the conflict');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario F: closing and wiping the map
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario F: close and wipe the map ───');

    const tableTwo = await createTable('Tavolo 2');
    await completeOrder(nextOrderId);
    payBill(nextOrderId, 'BILL-D-3', 20, 'cash');

    const wipeRes = await api(baseUrl, `/api/service-days/${nextDayId}/close`, {
      method: 'POST', headers: authHeader, body: { clear_tables: true },
    });
    assertEqual(wipeRes.status, 200, 'close with clear_tables succeeds');
    assertEqual(wipeRes.data.tablesCleared, 2, 'both tables removed from the map');
    assertEqual(wipeRes.data.tablesKept, 0, 'nothing had to be kept back');
    assertEqual(db.prepare('SELECT COUNT(*) AS c FROM tables').get().c, 0, 'the map is empty');

    const survivor = db.prepare('SELECT table_id, table_label, room_label FROM orders WHERE id = ?').get(nextOrderId);
    assertEqual(survivor.table_id, null, 'order link released by the wipe');
    assertEqual(survivor.table_label, 'Tavolo 1', 'history still names the table');
    assertEqual(survivor.room_label, 'Sala Interna', 'history still names the room');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario H: reopening a day
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario H: reopen ───');

    const reopenRes = await api(baseUrl, `/api/service-days/${nextDayId}/reopen`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(reopenRes.status, 200, 'owner can reopen a closed day');
    assertEqual(reopenRes.data.day.status, 'open', 'day is open again');
    assertEqual(reopenRes.data.day.summary, null, 'frozen summary dropped so totals go live again');
    assertEqual(reopenRes.data.day.closed_at, null, 'closed_at cleared');

    const managerReopen = await api(baseUrl, `/api/service-days/${dayId}/reopen`, { method: 'POST', headers: managerHeader, body: {} });
    assertEqual(managerReopen.status, 403, 'manager cannot reopen a day');

    const listRes = await api(baseUrl, '/api/service-days', { headers: authHeader });
    assertEqual(listRes.status, 200, 'day list readable');
    assertEqual(listRes.data.total, 2, 'both days listed');
    assert(listRes.data.days.every((day: any) => typeof day.takings === 'number'), 'list rows carry takings');

    // ════════════════════════════════════════════════════════════════
    // Scenario K: the migration's backfill of history that predates service days
    // ════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario K: migration backfill ───');

    db.prepare("UPDATE settings SET value = 'Europe/Rome' WHERE key = 'timezone'").run();

    // Timestamps are stored as UTC wall time. In Rome (UTC+1 in March) these are
    // 22:30 on the 10th, 00:30 on the 11th, and 20:00 on the 11th.
    const legacyOrders: [string, string][] = [
      ['ORD-OLD-1', '2026-03-10 21:30:00'],
      ['ORD-OLD-2', '2026-03-10 23:30:00'],
      ['ORD-OLD-3', '2026-03-11 19:00:00'],
    ];
    for (const [number, createdAt] of legacyOrders) {
      db.prepare(`
        INSERT INTO orders (order_number, type, status, guest_count, created_at, updated_at)
        VALUES (?, 'dine_in', 'completed', 2, ?, ?)
      `).run(number, createdAt, createdAt);
    }

    const daysBefore = db.prepare('SELECT COUNT(*) AS c FROM service_days').get().c;
    const backfillMigration = MIGRATIONS.find((migration: any) => migration.version === 74);
    assert(backfillMigration, 'migration v74 is registered');
    // Re-running is safe by construction: guarded ALTERs, INSERT OR IGNORE, and a
    // WHERE service_day_id IS NULL that only ever sees untouched rows.
    backfillMigration.up();

    assertEqual(
      db.prepare('SELECT COUNT(*) AS c FROM service_days').get().c,
      daysBefore + 2,
      'one backfilled day per calendar date the orders fall on',
    );

    const dayOf = (orderNumber: string) => db.prepare(`
      SELECT sd.business_date, sd.status, sd.summary
      FROM orders o JOIN service_days sd ON sd.id = o.service_day_id
      WHERE o.order_number = ?
    `).get(orderNumber);

    assertEqual(dayOf('ORD-OLD-1').business_date, '2026-03-10', 'evening order filed on its own date');
    assertEqual(dayOf('ORD-OLD-3').business_date, '2026-03-11', 'next evening filed on the next date');
    assertEqual(dayOf('ORD-OLD-1').status, 'closed', 'backfilled days are closed');
    assertEqual(dayOf('ORD-OLD-1').summary, null, 'backfilled days carry no frozen summary');

    // Documented limitation: backfill only has timestamps to go on, so an order
    // taken after midnight lands on the next calendar date rather than with the
    // service it belonged to. Only days opened going forward get that right.
    assertEqual(dayOf('ORD-OLD-2').business_date, '2026-03-11', 'past-midnight history buckets by calendar date');

    const backfilledDay = db.prepare("SELECT * FROM service_days WHERE business_date = '2026-03-10'").get();
    const backfilledView = await api(baseUrl, `/api/service-days/${backfilledDay.id}`, { headers: authHeader });
    assertEqual(backfilledView.status, 200, 'backfilled day readable');
    assertEqual(backfilledView.data.summary.orders.total, 1, 'its totals are computed live');
    assertEqual(backfilledView.data.summary.covers, 2, 'covers computed from the backfilled orders');

    backfillMigration.up();
    assertEqual(
      db.prepare('SELECT COUNT(*) AS c FROM service_days').get().c,
      daysBefore + 2,
      're-running the migration creates no duplicates',
    );

    // ── The day's orders, filtered by service day ─────────────────────────
    // The day page asks for `service_day=current` rather than a calendar date,
    // so a service that runs past midnight stays on one page instead of
    // splitting in half at 00:00.
    console.log('\n9. GET /orders filters by service day');
    const freshOrderId = await placeOrder(null);
    const openDayRes = await api(baseUrl, '/api/service-days/current', { headers: authHeader });
    assertEqual(openDayRes.status, 200, 'the new order opened a day again');
    const openDayId = openDayRes.data.day.id;

    const currentList = await api(baseUrl, '/api/orders?service_day=current', { headers: authHeader });
    assertEqual(currentList.status, 200, 'GET /orders?service_day=current succeeds');
    assert(
      currentList.data.orders.length > 0
        && currentList.data.orders.every((order: any) => order.service_day_id === openDayId),
      'only orders filed under the open day come back',
    );
    assert(
      currentList.data.orders.some((order: any) => order.id === freshOrderId),
      'the order just taken is on the page',
    );
    assert(
      !currentList.data.orders.some((order: any) => String(order.order_number).startsWith('ORD-OLD')),
      'orders from earlier days stay out',
    );

    const byExplicitId = await api(baseUrl, `/api/orders?service_day=${openDayId}`, { headers: authHeader });
    assertEqual(
      byExplicitId.data.orders.length,
      currentList.data.orders.length,
      'an explicit day id returns the same page as "current"',
    );

    const closedForFilter = await api(baseUrl, `/api/service-days/${openDayId}/close`, {
      method: 'POST', headers: authHeader, body: { force: true, reason: 'filter test' },
    });
    assertEqual(closedForFilter.status, 200, 'day force-closed for the empty-current check');
    const afterClose = await api(baseUrl, '/api/orders?service_day=current', { headers: authHeader });
    assertEqual(afterClose.data.orders.length, 0, 'with no day open the page is empty, not everything ever taken');

    console.log('\n✅ All service day tests passed');
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
