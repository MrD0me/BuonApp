import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';

const Module = require('module');
const originalLoad = Module._load;
// `let` (not `const`) — the dine-in setup scenario below re-points
// this at a second fresh temp dir so it can exercise a brand-new first-run
// database, independent of the owner already created in the primary scenario.
let testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-first-run-'));

const mockApp = {
  isPackaged: true,
  getPath: (name: string) => {
    if (name === 'userData') return testDir;
    if (name === 'documents') return testDir;
    return testDir;
  },
  getVersion: () => 'test',
};

Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') return { app: mockApp };
  return originalLoad.apply(this, arguments as any);
};

const express = require('express');
const { initDatabase, getDatabase, closeDatabase, getCurrentSchemaVersion, MIGRATIONS } = require('../main/db');
const { authRoutes } = require('../main/routes/auth');

function count(table: string): number {
  const db = getDatabase();
  return (db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }).count;
}

function setting(key: string): string | null {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

async function listen(app: any): Promise<http.Server> {
  return await new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1');
    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
}

async function request(baseUrl: string, pathName: string, options: Record<string, any> = {}) {
  const response = await (globalThis as any).fetch(baseUrl + pathName, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  return { status: response.status, data };
}

function isNativeAbiMismatch(error: any): boolean {
  return error?.code === 'ERR_DLOPEN_FAILED'
    && String(error?.message || '').includes('NODE_MODULE_VERSION');
}

async function main() {
  console.log('🧪 FloDesktop First-Run Setup Tests');
  console.log('='.repeat(60));

  try {
    initDatabase();
  } catch (error: any) {
    if (isNativeAbiMismatch(error)) {
      console.log('   ⚠ Skipping: better-sqlite3 is not built for this shell Node ABI.');
      console.log(`     Node ${process.version} uses ABI ${process.versions.modules}; rebuild native modules for Node to run this test outside Electron.`);
      process.exit(77); // exit code 77 = skip (GNU convention)
    }
    throw error;
  }

assert.equal(getCurrentSchemaVersion(), MIGRATIONS[MIGRATIONS.length - 1].version, 'fresh database migrates to latest schema');
  assert.equal(count('users'), 0, 'fresh install starts without users');
  assert.equal(count('categories'), 0, 'fresh install starts with no sample categories');
  assert.equal(count('products'), 0, 'fresh install starts with no sample products');
  assert.equal(count('tables'), 0, 'fresh install starts with no sample tables');
  assert.equal(count('printers'), 0, 'fresh install starts with no default printer');
  // Nothing that would phone home: no cloud identity, no server URL, no
  // telemetry consent, and none of the outbox tables the bridge used.
  assert.equal(
    (getDatabase().prepare(
      `SELECT COUNT(*) AS count FROM settings
       WHERE key LIKE 'cloud_%' OR key LIKE 'telemetry_%'
          OR key IN ('anonymous_data_consent', 'diagnostics_consent')`
    ).get() as { count: number }).count,
    0,
    'a fresh install carries no cloud or telemetry settings at all',
  );
  assert.equal(
    (getDatabase().prepare(
      `SELECT COUNT(*) AS count FROM sqlite_master
       WHERE type = 'table' AND name IN ('cloud_sync_outbox', 'support_ticket_outbox', 'store_diagnostics_outbox')`
    ).get() as { count: number }).count,
    0,
    'the outbox tables the cloud bridge used are not created',
  );
  assert.equal(
    (getDatabase().prepare(
      `SELECT COUNT(*) AS count FROM sqlite_master
       WHERE type = 'table' AND name IN ('country_packs', 'country_pack_versions', 'tax_categories', 'tax_rules', 'tax_overrides', 'tax_config_audit')`
    ).get() as { count: number }).count,
    0,
    'a fresh install carries no taxation tables',
  );
  console.log('   ✓ fresh database has schema/default settings only and awaits setup');

  const api = express();
  api.use(express.json());
  api.use('/api/auth', authRoutes);
  let server: http.Server;
  try {
    server = await listen(api);
  } catch (error: any) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      console.log('   ⚠ Skipping setup API assertions: local port binding is blocked in this environment.');
      return;
    }
    throw error;
  }
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth`;

  try {
    const before = await request(baseUrl, '/setup/status');
    assert.equal(before.status, 200);
    assert.equal(before.data.needsSetup, true, 'fresh install needs setup');
    assert.equal(before.data.initialRole, 'owner');
    assert.equal(
      Object.prototype.hasOwnProperty.call(before.data, 'bundledTaxPackCountries'),
      false,
      'setup status contains no tax-catalog metadata',
    );
    console.log('   ✓ setup status reports setup is needed without tax catalog messaging');

    const withoutTerms = await request(baseUrl, '/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({
        name: 'First Owner',
        email: 'owner@example.com',
        password: 'TestPass123',
        business_type: 'restaurant',
        business_name: 'First Cafe',
        setup_profile: 'express',
        service_model: 'qsr',
      }),
    });
    assert.equal(withoutTerms.status, 400, 'setup rejects account creation without terms acceptance');
    assert.equal(count('users'), 0, 'no user is created when terms are not accepted');
    console.log('   ✓ setup endpoint requires terms_accepted before creating the owner account');

    const invalidTimezone = await request(baseUrl, '/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({
        name: 'First Owner',
        email: 'owner@example.com',
        password: 'TestPass123',
        business_type: 'restaurant',
        business_name: 'First Cafe',
        setup_profile: 'express',
        service_model: 'qsr',
        terms_accepted: true,
        country: 'CA',
        currency: 'CAD',
        timezone: 'Not/A_Real_Zone',
      }),
    });
    assert.equal(invalidTimezone.status, 400, 'setup rejects an invalid IANA timezone');
    assert.equal(invalidTimezone.data.error, 'Invalid timezone', 'setup reports a timezone-specific validation error');
    assert.equal(count('users'), 0, 'no owner is created when the timezone is invalid');
    console.log('   ✓ setup rejects an invalid IANA timezone');

    const first = await request(baseUrl, '/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({
        name: 'First Owner',
        email: 'owner@example.com',
        password: 'TestPass123',
        business_type: 'restaurant',
        business_name: 'First Cafe',
        setup_profile: 'express',
        service_model: 'qsr',
        terms_accepted: true,
        // A Canadian store on the west coast selects its true timezone rather
        // than the country profile's America/Toronto default (#389).
        country: 'CA',
        currency: 'CAD',
        timezone: 'America/Vancouver',
      }),
    });

    assert.equal(first.status, 200);
    assert.equal(first.data.user.email, 'owner@example.com');
    assert.equal(first.data.user.role, 'owner');
    assert.equal(count('users'), 1, 'setup creates the first owner');
    const ownerRow = getDatabase().prepare('SELECT terms_accepted_at FROM users WHERE email = ?').get('owner@example.com') as { terms_accepted_at: string | null };
    assert.ok(ownerRow.terms_accepted_at, 'terms acceptance is stamped with a timestamp on the owner record');
    assert.equal(setting('business_name'), 'First Cafe');
    assert.equal(setting('business_type'), 'restaurant');
    assert.equal(setting('setup_profile'), 'express');
    assert.equal(setting('service_model'), 'qsr');
    assert.equal(setting('country'), 'CA', 'setup persists the chosen country');
    assert.equal(setting('currency'), 'CAD', 'setup persists the chosen currency');
    assert.equal(setting('timezone'), 'America/Vancouver', 'setup persists a custom tenant timezone independently of the country default');
    assert.equal(setting('billing_type'), 'prepaid');
    assert.equal(setting('tables_required'), 'false');
    assert.equal(setting('onboarding_completed'), 'true');
    assert.equal(count('categories'), 2, 'express setup seeds minimal categories');
    assert.equal(count('products'), 4, 'express setup seeds minimal products');
    assert.equal(count('tables'), 0, 'qsr express setup does not seed dine-in tables');
    assert.equal(count('customers'), 0, 'express setup does not seed demo customers');
    console.log('   ✓ setup endpoint creates owner and applies express QSR setup');

    // Setup initialize should be disabled since a user already exists
    const second = await request(baseUrl, '/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Second Owner',
        email: 'second@example.com',
        password: 'TestPass123',
        business_type: 'restaurant',
        terms_accepted: true,
      }),
    });

    assert.equal(second.status, 403);
    assert.equal(count('users'), 1, 'setup cannot create a second owner');
    console.log('   ✓ setup endpoint is disabled after the first user exists');

    // A disabled setup endpoint must stay 403 even for a malformed payload —
    // an invalid timezone must not downgrade the completed-setup guard to 400
    // (regression for the Greptile review on #432).
    const disabledWithBadTimezone = await request(baseUrl, '/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Third Owner',
        email: 'third@example.com',
        password: 'TestPass123',
        business_type: 'restaurant',
        terms_accepted: true,
        timezone: 'Not/A_Real_Zone',
      }),
    });
    assert.equal(disabledWithBadTimezone.status, 403, 'disabled setup keeps 403 even with an invalid timezone');
    assert.equal(disabledWithBadTimezone.data.error, 'Setup already complete. This endpoint is disabled.');
    assert.equal(count('users'), 1, 'disabled setup still cannot create a third owner');
    console.log('   ✓ disabled setup returns 403 before timezone validation');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // A second fresh install, this time dine-in: the express profile seeds sample
  // tables, and those have to arrive on the map like any other table. They used
  // to be inserted straight into `tables` with no room and no position, so a
  // brand-new restaurant opened on a floor plan of stranded tables.
  console.log('\n   Dine-in express setup seeds tables onto the map');
  closeDatabase();
  fs.rmSync(testDir, { recursive: true, force: true });
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-first-run-dinein-'));
  initDatabase();

  const dineInApi = express();
  dineInApi.use(express.json());
  dineInApi.use('/api/auth', authRoutes);
  let dineInServer: http.Server;
  try {
    dineInServer = await listen(dineInApi);
  } catch (error: any) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      console.log('   ⚠ Skipping dine-in seeding assertions: local port binding is blocked in this environment.');
      return;
    }
    throw error;
  }
  const dineInAddress = dineInServer.address() as { port: number };

  try {
    const created = await request(`http://127.0.0.1:${dineInAddress.port}/api/auth`, '/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Dine Owner', email: 'dine-owner@example.com', password: 'TestPass123',
        business_type: 'restaurant', setup_profile: 'express', service_model: 'finedine',
        terms_accepted: true,
      }),
    });
    assert.equal(created.status, 200, `dine-in express setup succeeds (got ${created.status})`);
    assert.equal(count('tables'), 3, 'dine-in express setup seeds sample tables');

    const stranded = getDatabase().prepare(
      'SELECT COUNT(*) AS count FROM tables WHERE room_id IS NULL OR position_x IS NULL OR width IS NULL'
    ).get() as { count: number };
    assert.equal(stranded.count, 0, 'every seeded table has a room, a position and a size');
    assert.equal(count('rooms'), 1, 'the seeded tables share one room');

    const placed = getDatabase().prepare(
      'SELECT number, position_x AS x, position_y AS y, width AS w, height AS h FROM tables ORDER BY number'
    ).all() as { number: string; x: number; y: number; w: number; h: number }[];
    const overlapping = placed.some((a, index) => placed.slice(index + 1).some((b) => (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    )));
    assert.equal(overlapping, false, 'seeded tables are not stacked on top of each other');
    console.log('   ✓ seeded tables land in a room, placed and sized');
  } finally {
    await new Promise<void>((resolve) => dineInServer.close(() => resolve()));
  }
}

main()
  .then(() => {
    closeDatabase();
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('\n✅ First-run setup tests passed');
  })
  .catch((error) => {
    try { closeDatabase(); } catch { }
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.error(error);
    process.exit(1);
  });
