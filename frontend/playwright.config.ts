import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  workers: 1, // Single shared backend server requires serial execution to prevent DB state races
  retries: process.env.CI ? 1 : 0,
  // `list` keeps the job log readable; `html` writes playwright-report/, the
  // directory the CI workflow already uploads as an artifact. Without it that
  // upload silently finds nothing, and the traces below are discarded with the
  // runner instead of being attached to the run.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry', // Upload traces for debugging CI flakes
  },
  webServer: {
    command: 'cd .. && node tests/run-electron-node-test.cjs tests/e2e-server.cjs',
    url: 'http://127.0.0.1:3002/api/health',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
