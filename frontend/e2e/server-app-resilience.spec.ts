import { test, expect, devices, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';
import * as jwt from 'jsonwebtoken';

/**
 * The handheld under the conditions of a real service (docs/palmare.md): a
 * page that reloads mid-ticket, the Android back gesture, a fixed menu for a
 * table of twenty counted at speed, a menu re-read under a waiter scrolled
 * down the dishes, and the Wi-Fi going — with the PC opening the same table
 * meanwhile, or the answer to a send lost on the way back.
 *
 * Every test works on a table of its own, created here, and every test runs
 * in a fresh browser context, so nothing carries over between them.
 */

const BASE_API = 'http://localhost:3001';
const BASE_SERVER_APP = 'http://localhost:3003';
const SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
const managerToken = jwt.sign({ userId: 'e2e-manager', username: 'manager', role: 'manager' }, SECRET, { expiresIn: '1h' });
const waiterToken = jwt.sign({ userId: 'e2e-server', username: 'server', role: 'server' }, SECRET, { expiresIn: '1h' });

test.use({ ...devices['Pixel 7'] });

const run = Date.now().toString(36);
const dishName = (name: string) => `${name} ${run}`;
const tables: Record<string, string> = {};
let api: APIRequestContext;

async function post<T>(path: string, data: unknown): Promise<T> {
  const response = await api.post(path, { data });
  expect(response.ok(), `POST ${path} → ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

test.beforeAll(async () => {
  api = await playwrightRequest.newContext({
    baseURL: BASE_API,
    extraHTTPHeaders: { Authorization: `Bearer ${managerToken}`, 'Content-Type': 'application/json' },
  });
  await api.put('/api/settings/language', { data: { value: 'en' } });
  const category = async (name: string) => (await post<{ category: { id: string } }>('/api/categories', { name: `${name} ${run}` })).category.id;
  const starters = await category('Res starters');
  const mains = await category('Res mains');
  const extras = await category('Res extras');
  const dish = async (name: string, categoryId: string, extra: Record<string, unknown> = {}) => (
    await post<{ product: { id: string } }>('/api/products', { name: dishName(name), price: 10, category_id: categoryId, is_active: true, ...extra })
  ).product.id;
  await dish('Res Bruschetta', starters);
  await dish('Res Caprese', starters);
  await dish('Res Lasagne', mains);
  await dish('Res Carbonara', mains);
  await dish('Res Tagliatelle al ragu di cinghiale con funghi', mains);
  // Enough dishes for the menu to scroll on a phone.
  for (let n = 1; n <= 24; n += 1) await dish(`Res Extra ${n}`, extras);
  const menu = await dish('Res Menu', extras, { is_fixed_menu: true, price: 30 });
  const configured = await api.put(`/api/fixed-menus/${menu}`, {
    data: {
      courses: [
        { label: 'Antipasto', is_required: true, max_choices: 1, category_ids: [starters] },
        { label: 'Primo', is_required: true, max_choices: 1, category_ids: [mains] },
      ],
    },
  });
  expect(configured.ok()).toBeTruthy();
  for (const key of ['reload', 'back', 'menu', 'scroll', 'offline', 'converted', 'lost']) {
    const created = await post<{ table: { id: string } }>('/api/tables', { number: `Res ${key} ${run}`, capacity: 4 });
    tables[key] = created.table.id;
  }
});

test.afterAll(async () => {
  await api.dispose();
});

/** The phone, signed in as the e2e waiter, on a table when one is named. */
async function openPhone(page: Page, tableId?: string): Promise<void> {
  await page.goto(`${BASE_SERVER_APP}/server-standalone`);
  await page.evaluate((token) => localStorage.setItem('buonapp:server-app-token', token), waiterToken);
  await page.goto(`${BASE_SERVER_APP}/server-standalone${tableId ? `?table=${encodeURIComponent(tableId)}` : ''}`);
}

async function ordersOn(tableId: string): Promise<{ id: number; items: { product_name: string; quantity: number }[] }[]> {
  const response = await api.get('/api/orders', { params: { type: 'dine_in', status: 'pending,preparing,ready,served', per_page: 500 } });
  const { orders } = await response.json() as { orders: { id: number; table_id: string; items: { product_name: string; quantity: number }[] }[] };
  return orders.filter((order) => order.table_id === tableId);
}

const ticketBar = (page: Page) => page.getByRole('button', { name: /^Ticket/ });

test('a reload in the middle of a ticket brings the ticket back', async ({ page }) => {
  await openPhone(page, tables.reload);
  await page.getByRole('button', { name: 'Take order' }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Lasagne')}` }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Lasagne')}` }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Caprese')}` }).click();
  await expect(ticketBar(page)).toContainText('3');
  await page.waitForTimeout(600);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Res reload ${run}`);
  await expect(ticketBar(page)).toContainText('3');
});

