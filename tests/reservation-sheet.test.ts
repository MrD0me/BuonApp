/**
 * Integration Test: the booking sheet and table assignment
 * (see docs/table-management.md)
 *
 * Bookings are taken down before anyone decides who sits where, so a booking
 * with no table is a normal state rather than an error. Assigning is modelled
 * as an exchange of places: the booking takes the table, and whatever was on
 * that table inherits what the booking had. These scenarios pin that one rule
 * against every shape it has to cover.
 *
 * A) a booking can be taken down with no table, and shows on the day's sheet
 * B) assigning holds the table
 * C) moving to another free table releases the first
 * D) moving onto a held table swaps the two bookings
 * E) an unassigned booking taking a held table displaces its occupant
 * F) assigning null takes the table back
 * G) a table serving an order cannot be assigned
 * H) a booking that is no longer pending cannot be moved
 * I) a table joined into a group cannot be assigned
 * J) a seating closed by mistake can be reopened
 * K) no-show frees the table during service
 * L) the sheet reads in the order the evening will run
 *
 * Usage: node tests/run-electron-node-test.cjs tests/reservation-sheet.test.ts
 */

// ── Electron Mock ────────────────────────────────────────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-res-sheet-'));
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
const { orderRoutes } = require('../main/routes/orders');
const { reservationRoutes } = require('../main/routes/reservations');

