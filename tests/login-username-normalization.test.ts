/**
 * Test suite for Area B: Login username normalization
 * Verifies that POST /api/auth/login matches a username whatever the case,
 * the surrounding whitespace or the accents it is typed with, and that the
 * email somebody used before usernames no longer signs anyone in.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const Module = require('module');
const originalLoad = Module._load;
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-login-norm-'));

Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') {
    return {
      app: {
        isPackaged: true,
        getPath: () => testDir,
        getVersion: () => 'test',
      },
    };
  }
  return originalLoad.apply(this, arguments as any);
};

const bcrypt = require('bcryptjs');
const request = require('supertest');
const {
  initTestDb,
  createApp,
  assertEqual,
  assert,
  getResults,
  closeDatabase,
  now,
} = require('./helpers/test-setup');

const { authRoutes } = require('../main/routes/auth');

async function run() {
  console.log('Testing Login Username Normalization (Area B)...');
  console.log('='.repeat(60));

  const db = initTestDb();

  // Seed a user with a normalized username
  db.prepare(`
    INSERT INTO users (id, name, username, password, role, is_active, created_at, updated_at)
    VALUES ('norm-user-1', 'Norm Owner', 'niccolo', ?, 'owner', 1, ?, ?)
  `).run(bcrypt.hashSync('Pass1234!', 10), now(), now());

  const app = createApp({ '/api/auth': authRoutes });

  // Test 1: Exact lowercase username
  const res1 = await request(app)
    .post('/api/auth/login')
    .send({ username: 'niccolo', password: 'Pass1234!' });
  assertEqual(res1.status, 200, 'Exact lowercase username login succeeds');
  assert(!!res1.body.access_token, 'Login returns access token');
  assertEqual(res1.body.user.username, 'niccolo', 'Login returns the username');
  assertEqual(res1.body.user.email, undefined, 'Login returns no email');

  // Test 2: Uppercase / Mixed-case username
  const res2 = await request(app)
    .post('/api/auth/login')
    .send({ username: 'Niccolo', password: 'Pass1234!' });
  assertEqual(res2.status, 200, 'Mixed-case username login succeeds');

  // Test 3: Whitespace-padded username
  const res3 = await request(app)
    .post('/api/auth/login')
    .send({ username: '  niccolo \t', password: 'Pass1234!' });
  assertEqual(res3.status, 200, 'Whitespace-padded username login succeeds');

  // Test 4: Accented, mixed-case AND whitespace-padded username
  const res4 = await request(app)
    .post('/api/auth/login')
    .send({ username: '  NICCOLÒ \n', password: 'Pass1234!' });
  assertEqual(res4.status, 200, 'Accented, mixed-case and whitespace-padded username login succeeds');

  // Test 5: The old email field is gone
  const res5 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'niccolo', password: 'Pass1234!' });
  assertEqual(res5.status, 400, 'A body with an email and no username is refused');

  // Test 6: An email typed as the username matches nobody
  const res6 = await request(app)
    .post('/api/auth/login')
    .send({ username: 'niccolo@buonapp.local', password: 'Pass1234!' });
  assertEqual(res6.status, 401, 'An email in the username field signs nobody in');

  const results = getResults();
  if (results.failed > 0) {
    throw new Error(`${results.failed} test assertions failed`);
  }
  console.log('\n✅ Login username normalization tests passed!');
}

run()
  .then(() => {
    closeDatabase();
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
  })
  .catch((err) => {
    try { closeDatabase(); } catch { }
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.error(err);
    process.exit(1);
  });
