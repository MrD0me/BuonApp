/**
 * Usernames instead of emails (migration v96).
 *
 * BuonApp sends no mail, so the email every login asked for was invented to
 * get past the form. This covers what replaced it: the shared rule in
 * main/lib/username.ts and its copy for the forms in frontend/src/lib/username.ts,
 * the migration that turned every login email into a username (and its replays
 * from a rewound database), the restore merge that keeps current usernames,
 * and the staff API's username checks.
 *
 * Run: npm run test:usernames
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const Module = require('module');
const originalLoad = Module._load;
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-usernames-'));

Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') {
    return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  }
  return originalLoad.apply(this, arguments as any);
};

// The staff API checks below make more requests than one auth rate-limit window allows.
process.env.FLO_AUTH_RATE_LIMIT_MAX = '1000';

const request = require('supertest');
const {
  assert,
  assertEqual,
  getResults,
  createApp,
  seedOwnerUser,
  isNativeAbiMismatch,
} = require('./helpers/test-setup');
const {
  initDatabase,
  getDatabase,
  closeDatabase,
  getCurrentSchemaVersion,
  MIGRATIONS,
  captureUserSecurityState,
  mergeUserSecurityState,
  now,
} = require('../main/db');
const { runHealthCheck } = require('../main/services/schema-health');
const backend = require('../main/lib/username');
const frontend = require('../frontend/src/lib/username');
const { staffRoutes } = require('../main/routes/staff');

function section(title: string) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

function userColumns(): string[] {
  return getDatabase().prepare('PRAGMA table_info(users)').all().map((column: any) => column.name);
}

function usernames(): Record<string, string | null> {
  const rows = getDatabase().prepare('SELECT id, username FROM users ORDER BY id').all() as { id: string; username: string | null }[];
  return Object.fromEntries(rows.map((row) => [row.id, row.username]));
}

function reopenAt(version: number) {
  getDatabase().pragma(`user_version = ${version}`);
  closeDatabase();
  initDatabase();
}

function checkRule() {
  section('The rule');
  assertEqual(backend.normalizeUsername('  Niccolò '), 'niccolo', 'normalizing trims, lowercases and folds accents');
  assertEqual(backend.normalizeUsername('ＭＡＲＩＯ'), 'mario', 'full-width letters fold to plain ones');
  assertEqual(backend.normalizeUsername({ username: 'mario' }), '', 'a non-string value normalizes to nothing');
  assertEqual(backend.normalizeUsername(1234), '1234', 'a number is read as its digits');

  for (const valid of ['mario', 'mario.rossi', 'cassa_1', 'sala-2', 'x'.repeat(32), '123']) {
    assert(backend.isValidUsername(valid), `${JSON.stringify(valid)} is a valid new username`);
  }
  for (const invalid of ['', 'jo', 'mario rossi', 'mario@ristorante.it', '.mario', 'mario.', 'Mario', 'x'.repeat(33), 'niccolò']) {
    assert(!backend.isValidUsername(invalid), `${JSON.stringify(invalid)} is not a valid new username`);
  }
  assert(backend.isUsernameShape('a'), 'a single letter has the shape of a username (kept from a@…)');
  assert(!backend.isUsernameShape('a b'), 'a space never does');

  assertEqual(backend.usernameBase('Mario Rossi'), 'mario.rossi', 'a name becomes first.last');
  assertEqual(backend.usernameBase("O'Brien"), 'o.brien', 'punctuation inside a name becomes a dot');
  assertEqual(backend.usernameBase('José Ñandú'), 'jose.nandu', 'accents fold away');
  assertEqual(backend.usernameBase('  ...  '), '', 'nothing usable gives nothing');
  assertEqual(backend.usernameBase('مدیر'), '', 'a name in another script gives nothing');
  assertEqual(backend.usernameBase('x'.repeat(40)).length, 32, 'a long text is cut to the limit');

  assertEqual(backend.usernameFromLegacy('Mario@Ristorante.it', 'Mario Rossi', 'owner'), 'mario', 'an email gives the part before the @');
  assertEqual(backend.usernameFromLegacy('a@a.it', 'Anna', 'server'), 'a', 'even when that part is one letter');
  assertEqual(backend.usernameFromLegacy('mario+sala@x.it', 'Mario', 'server'), 'mario.sala', 'a plus in the email becomes a dot');
  assertEqual(backend.usernameFromLegacy(null, 'Luca Verdi', 'cashier'), 'luca.verdi', 'no email gives the name');
  assertEqual(backend.usernameFromLegacy('@@@', 'مدیر', 'manager'), 'manager', 'nothing usable anywhere gives the role');
  assertEqual(backend.usernameFromLegacy('Cassa1', 'Cassa', 'cashier'), 'cassa1', 'a plain name typed into the old field is kept');

  const taken = new Set(['mario', 'mario2', 'cassa1', 'x'.repeat(32)]);
  assertEqual(backend.pickUniqueUsername('luca', taken), 'luca', 'a free name is used as it is');
  assertEqual(backend.pickUniqueUsername('mario', taken), 'mario3', 'a taken name gets the first free number');
  assertEqual(backend.pickUniqueUsername('cassa1', taken), 'cassa1.2', 'a name ending in a digit takes a dot before the number');
  const long = backend.pickUniqueUsername('x'.repeat(32), taken);
  assert(long.length <= 32 && backend.isUsernameShape(long) && long !== 'x'.repeat(32), 'a numbered long name still fits');

  for (const username of ['mario', 'a', 'mario.rossi', 'cassa1.2', 'sala-2', 'x'.repeat(32)]) {
    assertEqual(backend.usernameBase(username), username, `${JSON.stringify(username)} is its own base`);
    assertEqual(backend.usernameFromLegacy(username, 'Someone Else', 'server'), username, `${JSON.stringify(username)} survives a replay of v96`);
  }

  section('The forms use the same rule');
  assertEqual(frontend.USERNAME_MIN_LENGTH, backend.USERNAME_MIN_LENGTH, 'same minimum length');
  assertEqual(frontend.USERNAME_MAX_LENGTH, backend.USERNAME_MAX_LENGTH, 'same maximum length');
  const samples = ['  Niccolò ', 'MARIO', 'ＭＡＲＩＯ', 'mario rossi', 'mario@x.it', 'a', 'jo', '.mario', 'cassa_1', 'x'.repeat(33), 'مدیر', 'Ñandú'];
  for (const sample of samples) {
    const normalized = backend.normalizeUsername(sample);
    assertEqual(frontend.normalizeUsername(sample), normalized, `both sides normalize ${JSON.stringify(sample)} alike`);
    assertEqual(frontend.isValidUsername(normalized), backend.isValidUsername(normalized), `both sides judge ${JSON.stringify(normalized)} alike`);
    assertEqual(frontend.isUsernameShape(normalized), backend.isUsernameShape(normalized), `both sides see the shape of ${JSON.stringify(normalized)} alike`);
  }
  assert(frontend.looksLikeEmail('mario@ristorante.it') && !frontend.looksLikeEmail('mario'), 'the forms spot an email typed out of habit');
}

function checkMigration() {
  section('Migration v96');
  const original = MIGRATIONS.slice();
  MIGRATIONS.length = 0;
  MIGRATIONS.push(...original.filter((migration: any) => migration.version <= 95));
  initDatabase();
  assertEqual(getCurrentSchemaVersion(), 95, 'setup: the database stops at v95');
  assert(userColumns().includes('email') && !userColumns().includes('username'), 'setup: accounts still sign in by email');

  const insert = getDatabase().prepare(`
    INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 'hash', ?, ?, ?, ?)
  `);
  const legacy: [string, string, string | null, string, number, string][] = [
    // The waiter was there first, but the owner keeps the plain name.
    ['staff-mario', 'Mario Bianchi', 'Mario@Altro.it', 'server', 1, '2025-01-01 10:00:00'],
    ['owner-mario', 'Mario Rossi', 'mario@ristorante.it', 'owner', 1, '2026-01-01 10:00:00'],
    ['old-mario', 'Old Mario', 'mario@old.it', 'server', 0, '2024-01-01 10:00:00'],
    ['no-email', 'Luca Verdi', null, 'cashier', 1, '2026-02-01 10:00:00'],
    ['plain-value', 'Giulia', 'Giulia', 'server', 1, '2026-02-02 10:00:00'],
    ['short-local', 'Anna', 'a@a.it', 'chef', 1, '2026-02-03 10:00:00'],
    ['garbage', 'مدیر', '@@@', 'manager', 1, '2026-02-04 10:00:00'],
    ['cassa-a', 'Cassa', 'cassa1@x.it', 'cashier', 1, '2026-02-05 10:00:00'],
    ['cassa-b', 'Cassa bis', 'Cassa1@y.it', 'cashier', 1, '2026-02-06 10:00:00'],
  ];
  for (const [id, name, email, role, active, createdAt] of legacy) insert.run(id, name, email, role, active, createdAt, createdAt);

  closeDatabase();
  MIGRATIONS.length = 0;
  MIGRATIONS.push(...original);
  initDatabase();

  assertEqual(getCurrentSchemaVersion(), original[original.length - 1].version, 'the upgrade reaches the latest schema');
  assert(userColumns().includes('username') && !userColumns().includes('email'), 'users.email became users.username');
  const expected: Record<string, string> = {
    'owner-mario': 'mario',
    'staff-mario': 'mario2',
    'old-mario': 'mario3',
    'no-email': 'luca.verdi',
    'plain-value': 'giulia',
    'short-local': 'a',
    garbage: 'manager',
    'cassa-a': 'cassa1',
    'cassa-b': 'cassa1.2',
  };
  const after = usernames();
  for (const [id, username] of Object.entries(expected)) {
    assertEqual(after[id], username, `${id} signs in as ${username}`);
  }
  let clash: unknown = null;
  try {
    getDatabase().prepare(`INSERT INTO users (id, name, username, password, role) VALUES ('clash', 'Clash', 'mario', 'hash', 'server')`).run();
  } catch (error) {
    clash = error;
  }
  assert(clash !== null, 'the column still refuses a second account with the same username');
  assertEqual(runHealthCheck().findings.length, 0, 'an upgraded database matches a fresh one exactly');

  section('Replaying v96 changes nothing');
  getDatabase().prepare("UPDATE users SET username = 'nico' WHERE id = 'no-email'").run();
  const settled = usernames();
  reopenAt(95);
  assertEqual(JSON.stringify(usernames()), JSON.stringify(settled), 'rewound to v95, every username survives the replay');
  // Below v70, whose rebuild of the users table has to carry usernames too.
  // (Not v69: a rewind past v60 skips the split-check columns v85 still reads.)
  reopenAt(55);
  assertEqual(JSON.stringify(usernames()), JSON.stringify(settled), 'rewound to v55, the v70 rebuild and v96 leave every username alone');
  assert(userColumns().includes('username') && !userColumns().includes('email'), 'and the column is still username');
  assertEqual(runHealthCheck().findings.length, 0, 'the replayed database still matches a fresh one');
}

function checkRestoreMerge() {
  section('Restores keep the current usernames');
  const db = getDatabase();
  db.prepare('DELETE FROM users').run();
  const insert = db.prepare(`
    INSERT INTO users (id, name, username, password, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 'hash', ?, 1, ?, ?)
  `);
  for (const [id, name, username, role] of [
    ['owner-1', 'Mario Rossi', 'mario', 'owner'],
    ['staff-1', 'Mario Bianchi', 'mario2', 'server'],
    ['staff-2', 'Giulia', 'giulia', 'server'],
    ['staff-3', 'Anna', 'a', 'chef'],
  ]) insert.run(id, name, username, role, now(), now());
  const preserved = captureUserSecurityState(db);
  assertEqual(preserved.find((row: any) => row.id === 'staff-3')?.username, 'a', 'the captured state carries usernames');

  // What an older snapshot put back: two accounts that have since swapped
  // names, an account the snapshot gave a current username to, one that is
  // gone from the snapshot while another holds its name, and a row from
  // before v96 with no username at all.
  db.prepare("UPDATE users SET username = 'swap' WHERE id = 'owner-1'").run();
  db.prepare("UPDATE users SET username = 'mario' WHERE id = 'staff-1'").run();
  db.prepare("UPDATE users SET username = 'mario2' WHERE id = 'owner-1'").run();
  db.prepare("UPDATE users SET username = 'giulia.old' WHERE id = 'staff-2'").run();
  insert.run('restored-giulia', 'Giulia Neri', 'giulia', 'server', now(), now());
  db.prepare("DELETE FROM users WHERE id = 'staff-3'").run();
  insert.run('restored-a', 'Alba', 'a', 'server', now(), now());
  insert.run('restored-null', 'Paolo Neri', null, 'cashier', now(), now());

  mergeUserSecurityState(db, preserved);
  const merged = usernames();
  assertEqual(merged['owner-1'], 'mario', 'swapped usernames go back to their current owners');
  assertEqual(merged['staff-1'], 'mario2', 'both of them');
  assertEqual(merged['staff-2'], 'giulia', "a current account takes back a username the snapshot had given away");
  assertEqual(merged['restored-giulia'], 'giulia.neri', 'and the snapshot-only account is renamed from its name');
  assertEqual(merged['staff-3'], 'a', 'an account missing from the snapshot comes back with its username');
  assertEqual(merged['restored-a'], 'alba', 'the row that held it is renamed');
  assertEqual(merged['restored-null'], 'paolo.neri', 'a row restored without a username is given one');
  const values = Object.values(merged);
  assertEqual(new Set(values).size, values.length, 'no two accounts share a username');
  const inactive = db.prepare("SELECT COUNT(*) AS n FROM users WHERE id LIKE 'restored-%' AND is_active = 0").get() as { n: number };
  assertEqual(inactive.n, 3, 'accounts that exist only in the snapshot stay switched off');
}

async function checkStaffApi() {
  section('Staff accounts');
  const db = getDatabase();
  const { authHeader: ownerAuth } = seedOwnerUser(db);
  const app = createApp({ '/api/staff': staffRoutes });
  const newStaff = (username: unknown) => request(app).post('/api/staff').set(ownerAuth).send({
    name: 'New waiter', username, password: 'StrongPass1', role: 'server',
  });

  let result = await newStaff(undefined);
  assertEqual(result.status, 400, 'a new account needs a username');
  assertEqual(result.body.code, 'username_required', 'a missing username is reported as such');
  for (const invalid of ['mario@ristorante.it', 'jo', 'mario rossi', '.mario', 'x'.repeat(33)]) {
    result = await newStaff(invalid);
    assertEqual(result.body.code, 'username_invalid', `${JSON.stringify(invalid)} is not accepted as a username`);
  }
  result = await newStaff('  Niccolò ');
  assertEqual(result.status, 201, 'a username with capitals, an accent and spaces around is accepted');
  assertEqual(result.body.staff.username, 'niccolo', 'and stored folded, trimmed and lowercase');
  assertEqual(result.body.staff.email, undefined, 'staff responses carry no email');
  const niccoloId = result.body.staff.id;
  result = await newStaff('NICCOLO');
  assertEqual(result.body.code, 'username_taken', 'the same name in other capitals is taken');
  result = await newStaff('niccolò');
  assertEqual(result.body.code, 'username_taken', 'and so is the same name with the accent');

  result = await request(app).put(`/api/staff/${niccoloId}`).set(ownerAuth).send({ username: 'owner-test-001' });
  assertEqual(result.body.code, 'username_taken', "a rename cannot take somebody else's username");
  result = await request(app).put(`/api/staff/${niccoloId}`).set(ownerAuth).send({ username: '' });
  assertEqual(result.body.code, 'username_required', 'a rename cannot clear the username');
  result = await request(app).put(`/api/staff/${niccoloId}`).set(ownerAuth).send({ username: 'Nico' });
  assertEqual(result.status, 200, 'a rename to a free, valid name is saved');
  assertEqual(result.body.staff.username, 'nico', 'normalized like a new one');
  result = await request(app).put(`/api/staff/${niccoloId}`).set(ownerAuth).send({ name: 'Nico B.' });
  assertEqual(result.body.staff.username, 'nico', 'an edit that leaves the username out keeps it');

  // An account that came through the switch from emails keeps the part before
  // the @ even when it is shorter than a new name may be, and saves as it is.
  db.prepare(`INSERT INTO users (id, name, username, password, role, is_active, created_at, updated_at)
    VALUES ('legacy-short', 'Zoe', 'z', 'hash', 'cashier', 1, ?, ?)`).run(now(), now());
  result = await request(app).put('/api/staff/legacy-short').set(ownerAuth).send({ name: 'Zoe B.', username: 'Z' });
  assertEqual(result.status, 200, 'a short migrated username is kept on save');
  assertEqual(result.body.staff.username, 'z', 'and stays the same');
  result = await request(app).put('/api/staff/legacy-short').set(ownerAuth).send({ username: 'b' });
  assertEqual(result.body.code, 'username_invalid', 'but a new short one is still refused');
}

async function main() {
  console.log('Usernames instead of emails');
  console.log('='.repeat(60));
  checkRule();
  try {
    checkMigration();
  } catch (error: any) {
    if (isNativeAbiMismatch(error)) {
      console.log('  ⚠ Skipping: better-sqlite3 ABI mismatch (run via Electron)');
      process.exit(77);
    }
    throw error;
  }
  checkRestoreMerge();
  await checkStaffApi();

  const results = getResults();
  console.log(`\nResults: ${results.passed}/${results.total} passed`);
  if (results.failed > 0) throw new Error(`${results.failed} username assertion(s) failed`);
}

main()
  .then(() => {
    closeDatabase();
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('\nUsername tests passed');
  })
  .catch((error) => {
    try { closeDatabase(); } catch { }
    Module._load = originalLoad;
    fs.rmSync(testDir, { recursive: true, force: true });
    console.error(error);
    process.exit(1);
  });
