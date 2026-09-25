/**
 * Server App auth must be limited to service staff (server role), and the
 * handheld must be able to fire kitchen tickets: sending an order from a
 * palmare has to reach the station printers, not only the KDS. A dish's photo
 * is the one forward open without a token, and it must arrive as bytes.
 */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';

const Module = require('module');
const originalLoad = Module._load;
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-server-app-server-role-'));

Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'electron') {
    return { app: { isPackaged: true, getPath: () => testDir, getVersion: () => 'test' } };
  }
  return originalLoad.apply(this, arguments as any);
};

async function getFreeTcpPort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  assert(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function postJson(baseUrl: string, pathName: string, body: unknown, token?: string) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function getJson(baseUrl: string, pathName: string, token: string) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: response.status, body: await response.json() };
}

// Not valid UTF-8 on purpose: bytes that survive being read as text would not
// prove the photo came through as bytes.
const DISH_PHOTO = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x80]);
const DISH_PHOTO_ETAG = '"dish-photo-1"';

/**
 * A stand-in for the main API behind the forwards, so what comes back through
 * them is known: one dish with a photo, and an empty 200 for anything else.
 */
async function startMainApiStandIn(port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    req.resume();
    if (req.method === 'GET' && req.url === '/api/products/p1/image') {
      if (req.headers['if-none-match'] === DISH_PHOTO_ETAG) {
        res.writeHead(304, { ETag: DISH_PHOTO_ETAG });
        res.end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': DISH_PHOTO.length,
        ETag: DISH_PHOTO_ETAG,
        'Cache-Control': 'no-cache',
      });
      res.end(DISH_PHOTO);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

/** A GET sent with its path exactly as written: fetch would fold dot segments away first. */
async function rawGetStatus(port: number, pathName: string): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, path: pathName, method: 'GET' }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.end();
  });
}

async function send(baseUrl: string, method: string, pathName: string, token?: string) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify({}),
  });
  await response.text();
  return response.status;
}