test('back moves between the screens and does not leave or reload the page', async ({ page }) => {
  await openPhone(page, tables.back);
  await page.evaluate(() => { (window as unknown as { marker: string }).marker = 'same page'; });
  await page.getByRole('button', { name: 'Take order' }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Carbonara')}` }).click();
  await ticketBar(page).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ticket');

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Res back ${run}`);
  await expect(ticketBar(page)).toContainText('1');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Take order' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('same page');
});

test('counting a fixed menu for twenty moves no row under the finger', async ({ page }) => {
  await openPhone(page, tables.menu);
  await page.getByRole('button', { name: 'Take order' }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Menu')}` }).click();
  const dialog = page.locator('[data-slot="modal-content"]');
  await expect(dialog).toBeVisible();
  for (let menus = 0; menus < 20; menus += 1) await dialog.getByRole('button', { name: 'One more', exact: true }).click();
  await expect(dialog.locator('input[inputmode="numeric"]')).toHaveValue('20');

  const rowTops = () => dialog.locator('section button[aria-label^="One more: "]').evaluateAll((buttons) => (
    buttons.filter((button) => button.closest('section > div > div')?.firstElementChild === button)
      .map((button) => Math.round(button.getBoundingClientRect().top + (button.closest('[data-slot="modal-body"]')?.scrollTop ?? 0)))
  ));
  const footer = dialog.locator('[data-slot="modal-footer"]');
  const footerHeight = async () => Math.round((await footer.boundingBox())!.height);
  const footerBefore = await footerHeight();

  for (const name of ['Res Bruschetta', 'Res Caprese', 'Res Lasagne', 'Res Tagliatelle al ragu di cinghiale con funghi', 'Res Carbonara']) {
    const before = await rowTops();
    await dialog.getByRole('button', { name: `One more: ${dishName(name)}` }).first().click();
    expect(await rowTops(), `the rows stay where they were after the first ${name}`).toEqual(before);
  }
  expect(await footerHeight()).toBe(footerBefore);

  // Full: twenty starters, and another tap says so instead of doing nothing.
  for (let plates = 0; plates < 18; plates += 1) await dialog.getByRole('button', { name: `One more: ${dishName('Res Bruschetta')}` }).first().click();
  const starters = dialog.locator('section[aria-label="Antipasto"] header');
  await expect(starters).toContainText('20 of 20');
  // A finger taps a dish that is shown as unavailable; Playwright would refuse to.
  await dialog.getByRole('button', { name: `One more: ${dishName('Res Caprese')}` }).first().click({ force: true });
  await expect(starters.locator('span.bg-pending')).toHaveText('Full');
  await expect(starters).toContainText('20 of 20');
});

test('re-reading the menu does not pull the dishes back up', async ({ page }) => {
  await page.clock.install();
  await openPhone(page, tables.scroll);
  await page.getByRole('button', { name: 'Take order' }).click();
  await expect(page.getByRole('button', { name: `Add one ${dishName('Res Extra 24')}` })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(200);

  // A category renamed on the PC: the next read of the menu brings a new list of chips.
  const categories = await (await api.get('/api/categories')).json() as { categories: { id: string; name: string }[] };
  const extras = categories.categories.find((category) => category.name === `Res extras ${run}`)!;
  expect((await api.put(`/api/categories/${extras.id}`, { data: { name: `Res extras ${run} bis` } })).ok()).toBeTruthy();
  // The poll ticks every fifteen seconds and re-reads the menu once it is a
  // minute old; each step lets the answers of the tick before come back.
  for (let tick = 0; tick < 6; tick += 1) {
    await page.clock.runFor(15_000);
    await page.waitForTimeout(300);
  }
  await expect(page.getByText(`Res extras ${run} bis`)).toBeAttached();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
});

test('without a connection the ticket waits, and reaches the PC once', async ({ page, context }) => {
  await openPhone(page, tables.offline);
  await page.getByRole('button', { name: 'Take order' }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Lasagne')}` }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Bruschetta')}` }).click();
  await ticketBar(page).click();

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Res offline ${run}`);
  await expect(page.getByText('Waiting to be sent')).toBeVisible();
  await expect(page.getByRole('button', { name: /No connection to the PC/ })).toBeVisible();
  expect(await ordersOn(tables.offline)).toHaveLength(0);

  await context.setOffline(false);
  await expect(page.getByText('Waiting to be sent')).toHaveCount(0, { timeout: 20_000 });
  const orders = await ordersOn(tables.offline);
  expect(orders).toHaveLength(1);
  expect(orders[0].items.map((item) => item.product_name).sort()).toEqual([dishName('Res Bruschetta'), dishName('Res Lasagne')].sort());
});

test('a table opened on the PC while the phone was offline gets the dishes as an addition', async ({ page, context }) => {
  await openPhone(page, tables.converted);
  await page.getByRole('button', { name: 'Take order' }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Carbonara')}` }).click();
  await ticketBar(page).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await expect(page.getByText('Waiting to be sent')).toBeVisible();

  const products = await (await api.get('/api/products', { params: { active: 'true' } })).json() as { products: { id: string; name: string }[] };
  const caprese = products.products.find((product) => product.name === dishName('Res Caprese'))!;
  await post('/api/orders', { type: 'dine_in', table_id: tables.converted, guest_count: 2, items: [{ product_id: caprese.id, quantity: 1 }] });

  await context.setOffline(false);
  await expect(page.getByText('Waiting to be sent')).toHaveCount(0, { timeout: 20_000 });
  const orders = await ordersOn(tables.converted);
  expect(orders).toHaveLength(1);
  expect(orders[0].items.map((item) => item.product_name).sort()).toEqual([dishName('Res Caprese'), dishName('Res Carbonara')].sort());
});

test('a send whose answer is lost on the way back makes one order, not two', async ({ page }) => {
  await openPhone(page, tables.lost);
  await page.getByRole('button', { name: 'Take order' }).click();
  await page.getByRole('button', { name: `Add one ${dishName('Res Lasagne')}` }).click();
  await ticketBar(page).click();

  let lost = false;
  await page.route('**/api/orders', async (route) => {
    if (!lost && route.request().method() === 'POST') {
      lost = true;
      await route.fetch();
      await route.abort('connectionreset');
      return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await expect.poll(() => lost).toBe(true);
  await expect(page.getByText('Waiting to be sent')).toHaveCount(0, { timeout: 30_000 });
  const orders = await ordersOn(tables.lost);
  expect(orders).toHaveLength(1);
  expect(orders[0].items).toHaveLength(1);
});