async function main() {
  console.log('Integration Test: booking sheet and table assignment');
  console.log('='.repeat(50));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-sheet', 'Primi');
  seedProduct(db, 'prod-sheet', 'cat-sheet', 'Amatriciana', 12);

  const app = createApp({
    '/api/tables': tableRoutes,
    '/api/orders': orderRoutes,
    '/api/reservations': reservationRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const createTable = async (number: string, capacity = 4) => {
    const res = await api(baseUrl, '/api/tables', { method: 'POST', headers: authHeader, body: { number, capacity } });
    assertEqual(res.status, 201, `table ${number} created`);
    return res.data.table;
  };
  const book = async (body: Record<string, unknown>) => {
    const res = await api(baseUrl, '/api/reservations', { method: 'POST', headers: authHeader, body });
    assertEqual(res.status, 201, `booking for ${body.name} taken`);
    return res.data.reservation;
  };
  const assign = (reservationId: string, tableId: string | null) =>
    api(baseUrl, `/api/reservations/${reservationId}/assign`, {
      method: 'POST', headers: authHeader, body: { table_id: tableId },
    });
  const booking = (id: string) => db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as any;
  const tableStatus = (id: string) => (db.prepare('SELECT status FROM tables WHERE id = ?').get(id) as any).status;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Scenario A: a booking without a table
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario A: taking bookings before the seating plan ───');

    const rossi = await book({ name: 'Rossi', guests: 4, booked_time: '20:30' });
    assertEqual(rossi.table_id, null, 'a booking starts with no table');
    assertEqual(rossi.status, 'booked', 'and is pending');

    const bianchi = await book({ name: 'Bianchi', guests: 2, booked_time: '21:00' });
    const verdi = await book({ name: 'Verdi', guests: 6 });

    const sheet = await api(baseUrl, '/api/reservations', { headers: authHeader });
    assertEqual(sheet.status, 200, 'the sheet reads');
    assertEqual(sheet.data.reservations.length, 3, 'all three bookings are on it');
    assert(sheet.data.day, 'taking a booking opened the day');

    console.log('\n─── Scenario L: the sheet reads in service order ───');
    const names = sheet.data.reservations.map((r: any) => r.name);
    assertEqual(names[0], 'Rossi', '20:30 comes first');
    assertEqual(names[1], 'Bianchi', 'then 21:00');
    assertEqual(names[2], 'Verdi', 'and the one with no time last');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario B + C: holding and moving
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario B: assigning a table ───');

    const five = await createTable('Tavolo 5', 4);
    const six = await createTable('Tavolo 6', 4);
    const seven = await createTable('Tavolo 7', 2);

    const held = await assign(rossi.id, five.id);
    assertEqual(held.status, 200, 'the booking took the table');
    assertEqual(held.data.reservation.table_id, five.id, 'and is on it');
    assertEqual(held.data.displaced, null, 'nobody had to move');
    assertEqual(tableStatus(five.id), 'reserved', 'the table is being held');

    console.log('\n─── Scenario C: moving to another free table ───');
    const moved = await assign(rossi.id, six.id);
    assertEqual(moved.status, 200, 'the booking moved');
    assertEqual(booking(rossi.id).table_id, six.id, 'onto the new table');
    assertEqual(tableStatus(six.id), 'reserved', 'which is now held');
    assertEqual(tableStatus(five.id), 'available', 'and the old one was let go');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario D: the swap
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario D: swapping two bookings ───');

    await assign(bianchi.id, seven.id);
    const swapped = await assign(rossi.id, seven.id);
    assertEqual(swapped.status, 200, 'the swap went through');
    assertEqual(swapped.data.reservation.table_id, seven.id, 'Rossi took table 7');
    assertEqual(swapped.data.displaced.id, bianchi.id, 'and the response names who moved');
    assertEqual(booking(bianchi.id).table_id, six.id, 'Bianchi took the table Rossi left');
    assertEqual(tableStatus(seven.id), 'reserved', 'both tables are still held');
    assertEqual(tableStatus(six.id), 'reserved', 'both tables are still held');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario E: an unassigned booking taking a held table
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario E: displacing without giving a table back ───');

    const displacing = await assign(verdi.id, seven.id);
    assertEqual(displacing.status, 200, 'Verdi took table 7');
    assertEqual(booking(verdi.id).table_id, seven.id, 'and is on it');
    assertEqual(booking(rossi.id).table_id, null, 'Rossi, who had nothing to give, is back on the sheet');
    assertEqual(booking(rossi.id).status, 'booked', 'and is still pending');
    assertEqual(tableStatus(seven.id), 'reserved', 'the table stays held, by someone else');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario F: taking the table back
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario F: unassigning ───');

    const freed = await assign(verdi.id, null);
    assertEqual(freed.status, 200, 'the table was given back');
    assertEqual(booking(verdi.id).table_id, null, 'the booking has no table');
    assertEqual(tableStatus(seven.id), 'available', 'and the table is free again');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario G + I: tables that cannot take a booking
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario G: a table already serving ───');

    const working = await createTable('Tavolo 8');
    await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', table_id: working.id, items: [{ product_id: 'prod-sheet', quantity: 1 }] },
    });
    const busy = await assign(verdi.id, working.id);
    assertEqual(busy.status, 409, 'assigning onto a working table is refused');
    assertEqual(busy.data.code, 'table_has_open_order', 'refusal carries a stable code');

    console.log('\n─── Scenario I: a table joined into a group ───');
    const lead = await createTable('Tavolo 9');
    const member = await createTable('Tavolo 10');
    await api(baseUrl, `/api/tables/${lead.id}/merge`, { method: 'POST', headers: authHeader, body: { table_ids: [member.id] } });
    const joined = await assign(verdi.id, member.id);
    assertEqual(joined.status, 409, 'assigning onto a folded table is refused');
    assertEqual(joined.data.code, 'table_is_merged', 'refusal carries a stable code');
    assertEqual(joined.data.leader_table_id, lead.id, 'and points at the table leading the group');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario H + J: a booking that is no longer pending
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario H: a seated booking cannot be moved ───');

    const arriving = await createTable('Tavolo 11');
    const neri = await book({ name: 'Neri', guests: 2 });
    await assign(neri.id, arriving.id);
    await api(baseUrl, '/api/orders', {
      method: 'POST', headers: authHeader,
      body: { type: 'dine_in', table_id: arriving.id, items: [{ product_id: 'prod-sheet', quantity: 1 }] },
    });
    assertEqual(booking(neri.id).status, 'seated', 'the order seated the booking');

    const moveSeated = await assign(neri.id, five.id);
    assertEqual(moveSeated.status, 409, 'a seated booking refuses to move');
    assertEqual(moveSeated.data.code, 'reservation_not_pending', 'refusal carries a stable code');

    console.log('\n─── Scenario J: reopening a seating made by mistake ───');
    const reopened = await api(baseUrl, `/api/reservations/${neri.id}/reopen`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(reopened.status, 200, 'the booking was reopened');
    assertEqual(reopened.data.reservation.status, 'booked', 'and is pending again');
    assertEqual(reopened.data.reservation.table_id, null, 'with no table, since that one is busy now');

    const backOn = await assign(neri.id, five.id);
    assertEqual(backOn.status, 200, 'and it can be given a different table');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario K: nobody came
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario K: no-show frees the table ───');

    const noShow = await api(baseUrl, `/api/reservations/${neri.id}/no-show`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(noShow.status, 200, 'the booking was marked as a no-show');
    assertEqual(noShow.data.reservation.status, 'no_show', 'and says so');
    assertEqual(tableStatus(five.id), 'available', 'its table went back into service');

    const editGone = await api(baseUrl, `/api/reservations/${neri.id}`, {
      method: 'PATCH', headers: authHeader, body: { guests: 4 },
    });
    assertEqual(editGone.status, 409, 'a closed booking can no longer be edited');

    // ═══════════════════════════════════════════════════════════════════
    // Editing a pending booking
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Editing a pending booking ───');

    const edited = await api(baseUrl, `/api/reservations/${verdi.id}`, {
      method: 'PATCH', headers: authHeader, body: { guests: 8, booked_time: '19:45', phone: '3331112222' },
    });
    assertEqual(edited.status, 200, 'the booking was edited');
    assertEqual(edited.data.reservation.guests, 8, 'head count updated');
    assertEqual(edited.data.reservation.booked_time, '19:45', 'time updated');
    assertEqual(edited.data.reservation.name, 'Verdi', 'and the untouched name stayed');

    const badTime = await api(baseUrl, `/api/reservations/${verdi.id}`, {
      method: 'PATCH', headers: authHeader, body: { booked_time: 'stasera' },
    });
    assertEqual(badTime.status, 400, 'a time that is not a time is still refused');

    console.log('\n✅ All booking sheet tests passed');
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
