/* Test-only dual-server bootstrap for Playwright. Keeps fixture data out of dev-server.js. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-e2e-'));
process.env.JWT_SECRET = 'e2e-test-secret';
process.env.FLO_AUTH_RATE_LIMIT_MAX = '1000';
process.env.NODE_ENV = 'test';

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') {
    return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'e2e' } };
  }
  return originalLoad.apply(this, arguments);
};

const bcrypt = require('bcryptjs');
const { initDatabase, getDatabase, closeDatabase, beginDatabaseShutdown, waitForDatabaseRequests, now } = require('../dist/db');
const { createExitCodeAwareShutdown, waitForHttpShutdownWork, isShutdownTimeout } = require('../dist/shutdown');
const { startServer, stopServer } = require('../dist/server');
const { startServerApp, stopServerApp } = require('../dist/server-app');
const { shutdown: shutdownWhatsApp, requestShutdown: requestWhatsAppShutdown } = require('../dist/services/whatsapp');
const { startStandaloneServers } = require('../dist/standalone-startup');
const { startKdsServer, stopKdsServer } = require('../dist/kds-server');

function seedUser(id, email, role) {
  getDatabase().prepare(
    'INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
  ).run(id, `E2E ${role}`, email, bcrypt.hashSync('E2ePass123!', 10), role, now(), now());
}

function seedPosFixture() {
  const db = getDatabase();
  const createdAt = now();
  for (const [key, value] of [
    ['country', 'TH'],
    ['currency', 'THB'],
    ['timezone', 'Asia/Bangkok'],
    ['billing_type', 'prepaid'],
    ['business_type', 'restaurant'],
    ['tables_required', 'false'],
    ['whatsapp_enabled', 'true'],
  ]) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
      .run(key, value, createdAt);
  }
  db.prepare(
    'INSERT INTO categories (id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)'
  ).run('e2e-category', 'E2E Menu', 1, createdAt, createdAt);
  db.prepare(
    `INSERT INTO products (
       id, category_id, name, price,
       cb_percent, track_inventory, stock_quantity, is_active, sort_order, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(
    'e2e-product', 'e2e-category', 'E2E Coffee', 60,
    0, 0, 999, 1, createdAt, createdAt,
  );
}

let exitRequested = false;
let shutdownRequested = false;
const requestStop = createExitCodeAwareShutdown(async () => {
  let cleanupFailed = false;
  let databaseBlocked = false;
  try { await stopServerApp(); } catch (error) {
    cleanupFailed = true;
    databaseBlocked = true;
    console.error('[E2E] Server App cleanup failed:', error);
    if (isShutdownTimeout(error)) throw error;
  }
  try { await stopServer(); } catch (error) {
    cleanupFailed = true;
    databaseBlocked = true;
    console.error('[E2E] Main server cleanup failed:', error);
    if (isShutdownTimeout(error)) throw error;
  }
  try { await stopKdsServer(); } catch (error) {
    cleanupFailed = true;
    databaseBlocked = true;
    console.error('[E2E] KDS server cleanup failed:', error);
    if (isShutdownTimeout(error)) throw error;
  }
  try { await shutdownWhatsApp(); } catch (error) {
    cleanupFailed = true;
    databaseBlocked = true;
    console.error('[E2E] WhatsApp cleanup failed:', error);
    if (isShutdownTimeout(error)) throw error;
  }
  try { await waitForHttpShutdownWork(); } catch (error) {
    cleanupFailed = true;
    databaseBlocked = true;
    console.error('[E2E] HTTP handler cleanup failed:', error);
    if (isShutdownTimeout(error)) throw error;
  }
  try { beginDatabaseShutdown(); await waitForDatabaseRequests(); } catch (error) {
    cleanupFailed = true;
    databaseBlocked = true;
    console.error('[E2E] Database request drain failed:', error);
    if (isShutdownTimeout(error)) throw error;
  }
  if (!databaseBlocked) {
    try { closeDatabase(); } catch (error) {
      cleanupFailed = true;
      console.error('[E2E] Database cleanup failed:', error);
    }
  }
  Module._load = originalLoad;
  try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (error) {
    cleanupFailed = true;
    console.error('[E2E] Fixture cleanup failed:', error);
  }
  return cleanupFailed ? 1 : 0;
}, {
  onShutdownRequested: requestWhatsAppShutdown,
  onFatalTimeout: () => process.exit(1),
});

async function stop(exitCode = 0) {
  shutdownRequested = true;
  const finalExitCode = await requestStop(exitCode);
  if (!exitRequested) {
    exitRequested = true;
    process.exit(finalExitCode);
  }
}

(async () => {
  await startStandaloneServers({
    initializeDatabase: initDatabase,
    prepare: () => {
      seedUser('e2e-owner', 'owner@buonapp.local', 'owner');
      seedUser('e2e-manager', 'manager@buonapp.local', 'manager');
      seedUser('e2e-server', 'server@buonapp.local', 'server');
      seedPosFixture();
    },
    startServer,
    startKdsServer,
    startServerApp,
    isShutdownRequested: () => shutdownRequested,
  });
  console.log('[E2E] Main, KDS, and Server App servers ready');
})().catch((error) => {
  console.error(error);
  stop(1);
});

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