async function main() {
  console.log('Integration Test: Server App server-only auth');
  console.log('='.repeat(52));

  process.env.SERVER_APP_PORT = String(await getFreeTcpPort());
  // Where the forwards go: read by main/server when it is first imported.
  process.env.PORT = String(await getFreeTcpPort());
  const mainApi = await startMainApiStandIn(Number(process.env.PORT));

  const bcrypt = require('bcryptjs');
  const { initDatabase, getDatabase, closeDatabase, now, upsertSettings } = await import('../main/db');
  const { startServerApp, stopServerApp, getServerAppPort } = await import('../main/server-app');

  initDatabase();
  const db = getDatabase();
  const passwordHash = bcrypt.hashSync('ServerPass123!', 10);

  for (const role of ['owner', 'manager', 'cashier', 'chef', 'server']) {
    db.prepare(`
      INSERT INTO users (id, name, username, password, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(`server-app-${role}`, `Server App ${role}`, role, passwordHash, role, now(), now());
  }

  await startServerApp();
  const baseUrl = `http://127.0.0.1:${getServerAppPort()}`;

  try {
    for (const role of ['owner', 'manager', 'cashier', 'chef']) {
      const response = await postJson(baseUrl, '/api/auth/login', {
        username: role,
        password: 'ServerPass123!',
      });
      assert.equal(response.status, 403, `${role} cannot log in to Server App`);
      assert.match(String(response.body.error), /Only service staff/i);
    }

    // Typed on a phone: a capital from the keyboard and a stray space still sign in.
    const serverLogin = await postJson(baseUrl, '/api/auth/login', {
      username: ' Server ',
      password: 'ServerPass123!',
    });
    assert.equal(serverLogin.status, 200, 'server can log in to Server App');
    assert.equal(serverLogin.body.user.username, 'server', 'Server App returns the stored username');
    assert.equal(serverLogin.body.user.email, undefined, 'Server App no longer returns an email');
    assert.equal(serverLogin.body.user.role, 'server', 'Server App returns server role');
    assert.ok(serverLogin.body.access_token, 'Server App returns a token for server');

    const me = await getJson(baseUrl, '/api/auth/me', serverLogin.body.access_token);
    assert.equal(me.status, 200, 'server token remains valid on /api/auth/me');
    assert.equal(me.body.user.role, 'server', '/api/auth/me returns server role');

    // The kitchen-ticket route must be exposed on the Server App and pass its
    // role gate. What the main API answers downstream is that layer's business
    // (covered by issue-133-kds-kot-toggles) and is not asserted here: behind
    // this test the main API is the stand-in above, which answers anything.
    const kot = await postJson(baseUrl, '/api/printers/print-kot', { orderId: 999999 }, serverLogin.body.access_token);
    assert.notEqual(kot.status, 404, 'print-kot is exposed on the Server App');
    assert.notEqual(kot.status, 403, 'the Server App role gate lets a server through to print-kot');

    const unauthenticatedKot = await postJson(baseUrl, '/api/printers/print-kot', { orderId: 999999 });
    assert.equal(unauthenticatedKot.status, 401, 'print-kot on the Server App still requires a token');

    // The whole allowlist, same reasoning: exposed, past the role gate, and
    // closed without a token. What the main API says is its own business.
    const forwarded: [string, string][] = [
      ['GET', '/api/categories'],
      ['GET', '/api/products'],
      ['GET', '/api/tables'],
      ['GET', '/api/rooms'],
      ['GET', '/api/settings'],
      ['GET', '/api/orders'],
      ['GET', '/api/orders/1'],
      ['POST', '/api/orders'],
      ['POST', '/api/orders/1/items'],
      ['PATCH', '/api/orders/1/guests'],
      ['PATCH', '/api/orders/1/items/2/service-run'],
      ['PUT', '/api/orders/1/menu-groups/g1/courses/c1'],
      ['PATCH', '/api/orders/1/menu-groups/g1'],
    ];
    for (const [method, route] of forwarded) {
      const withToken = await send(baseUrl, method, route, serverLogin.body.access_token);
      assert.notEqual(withToken, 404, `${method} ${route} is exposed on the Server App`);
      assert.notEqual(withToken, 403, `${method} ${route} lets a server through`);
      assert.equal(await send(baseUrl, method, route), 401, `${method} ${route} requires a token`);
    }

    // Handhelds do not file guests, and they do not touch tables, bills or
    // payments: none of that is forwarded, whoever asks.
    const closed: [string, string][] = [
      ['GET', '/api/customers-search'],
      ['GET', '/api/crm/lookup'],
      ['POST', '/api/customers'],
      ['POST', '/api/tables'],
      ['PUT', '/api/tables/1'],
      ['PATCH', '/api/tables/1/status'],
      ['POST', '/api/bills/generate'],
      ['PATCH', '/api/orders/1/discount'],
      ['PATCH', '/api/orders/1/items/2/price'],
    ];
    for (const [method, route] of closed) {
      assert.equal(await send(baseUrl, method, route, serverLogin.body.access_token), 404, `${method} ${route} is not forwarded`);
    }

    // A dish's photo is the one route open without a token, because an <img>
    // cannot send one; and it comes through as bytes, where the JSON forward
    // would have read it as text and mangled it.
    const photo = await fetch(`${baseUrl}/api/products/p1/image`);
    assert.equal(photo.status, 200, 'a dish photo needs no token');
    assert.equal(photo.headers.get('content-type'), 'image/png', 'the photo keeps its type');
    assert.equal(photo.headers.get('etag'), DISH_PHOTO_ETAG, 'the photo keeps its ETag');
    assert.deepEqual(Buffer.from(await photo.arrayBuffer()), DISH_PHOTO, 'the photo arrives byte for byte');

    const revalidated = await fetch(`${baseUrl}/api/products/p1/image`, {
      headers: { 'If-None-Match': DISH_PHOTO_ETAG },
    });
    await revalidated.arrayBuffer();
    assert.equal(revalidated.status, 304, 'a photo the phone already holds comes back as a 304');

    assert.equal(await send(baseUrl, 'POST', '/api/products/p1/image'), 404, 'the photo route only reads');
    for (const dots of ['.', '..', '%2E', '%2E%2E']) {
      assert.equal(
        await rawGetStatus(getServerAppPort(), `/api/products/${dots}/image`),
        404,
        `a dot segment (${dots}) does not carry a tokenless request on to another route`,
      );
    }
    assert.equal(
      await send(baseUrl, 'GET', '/api/products/p1', serverLogin.body.access_token),
      404,
      'opening the photo does not open the product itself',
    );

    upsertSettings({ server_app_enabled: 'false' });
    try {
      assert.equal(await send(baseUrl, 'GET', '/api/products/p1/image'), 404, 'no photo while the Server App is switched off');
    } finally {
      upsertSettings({ server_app_enabled: 'true' });
    }
  } finally {
    await stopServerApp();
    await new Promise<void>((resolve) => mainApi.close(() => resolve()));
    closeDatabase();
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  console.log('ALL PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
