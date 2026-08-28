/**
 * Regression test for the js/polynomial-redos hardening:
 *  - bounded email validation (auth.ts isValidEmail)
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

const { isValidEmail, MAX_EMAIL_LENGTH } = require('../main/routes/auth');

function run() {
  console.log('Testing ReDoS hardening...');

  // ── Email validation length bound ─────────────────────────────────
  assert.equal(isValidEmail('owner@example.com'), true, 'normal email is valid');
  assert.equal(isValidEmail('not-an-email'), false, 'malformed email is invalid');
  assert.equal(
    isValidEmail('a'.repeat(MAX_EMAIL_LENGTH + 1) + '@example.com'),
    false,
    'over-long email is rejected by the length bound before the regex runs',
  );
  // A ReDoS-shaped string is rejected purely by the length bound, so it never
  // reaches the backtracking regex.
  assert.equal(
    isValidEmail('!@!.' + '!.'.repeat(1000)),
    false,
    'pathological ReDoS input is rejected without regex backtracking',
  );

  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('✅ ReDoS hardening tests passed');
}

run();
