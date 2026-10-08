/**
 * The handheld's send queue (frontend/src/components/server-app/send-queue.ts).
 *
 * Checks:
 *  - an entry is frozen when written: its key and body never change on a
 *    retry, an open order is added to, a free table is opened with the guard;
 *  - a second ticket for a table whose opening is still queued carries that
 *    opening's covers and notes;
 *  - only the oldest entry of a table goes, a table that waits holds only
 *    itself, the oldest head goes first, another waiter's entries never;
 *  - what each answer means: no answer, 401, 408/425/429/502/503/504, the
 *    open-table 409, a key conflict, other refusals, 5xx;
 *  - a converted entry adds to the open order under a derived key, without
 *    notes; a 5xx backs off and then asks the waiter;
 *  - the dishes go back into the cart only when the PC provably has none;
 *  - past thirty minutes an entry waits for the waiter, unless told to go;
 *  - completing an entry and listing its kitchen ticket are one write;
 *  - the old retry records are adopted with their keys, once;
 *  - a storage that will not keep the queue is reported, and a broken one read
 *    as empty.
 *
 * Run: ts-node --transpile-only -P tests/tsconfig.json tests/server-app-queue.test.ts
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options?: unknown) {
  const resolved = request.startsWith('@/') ? path.resolve(__dirname, '../frontend/src', request.slice(2)) : request;
  return originalResolveFilename.call(this, resolved, parent, isMain, options);
};

const queue = require('../frontend/src/components/server-app/send-queue');

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.has(key) ? this.values.get(key)! : null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

let passed = 0;
function check(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const product = (id: string, name: string) => ({ id, name, price: 10, category_id: 'c1', is_active: true });
const line = (id: string, name: string, quantity = 1) => ({
  id: `line-${id}`, product: product(id, name), quantity, addons: [], special_instructions: '',
});

let counter = 0;
const ids = () => ({ newId: () => `entry-${++counter}`, newKey: () => `key-${counter + 1000}` });

function ticket(extra: Record<string, unknown> = {}) {
  return {
    userId: 'u1', userName: 'Mario', tableId: 't5', tableName: 'Tav 5',
    lines: [line('p1', 'Lasagne', 2)], guestCount: 4, orderNotes: 'compleanno', ...extra,
  };
}

console.log('The handheld send queue');

check('a free table is opened, guarded, with covers and notes', () => {
  const { entry } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: null, now: 1000, ...ids() });
  assert.equal(entry.request.kind, 'create');
  assert.equal(entry.request.body.only_if_table_free, true);
  assert.equal(entry.request.body.table_id, 't5');
  assert.equal(entry.request.body.guest_count, 4);
  assert.equal(entry.request.body.special_instructions, 'compleanno');
  assert.deepEqual(entry.request.body.items, [{ product_id: 'p1', quantity: 2, addons: null, special_instructions: null }]);
  assert.equal(entry.sent, false);
});

check('an open order is added to, with no covers and no notes in the body', () => {
  const { entry } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: 42, now: 1000, ...ids() });
  assert.equal(entry.request.kind, 'append');
  assert.equal(entry.request.orderId, 42);
  assert.deepEqual(Object.keys(entry.request.body), ['items']);
});

check('a second ticket behind a queued opening carries its covers and notes', () => {
  let state = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: null, now: 1000, ...ids() }).state;
  const second = queue.enqueueTicket(state, ticket({ guestCount: 1, orderNotes: '' }), { openOrderId: null, now: 2000, ...ids() });
  state = second.state;
  assert.equal(second.entry.request.kind, 'create');
  assert.equal(second.entry.request.body.guest_count, 4);
  assert.equal(second.entry.request.body.special_instructions, 'compleanno');
  assert.equal(state.entries.length, 2);
});

check('the key and the body stay the same through every retry', () => {
  let { state, entry } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: 7, now: 1000, ...ids() });
  const frozen = JSON.stringify({ key: entry.key, request: entry.request });
  state = queue.markSent(state, entry.id);
  state = queue.backOff(state, entry.id, 2000);
  state = queue.retryEntry(state, entry.id);
  state = queue.sendAnyway(state, entry.id);
  const after = state.entries[0];
  assert.equal(JSON.stringify({ key: after.key, request: after.request }), frozen);
  assert.equal(after.sent, true, 'once sent, always possibly on the check');
});

check('only the oldest entry of a table goes, and the oldest head first', () => {
  let state = queue.EMPTY_QUEUE;
  state = queue.enqueueTicket(state, ticket({ tableId: 't5' }), { openOrderId: null, now: 1000, ...ids() }).state;
  state = queue.enqueueTicket(state, ticket({ tableId: 't5' }), { openOrderId: null, now: 1500, ...ids() }).state;
  state = queue.enqueueTicket(state, ticket({ tableId: 't7' }), { openOrderId: null, now: 1200, ...ids() }).state;
  const [first, second, third] = state.entries;
  assert.equal(queue.nextEntry(state, 'u1', 5000).id, first.id, 'the oldest head');
  state = queue.needsAttention(state, first.id, { reason: 'refused', refused: true, at: 5000 });
  assert.equal(queue.nextEntry(state, 'u1', 5000).id, third.id, 'a table waiting for the waiter holds only itself');
  assert.notEqual(queue.nextEntry(state, 'u1', 5000).id, second.id, 'and the entry behind it on its own table waits');
});

check('a backed-off table waits until its time, and another waiter is never sent', () => {
  let state = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: null, now: 1000, ...ids() }).state;
  state = queue.backOff(state, state.entries[0].id, 2000);
  assert.equal(queue.nextEntry(state, 'u1', 2000), null, 'not before its retry time');
  assert.notEqual(queue.nextEntry(state, 'u1', 2000 + 10_001), null, 'and again after it');
  assert.equal(queue.nextEntry(state, 'u2', 99_999), null, 'never with somebody else\'s token');
});

check('what each answer means', () => {
  const create = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: null, now: 1000, ...ids() }).entry;
  const append = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: 9, now: 1000, ...ids() }).entry;
  assert.deepEqual(queue.classifyWriteFailure(create, {}), { kind: 'transient' }, 'no answer');
  assert.deepEqual(queue.classifyWriteFailure(create, { status: 401 }), { kind: 'auth' });
  for (const status of [408, 425, 429, 502, 503, 504]) {
    assert.deepEqual(queue.classifyWriteFailure(create, { status }), { kind: 'transient' }, `status ${status}`);
  }
  assert.deepEqual(
    queue.classifyWriteFailure(create, { status: 409, code: 'table_has_open_order', orderId: 12, orderNumber: 'ORD-12' }),
    { kind: 'convert', orderId: 12, orderNumber: 'ORD-12' },
  );
  assert.equal(queue.classifyWriteFailure(append, { status: 409, code: 'table_has_open_order', orderId: 12 }).kind, 'attention',
    'an addition is never converted');
  const conflict = queue.classifyWriteFailure(create, { status: 409, code: 'idempotency_conflict' });
  assert.equal(conflict.attention.reason, 'conflict');
  assert.equal(conflict.attention.refused, false, 'a conflict proves nothing either way');
  assert.equal(queue.classifyWriteFailure(append, { status: 400, code: 'order_closed' }).attention.reason, 'order_closed');
  assert.equal(queue.classifyWriteFailure(create, { status: 409, code: 'table_not_found' }).attention.reason, 'table_missing');
  assert.equal(queue.classifyWriteFailure(create, { status: 409, code: 'insufficient_stock' }).attention.reason, 'stock');
  assert.equal(queue.classifyWriteFailure(create, { status: 400, code: 'invalid_item' }).attention.refused, true);
  assert.deepEqual(queue.classifyWriteFailure(create, { status: 500 }), { kind: 'server' });
});

check('a converted entry adds to the open order, under a derived key, without notes', () => {
  let { state, entry } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: null, now: 1000, ...ids() });
  state = queue.markSent(state, entry.id);
  state = queue.convertToAppend(state, entry.id, { orderId: 12, orderNumber: 'ORD-12', own: false });
  const converted = state.entries[0];
  assert.equal(converted.key, `${entry.key}:a`);
  assert.equal(converted.request.kind, 'append');
  assert.equal(converted.request.orderId, 12);
  assert.deepEqual(Object.keys(converted.request.body), ['items']);
  assert.deepEqual(converted.request.body.items, entry.request.body.items);
  assert.equal(converted.sent, false, 'nothing went out under the new key yet');
  assert.deepEqual(converted.converted, { orderId: 12, orderNumber: 'ORD-12', own: false });
  state = queue.convertToAppend(state, entry.id, { orderId: 12, own: false });
  assert.equal(state.entries[0].key, `${entry.key}:a`, 'converting twice derives the same key');
});

check('a 5xx backs off, and after three asks the waiter without giving the dishes back', () => {
  let { state, entry } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: 3, now: 1000, ...ids() });
  state = queue.markSent(state, entry.id);
  state = queue.backOff(state, entry.id, 2000);
  assert.equal(state.entries[0].retryAt, 12_000);
  state = queue.backOff(state, entry.id, 13_000);
  assert.equal(state.entries[0].retryAt, 43_000);
  state = queue.backOff(state, entry.id, 44_000);
  assert.equal(state.entries[0].attention.reason, 'server_error');
  assert.equal(queue.canPutBack(state.entries[0]), false, 'it may be on the check');
});

check('the dishes go back only when the PC provably has none of them', () => {
  let { state, entry } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: 3, now: 1000, ...ids() });
  assert.equal(queue.canPutBack(state.entries[0]), true, 'never left the phone');
  state = queue.markSent(state, entry.id);
  assert.equal(queue.canPutBack(state.entries[0]), false, 'sent, no answer: it may be there');
  state = queue.needsAttention(state, entry.id, { reason: 'order_closed', refused: true, at: 2000 });
  assert.equal(queue.canPutBack(state.entries[0]), true, 'refused: it is not there');
});

check('past thirty minutes an entry waits for the waiter, unless told to go', () => {
  let { state, entry } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: 3, now: 0, ...ids() });
  assert.equal(queue.isTooOld(state.entries[0], queue.AUTO_SEND_MAX_AGE_MS), false);
  assert.equal(queue.isTooOld(state.entries[0], queue.AUTO_SEND_MAX_AGE_MS + 1), true);
  state = queue.sendAnyway(state, entry.id);
  assert.equal(queue.isTooOld(state.entries[0], queue.AUTO_SEND_MAX_AGE_MS * 10), false);
});

check('completing an entry lists its kitchen ticket in the same write, once per order', () => {
  let state = queue.EMPTY_QUEUE;
  state = queue.enqueueTicket(state, ticket(), { openOrderId: 3, now: 1000, ...ids() }).state;
  state = queue.enqueueTicket(state, ticket(), { openOrderId: 3, now: 1100, ...ids() }).state;
  const [first, second] = state.entries;
  state = queue.completeEntry(state, first.id, { id: 3 }, { kitchen: true, now: 2000 });
  state = queue.completeEntry(state, second.id, { id: 3 }, { kitchen: true, now: 2100 });
  assert.equal(state.entries.length, 0);
  assert.deepEqual(state.kot.map((ticketEntry: { orderId: number }) => ticketEntry.orderId), [3], 'one kitchen ticket for both rounds');
  const silent = queue.completeEntry(
    queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: 4, now: 1, ...ids() }).state,
    `entry-${counter}`, { id: 4 }, { kitchen: false, now: 2 },
  );
  assert.equal(silent.kot.length, 0, 'none when the house prints no kitchen tickets');
});

check('kitchen tickets that failed for want of the PC go again; a printer fault does not', () => {
  for (const status of [undefined, 401, 408, 429, 503, 504]) assert.equal(queue.shouldRetryKitchen(status), true, `status ${status}`);
  for (const status of [400, 403, 404, 502, 500]) assert.equal(queue.shouldRetryKitchen(status), false, `status ${status}`);
});

check('the old retry records are adopted with their keys, once', () => {
  const legacy = {
    order: { userId: 'u1', idempotencyKey: 'old-create', payload: { table_id: 't5', type: 'dine_in', guest_count: 3, items: [{ product_id: 'p1', quantity: 1 }] }, createdAt: 10 },
    append: { userId: 'u1', orderId: '8', idempotencyKey: 'old-append', items: [{ product_id: 'p1', quantity: 1 }], createdAt: 20 },
  };
  const context = { userName: 'Mario', tableName: (id: string) => `T(${id})`, newId: () => `legacy-${++counter}` };
  let state = queue.adoptLegacyAttempts(queue.EMPTY_QUEUE, legacy, context);
  assert.equal(state.entries.length, 2);
  const [create, append] = state.entries;
  assert.equal(create.key, 'old-create');
  assert.equal(create.request.body.only_if_table_free, undefined, 'sent without the guard, replayed without it');
  assert.equal(create.sent, true);
  assert.equal(append.request.orderId, 8);
  assert.equal(queue.canPutBack(create), false, 'nothing to give back');
  state = queue.adoptLegacyAttempts(state, legacy, context);
  assert.equal(state.entries.length, 2, 'adopting twice adds nothing');
});

check('the queue survives the storage, and a storage that will not keep it is reported', () => {
  const storage = new MemoryStorage();
  const { state } = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket(), { openOrderId: null, now: 1000, ...ids() });
  assert.equal(queue.saveQueue(storage, state), true);
  assert.deepEqual(queue.loadQueue(storage), state);
  const refusing = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.equal(queue.saveQueue(refusing, state), false);
  assert.equal(queue.saveQueue(null, state), false);
  storage.setItem(queue.SEND_QUEUE_STORAGE_KEY, '{not json');
  assert.deepEqual(queue.loadQueue(storage), queue.EMPTY_QUEUE, 'a broken record reads as empty');
  storage.setItem(queue.SEND_QUEUE_STORAGE_KEY, JSON.stringify({ v: 1, entries: [{ id: 'half' }], kot: [] }));
  assert.equal(queue.loadQueue(storage).entries.length, 0, 'an entry that does not read as one is dropped');
});

check('another waiter\'s tickets are counted, not sent', () => {
  let state = queue.enqueueTicket(queue.EMPTY_QUEUE, ticket({ userId: 'u2', userName: 'Lucia' }), { openOrderId: null, now: 1, ...ids() }).state;
  state = queue.enqueueTicket(state, ticket({ userId: 'u2', userName: 'Lucia' }), { openOrderId: null, now: 2, ...ids() }).state;
  assert.deepEqual(queue.othersWaiting(state, 'u1'), [{ userName: 'Lucia', count: 2 }]);
  assert.equal(queue.entriesOf(state, 'u1').length, 0);
});

console.log(`\n✅ Send queue: ${passed} checks passed`);
