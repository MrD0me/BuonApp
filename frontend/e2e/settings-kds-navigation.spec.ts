import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3001';

/**
 * The Settings tabs and the ?tab= deep link have to agree, in both directions.
 *
 * This used to be driven from a KDS entry in the sidebar. The bar was cut down
 * to the six screens a service actually walks through, and the kitchen display
 * moved inside Settings, so the entry the test clicked is gone — but the thing
 * it was guarding is not: the tab is chosen by the URL, the URL is rewritten by
 * the tab, and going back to a tab already visited must land on it again rather
 * than on whatever the last click left behind.
 */
test('the Settings tabs and the ?tab= deep link stay in step', async ({ page }) => {
  await page.goto(`${BASE}/auth/login`);
  await page.getByLabel('Email').fill('manager@buonapp.local');
  await page.getByLabel('Password').fill('E2ePass123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/?$/);

  await page.getByRole('button', { name: 'Kitchen Display', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/?\?tab=kds$/);
  await expect(page.getByText('Kitchen Display System', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'POS Workflow', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/?\?tab=pos$/);
  await expect(page.getByRole('heading', { name: 'POS Display', exact: true })).toBeVisible();

  // Back to a tab already visited: the regression this file was written for.
  await page.getByRole('button', { name: 'Kitchen Display', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/?\?tab=kds$/);
  await expect(page.getByText('Kitchen Display System', { exact: true })).toBeVisible();

  // And the other direction: a URL carrying the tab opens on it, which is what
  // the link out of the kitchen screen relies on.
  await page.goto(`${BASE}/settings?tab=kds`);
  await expect(page.getByText('Kitchen Display System', { exact: true })).toBeVisible();
});
