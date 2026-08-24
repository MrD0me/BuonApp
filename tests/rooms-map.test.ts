/**
 * Integration Test: rooms and map geometry (phase 2 of docs/table-management.md)
 *
 * The dining room stopped being a free-text string on each table and became an
 * entity the map is drawn on. These scenarios pin the contract that makes the
 * map usable:
 *
 * A) GET /rooms returns each room with its tables attached
 * B) rooms are created, renamed and sized within bounds; names stay unique
 * C) a new table lands in a room, sized from its capacity, on a free spot
 * D) two tables created in a row do not sit on top of each other
 * E) geometry is validated, and a vertical rectangle round-trips unchanged
 * F) an order records the ROOM name, and follows the table between rooms
 * G) a room holding tables refuses to be deleted
 * H) migration v75 promotes legacy `floor` values into rooms
 *
 * Usage: node tests/run-electron-node-test.cjs tests/rooms-map.test.ts
 */

// ── Electron Mock ────────────────────────────────────────────────────────────
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-rooms-'));
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
const { roomRoutes } = require('../main/routes/rooms');
const { orderRoutes } = require('../main/routes/orders');
const { MIGRATIONS } = require('../main/db');

async function main() {
  console.log('Integration Test: rooms and map geometry');
  console.log('='.repeat(50));

  const db = initTestDb();
  const { authHeader } = seedOwnerUser(db);
  seedCategory(db, 'cat-rooms', 'Primi');
  seedProduct(db, 'prod-rooms', 'cat-rooms', 'Cacio e pepe', 11);

  const app = createApp({
    '/api/tables': tableRoutes,
    '/api/rooms': roomRoutes,
    '/api/orders': orderRoutes,
  });
  const { baseUrl, server } = await startServer(app);

  const createRoom = async (payload: Record<string, unknown>) => {
    const res = await api(baseUrl, '/api/rooms', { method: 'POST', headers: authHeader, body: payload });
    assertEqual(res.status, 201, `room ${payload.name} created`);
    return res.data.room;
  };

  const createTable = async (payload: Record<string, unknown>) => {
    const res = await api(baseUrl, '/api/tables', { method: 'POST', headers: authHeader, body: payload });
    assertEqual(res.status, 201, `table ${payload.number} created`);
    return res.data.table;
  };

  const overlap = (a: any, b: any) => (
    a.position_x < b.position_x + b.width
    && a.position_x + a.width > b.position_x
    && a.position_y < b.position_y + b.height
    && a.position_y + a.height > b.position_y
  );

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Scenario B: rooms as entities
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario B: creating and editing rooms ───');

    const inside = await createRoom({ name: 'Sala Interna' });
    assertEqual(inside.width, 1200, 'room gets a default width');
    assertEqual(inside.height, 800, 'room gets a default height');

    const duplicate = await api(baseUrl, '/api/rooms', { method: 'POST', headers: authHeader, body: { name: 'Sala Interna' } });
    assertEqual(duplicate.status, 400, 'duplicate room name refused');
    assertEqual(duplicate.data.code, 'room_name_taken', 'refusal carries a stable code');

    const tooSmall = await api(baseUrl, '/api/rooms', { method: 'POST', headers: authHeader, body: { name: 'Sgabuzzino', width: 50 } });
    assertEqual(tooSmall.status, 400, 'an absurdly small room is refused');

    const renamed = await api(baseUrl, `/api/rooms/${inside.id}`, {
      method: 'PUT', headers: authHeader, body: { name: 'Sala Grande', width: 1600 },
    });
    assertEqual(renamed.status, 200, 'room updated');
    assertEqual(renamed.data.room.name, 'Sala Grande', 'room renamed');
    assertEqual(renamed.data.room.width, 1600, 'room resized');
    assertEqual(renamed.data.room.height, 800, 'untouched dimension kept');

    const dehors = await createRoom({ name: 'Dehors', width: 900, height: 600 });

    // ═══════════════════════════════════════════════════════════════════
    // Scenario C + D: tables land in a room, sized and spaced
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario C: a new table is placed on the map ───');

    const first = await createTable({ number: 'Tavolo 1', capacity: 2 });
    assertEqual(first.room_id, inside.id, 'a table with no room joins the first room');
    assertEqual(first.shape, 'rect', 'tables are rectangular unless told otherwise');
    assertEqual(first.width, 110, 'a two-top is drawn small');
    assertEqual(first.height, 110, 'a two-top is drawn small');
    assert(first.position_x !== null && first.position_y !== null, 'the table was given a position');

    const big = await createTable({ number: 'Tavolata', capacity: 12, room_id: inside.id });
    assertEqual(big.width, 280, 'a table of twelve is drawn wide');

    const round = await createTable({ number: 'Tondo', capacity: 4, shape: 'round', room_id: inside.id });
    assertEqual(round.shape, 'round', 'shape honoured');
    assertEqual(round.width, round.height, 'a round table is square on the map');

    console.log('\n─── Scenario D: placed tables do not overlap ───');
    assert(!overlap(first, big), 'second table avoided the first');
    assert(!overlap(first, round), 'third table avoided the first');
    assert(!overlap(big, round), 'third table avoided the second');

    const elsewhere = await createTable({ number: 'Esterno 1', capacity: 4, room_id: dehors.id });
    assertEqual(elsewhere.room_id, dehors.id, 'explicit room honoured');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario A: the map read
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario A: GET /rooms ───');

    const mapRes = await api(baseUrl, '/api/rooms', { headers: authHeader });
    assertEqual(mapRes.status, 200, 'map readable');
    assertEqual(mapRes.data.rooms.length, 2, 'both rooms returned');
    const insideRoom = mapRes.data.rooms.find((room: any) => room.id === inside.id);
    const dehorsRoom = mapRes.data.rooms.find((room: any) => room.id === dehors.id);
    assertEqual(insideRoom.tables.length, 3, 'inside room carries its three tables');
    assertEqual(dehorsRoom.tables.length, 1, 'dehors carries its one table');
    assertEqual(insideRoom.tables[0].name, insideRoom.tables[0].number, 'tables keep the frontend `name` alias');
    assertEqual(mapRes.data.orphanTables.length, 0, 'no table is stranded outside a room');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario E: geometry validation
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario E: geometry is validated ───');

    const badShape = await api(baseUrl, `/api/tables/${first.id}`, { method: 'PUT', headers: authHeader, body: { shape: 'triangle' } });
    assertEqual(badShape.status, 400, 'unknown shape refused');

    const badPosition = await api(baseUrl, `/api/tables/${first.id}`, { method: 'PUT', headers: authHeader, body: { position_x: -50 } });
    assertEqual(badPosition.status, 400, 'a negative coordinate is refused');

    const badRoom = await api(baseUrl, `/api/tables/${first.id}`, { method: 'PUT', headers: authHeader, body: { room_id: 'room-nope' } });
    assertEqual(badRoom.status, 400, 'an unknown room is refused');

    // Standing a rectangle on end is just swapping its sides, so no schema
    // support is needed — but the API has to preserve a taller-than-wide table
    // rather than normalising it back.
    const upright = await createTable({ number: 'Verticale', capacity: 4, width: 110, height: 150, room_id: dehors.id });
    assertEqual(upright.width, 110, 'a vertical table keeps its narrow width');
    assertEqual(upright.height, 150, 'a vertical table keeps its tall height');

    const laidDown = await api(baseUrl, `/api/tables/${upright.id}`, {
      method: 'PUT', headers: authHeader, body: { width: 150, height: 110 },
    });
    assertEqual(laidDown.status, 200, 'turning the table back is saved');
    assertEqual(laidDown.data.table.width, 150, 'width and height swap cleanly');
    assertEqual(laidDown.data.table.height, 110, 'width and height swap cleanly');

    const moved = await api(baseUrl, `/api/tables/${first.id}`, {
      method: 'PUT', headers: authHeader, body: { position_x: 320, position_y: 180, width: 200, height: 140 },
    });
    assertEqual(moved.status, 200, 'a drag is saved');
    assertEqual(moved.data.table.position_x, 320, 'x saved');
    assertEqual(moved.data.table.position_y, 180, 'y saved');
    assertEqual(moved.data.table.width, 200, 'width saved');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario F: orders are labelled with the room
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario F: orders record the room ───');

    const orderRes = await api(baseUrl, '/api/orders', {
      method: 'POST',
      headers: authHeader,
      body: { type: 'dine_in', table_id: first.id, guest_count: 2, items: [{ product_id: 'prod-rooms', quantity: 1 }] },
    });
    assertEqual(orderRes.status, 201, 'order created');
    const orderId = orderRes.data.order.id;

    const labels = () => db.prepare('SELECT table_label, room_label FROM orders WHERE id = ?').get(orderId);
    assertEqual(labels().room_label, 'Sala Grande', 'order labelled with the room name, not the legacy floor');

    await api(baseUrl, `/api/tables/${first.id}`, { method: 'PUT', headers: authHeader, body: { room_id: dehors.id } });
    assertEqual(labels().room_label, 'Dehors', 'moving the table to another room retags its open order');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario G: a room holding tables cannot be deleted
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario G: deleting rooms ───');

    const busyRoom = await api(baseUrl, `/api/rooms/${dehors.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(busyRoom.status, 409, 'a room with tables refuses to go');
    assertEqual(busyRoom.data.code, 'room_not_empty', 'refusal carries a stable code');
    assertEqual(busyRoom.data.tables, 3, 'refusal counts what is in the way');

    const spare = await createRoom({ name: 'Sala Chiusa' });
    const emptyRoom = await api(baseUrl, `/api/rooms/${spare.id}`, { method: 'DELETE', headers: authHeader });
    assertEqual(emptyRoom.status, 200, 'an empty room is deleted');
    assertEqual(db.prepare('SELECT id FROM rooms WHERE id = ?').get(spare.id), undefined, 'room row is gone');

    // ═══════════════════════════════════════════════════════════════════
    // Scenario H: the migration promotes legacy floors
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n─── Scenario H: migration backfill ───');

    const stamp = now();
    db.prepare(`
      INSERT INTO tables (id, number, capacity, floor, status, created_at, updated_at)
      VALUES (?, ?, 4, ?, 'available', ?, ?)
    `).run('tbl-legacy-1', 'Vecchio 1', 'Veranda', stamp, stamp);
    db.prepare(`
      INSERT INTO tables (id, number, capacity, floor, status, created_at, updated_at)
      VALUES (?, ?, 4, ?, 'available', ?, ?)
    `).run('tbl-legacy-2', 'Vecchio 2', 'Veranda', stamp, stamp);

    const migration = MIGRATIONS.find((entry: any) => entry.version === 75);
    assert(migration, 'migration v75 is registered');
    migration.up();

    const veranda = db.prepare("SELECT * FROM rooms WHERE name = 'Veranda'").get() as any;
    assert(veranda, 'a room was created from the legacy floor value');
    const promoted = db.prepare('SELECT room_id, position_x, position_y, width, height, shape FROM tables WHERE id = ?').get('tbl-legacy-1') as any;
    assertEqual(promoted.room_id, veranda.id, 'legacy table joined its promoted room');
    assert(promoted.position_x !== null, 'legacy table was given a position');
    assertEqual(promoted.width, 150, 'legacy table was sized from its capacity');
    assertEqual(promoted.shape, 'rect', 'legacy table defaults to rectangular');

    const second = db.prepare('SELECT position_x, position_y, width, height FROM tables WHERE id = ?').get('tbl-legacy-2') as any;
    assert(!overlap(promoted, second), 'the two promoted tables were not stacked');

    migration.up();
    assertEqual(
      (db.prepare("SELECT COUNT(*) AS c FROM rooms WHERE name = 'Veranda'").get() as any).c,
      1,
      're-running the migration creates no duplicate room',
    );

    console.log('\n✅ All rooms and map tests passed');
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
