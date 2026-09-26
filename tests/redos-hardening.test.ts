/**
 * Regression test for the js/polynomial-redos hardening:
 *  - bounded username validation and shaping (main/lib/username.ts)
 *
 * Usage: node tests/run-electron-node-test.cjs tests/redos-hardening.test.ts
 */
const Module = require('module');
const originalLoad = Module._load;
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert').strict;
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-redos-'));

Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') {
    return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  }
  return originalLoad.apply(this, arguments as any);
};

const { isValidUsername, normalizeUsername, usernameBase, USERNAME_MAX_LENGTH } = require('../main/lib/username');

function elapsedMs(fn: () => unknown): number {
  const started = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - started) / 1e6;
}

function run() {
  console.log('Testing ReDoS hardening...');

  // ── Username validation length bound ──────────────────────────────
  assert.equal(isValidUsername('mario.rossi'), true, 'normal username is valid');
  assert.equal(isValidUsername('mario rossi'), false, 'a username with a space is invalid');
  assert.equal(
    isValidUsername('a'.repeat(USERNAME_MAX_LENGTH + 1)),
    false,
    'over-long username is rejected by the length bound before the regex runs',
  );
  // A string shaped to make a separator run backtrack is rejected by the
  // length bound, and shaping one (from a name or an old email) stays linear.
  const pathological = 'a' + '.'.repeat(50_000) + '!';
  assert.equal(isValidUsername(pathological), false, 'pathological input is rejected without regex backtracking');
  assert.ok(elapsedMs(() => usernameBase('.'.repeat(50_000) + 'a' + '-'.repeat(50_000))) < 250, 'shaping a long run of separators stays fast');
  assert.ok(normalizeUsername('x'.repeat(100_000)).length <= 256, 'normalizing caps the input before any work on it');

  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('✅ ReDoS hardening tests passed');
}

run();
