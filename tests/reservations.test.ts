/**
 * Integration Test: reservations (phase 4 of docs/table-management.md)
 *
 * Bookings for the service being run right now. Before this, the reserve dialog
 * posted three fields the backend ignored into columns that did not exist, so
 * "reserved" was a colour and nothing more. These scenarios pin what it means
 * now:
 *
 * A) reserving a table creates a booking and shows it wherever tables are read
 * B) a name is required; the time, when given, must be a real one
 * C) re-reserving replaces the standing booking rather than stacking one
 * D) cancelling frees the table
 * E) an order on a booked table seats the booking
 * F) a table already serving an order cannot be booked
 * G) `reserved` can no longer be asserted through the status endpoint
 * H) freeing a table by hand drops the booking it was held for
 * I) closing the day expires bookings nobody turned up for
 * J) deleting a table releases its booking instead of orphaning it
 *
 * Usage: node tests/run-electron-node-test.cjs tests/reservations.test.ts
 */

// ── Electron Mock ────────────────────────────────────────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-reservations-'));
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
const { serviceDayRoutes } = require('../main/routes/service-days');

async function main() {
  console.log('Integration Test: reservations');
  console.log('='.repeat(50));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-res', 'Primi');
  seedProduct(db, 'prod-res', 'cat-res', 'Gricia', 12);

  const app = createApp({
    '/api/tables': tableRoutes,
    '/api/rooms': roomRoutes,
    '/api/orders': orderRoutes,
    '/api/service-days': serviceDayRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const createTable = async (number: string, capacity = 4) => {
    const res = await api(baseUrl, '/api/tables', {
      method: 'POST', headers: authHeader, body: { number, capacity },
    });
    assertEqual(res.status, 201, `table ${number} created`);
    return res.data.table;
  };

  const reserve = (tableId: string, body: Record<string, unknown>) =>
    api(baseUrl, `/api/tables/${tableId}/reserve`, { method: 'POST', headers: authHeader, body });

  const tableRow = (tableId: string) => db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as any;
  const bookings = (tableId: string) =>
    db.prepare('SELECT * FROM reservations WHERE table_id = ? ORDER BY created_at, id').all(tableId) as any[];

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Scenario A: booking a table
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario A: reserving a table ───');

    const one = await createTable('Tavolo 1', 6);
    const booked = await reserve(one.id, { name: 'Rossi', guests: 5, booked_time: '20:30', phone: '3331112222', notes: 'vicino finestra' });
    assertEqual(booked.status, 201, 'table reserved');
    assertEqual(booked.data.reservation.name, 'Rossi', 'booking carries the name');
    assertEqual(booked.data.reservation.guests, 5, 'booking carries the head count');
    assertEqual(booked.data.reservation.booked_time, '20:30', 'the time was kept');
    assertEqual(booked.data.reservation.status, 'booked', 'booking stands');
    assertEqual(tableRow(one.id).status, 'reserved', 'the table shows as reserved');

    const listed = await api(baseUrl, '/api/tables', { headers: authHeader });
    const listedTable = listed.data.tables.find((t: any) => t.id === one.id);
    assertEqual(listedTable.reservation.name, 'Rossi', 'GET /tables carries the booking');

    const mapped = await api(baseUrl, '/api/rooms', { headers: authHeader });
    const mappedTable = mapped.data.rooms.flatMap((r: any) => r.tables).find((t: any) => t.id === one.id);
    assertEqual(mappedTable.reservation.guests, 5, 'the map carries the booking');

    const single = await api(baseUrl, `/api/tables/${one.id}`, { headers: authHeader });
    assertEqual(single.data.table.reservation.name, 'Rossi', 'GET /tables/:id carries the booking');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario B: what is required and what is checked
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario B: validation ───');

    const two = await createTable('Tavolo 2');
    const nameless = await reserve(two.id, { guests: 2 });
    assertEqual(nameless.status, 400, 'a booking without a name is refused');
    assertEqual(nameless.data.code, 'reservation_name_required', 'refusal carries a stable code');

    const badTime = await reserve(two.id, { name: 'Bianchi', booked_time: 'stasera' });
    assertEqual(badTime.status, 400, 'a time that is not a time is refused');
    assertEqual(badTime.data.code, 'reservation_time_invalid', 'refusal carries a stable code');

    const badGuests = await reserve(two.id, { name: 'Bianchi', guests: 0 });
    assertEqual(badGuests.status, 400, 'zero guests is refused');

    const noTime = await reserve(two.id, { name: 'Bianchi' });
    assertEqual(noTime.status, 201, 'a booking with just a name is enough');
    assertEqual(noTime.data.reservation.booked_time, null, 'the time stays empty when not given');
    assertEqual(noTime.data.reservation.guests, 2, 'the head count falls back to a sensible default');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario C: re-booking corrects rather than stacks
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario C: re-reserving ───');

    const corrected = await reserve(one.id, { name: 'Rossi', guests: 6 });
    assertEqual(corrected.status, 201, 're-reserving succeeds');
    assertEqual(corrected.data.reservation.guests, 6, 'the head count was corrected');
    const oneBookings = bookings(one.id);
    assertEqual(oneBookings.filter((b) => b.status === 'booked').length, 1, 'only one booking stands');
    assertEqual(oneBookings.filter((b) => b.status === 'cancelled').length, 1, 'the previous one was cancelled, not deleted');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario G: reserved is not a status you can assert
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario G: status endpoint refuses reserved ───');

    const asserted = await api(baseUrl, `/api/tables/${two.id}/status`, {
      method: 'PATCH', headers: authHeader, body: { status: 'reserved' },
    });
    assertEqual(asserted.status, 400, 'setting reserved directly is refused');
    assertEqual(asserted.data.code, 'reserve_via_booking', 'refusal points at the booking endpoint');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario H: freeing a table drops its booking
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario H: freeing a reserved table ───');

    const freed = await api(baseUrl, `/api/tables/${two.id}/status`, {
      method: 'PATCH', headers: authHeader, body: { status: 'available' },
    });
    assertEqual(freed.status, 200, 'the table was freed');
    assertEqual(tableRow(two.id).status, 'available', 'table is available again');
    assertEqual(bookings(two.id).filter((b) => b.status === 'booked').length, 0, 'the booking no longer stands');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario D: cancelling explicitly
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario D: cancelling a booking ───');

    const three = await createTable('Tavolo 3');
    await reserve(three.id, { name: 'Verdi', guests: 3 });
    const cancelled = await api(baseUrl, `/api/tables/${three.id}/reserve`, { method: 'DELETE', headers: authHeader });
    assertEqual(cancelled.status, 200, 'booking cancelled');
    assertEqual(cancelled.data.reservation.status, 'cancelled', 'the booking is marked cancelled');
    assertEqual(tableRow(three.id).status, 'available', 'the table was freed');

    const nothingToCancel = await api(baseUrl, `/api/tables/${three.id}/reserve`, { method: 'DELETE', headers: authHeader });
    assertEqual(nothingToCancel.status, 404, 'cancelling nothing is a 404');
    assertEqual(nothingToCancel.data.code, 'no_reservation', 'refusal carries a stable code');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario E + F: the party arrives
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario E: an order seats the booking ───');

    const orderRes = await api(baseUrl, '/api/orders', {
      method: 'POST',
      headers: authHeader,
      body: { type: 'dine_in', table_id: one.id, guest_count: 6, items: [{ product_id: 'prod-res', quantity: 2 }] },
    });
    assertEqual(orderRes.status, 201, 'order placed on the booked table');
    assertEqual(tableRow(one.id).status, 'occupied', 'the table is now occupied');
    assertEqual(bookings(one.id).filter((b) => b.status === 'seated').length, 1, 'the booking was seated');
    assertEqual(bookings(one.id).filter((b) => b.status === 'booked').length, 0, 'nothing is still pending on it');

    console.log('\n─── Scenario F: a working table cannot be booked ───');
    const busy = await reserve(one.id, { name: 'Neri', guests: 2 });
    assertEqual(busy.status, 409, 'reserving a table mid-service is refused');
    assertEqual(busy.data.code, 'table_has_open_order', 'refusal carries a stable code');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario J: deleting a booked table
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario J: deleting a booked table ───');

    const four = await createTable('Tavolo 4');
    await reserve(four.id, { name: 'Gialli', guests: 2 });
    const deleted = await api(baseUrl, `/api/tables/${four.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(deleted.status, 200, 'a booked table can still be deleted');
    const orphaned = db.prepare("SELECT * FROM reservations WHERE name = 'Gialli'").get() as any;
    assertEqual(orphaned.table_id, null, 'the booking no longer points at a table that is gone');
    assertEqual(orphaned.status, 'cancelled', 'and it stops standing');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario I: the day ends
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario I: closing the day expires bookings ───');

    const five = await createTable('Tavolo 5');
    await reserve(five.id, { name: 'Mai arrivati', guests: 4 });

    const orderId = orderRes.data.order.id;
    await api(baseUrl, `/api/orders/${orderId}/status`, { method: 'PATCH', headers: authHeader, body: { status: 'completed' } });

    const current = await api(baseUrl, '/api/service-days/current', { headers: authHeader });
    const dayId = current.data.day.id;
    const closed = await api(baseUrl, `/api/service-days/${dayId}/close`, { method: 'POST', headers: authHeader, body: {} });
    assertEqual(closed.status, 200, 'day closed');
    assertEqual(closed.data.reservationsExpired, 1, 'the no-show booking was expired');
    assertEqual(bookings(five.id).filter((b) => b.status === 'expired').length, 1, 'and marked so');
    assertEqual(tableRow(five.id).status, 'available', 'its table was freed by the reset');

    console.log('\n✅ All reservation tests passed');
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
