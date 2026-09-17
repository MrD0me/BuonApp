/**
 * Where the covers of a new order start.
 *
 * They used to start at one on every table, and the floor corrected the
 * counter on every order. A new order now starts from the booking's party or
 * the table's seats, and a count the floor set on the counter is never
 * replaced by a table's own number.
 *
 * Checks:
 *  - the seats of the table, and of the tables joined to it;
 *  - the booking's party over the seats;
 *  - what an order accepts (1-99), whatever the table says;
 *  - the cart: a table's number moves the counter until the floor touches it,
 *    and not after; covers read off an open order are not a choice; a held
 *    ticket comes back with its own; a clean cart follows the table again.
 *
 * Run: ts-node --transpile-only -P tests/tsconfig.json tests/table-covers.test.ts
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options?: unknown) {
  const resolved = request.startsWith('@/') ? path.resolve(__dirname, '../frontend/src', request.slice(2)) : request;
  return originalResolveFilename.call(this, resolved, parent, isMain, options);
};

const { coversForNewOrder, validCovers } = require('../frontend/src/lib/table-covers');
const { useCartStore } = require('../frontend/src/store/cart');

function table(id: string, capacity: number, extra: Record<string, unknown> = {}) {
  return { id, capacity, merged_into: null, reservation: null, ...extra };
}

function booking(guests: unknown) {
  return { id: 'r1', name: 'Rossi', guests, status: 'booked' };
}

function main() {
  console.log('Covers of a new order');
  console.log('='.repeat(60));

  // ── The number a table starts from ─────────────────────────────────────
  const t4 = table('t4', 4);
  assert.equal(coversForNewOrder(t4, [t4]), 4, 'a free table starts from its seats');

  const reserved = table('t6', 6, { reservation: booking(3) });
  assert.equal(coversForNewOrder(reserved, [reserved]), 3, 'a booked table starts from the party, not the seats');

  const unreadable = table('t5', 5, { reservation: booking('tanti') });
  assert.equal(coversForNewOrder(unreadable, [unreadable]), 5, 'a booking with no usable head count falls back to the seats');

  const leader = table('10', 4);
  const joinedA = table('11', 2, { merged_into: '10' });
  const joinedB = table('12', 6, { merged_into: 10 });
  const elsewhere = table('13', 8, { merged_into: '99' });
  assert.equal(
    coversForNewOrder(leader, [leader, joinedA, joinedB, elsewhere]),
    12,
    'a group leader counts the seats of every table joined to it, whatever type its id arrives as',
  );
  assert.equal(
    coversForNewOrder(table('10', 4, { reservation: booking(7) }), [leader, joinedA, joinedB]),
    7,
    'a booked group starts from the party',
  );

  assert.equal(coversForNewOrder(table('z', 0), []), 1, 'a table with no seats still starts at one');
  assert.equal(coversForNewOrder(table('big', 120), []), 99, 'never above what an order accepts');
  assert.equal(coversForNewOrder(table('n', null as unknown as number), []), 1, 'a table with no capacity at all starts at one');

  assert.equal(validCovers('4'), 4, 'a count from the address bar is read');
  for (const refused of [null, undefined, '', '0', '100', '2.5', 'abc', -3]) {
    assert.equal(validCovers(refused), null, `${JSON.stringify(refused)} is not a head count`);
  }

  // ── The cart ───────────────────────────────────────────────────────────
  const cart = () => useCartStore.getState();

  cart().clearCart();
  assert.equal(cart().guestCount, 1, 'a clean cart counts one');
  cart().setTableId('t4', 4);
  assert.equal(cart().guestCount, 4, 'choosing a table moves the counter to its number');
  cart().setTableId('t2', 2);
  assert.equal(cart().guestCount, 2, 'changing table moves it again while nobody has touched it');

  cart().chooseGuestCount(3);
  cart().setTableId('t6', 6);
  assert.equal(cart().guestCount, 3, 'a count set on the counter stays when the table changes');
  assert.equal(cart().tableId, 't6', 'the table changes all the same');
  cart().setTableId('t6');
  assert.equal(cart().guestCount, 3, 'a table set without a number leaves the counter alone');

  cart().clearCart();
  cart().setTableId('t2');
  cart().setGuestCount(5);
  cart().setTableId('t4', 4);
  assert.equal(cart().guestCount, 4, 'covers read off an open order are not a choice: a new order follows its table');

  cart().loadItems([], 't8', null, 2, '', 'held-1');
  cart().setTableId('t4', 4);
  assert.equal(cart().guestCount, 2, 'a held ticket keeps the covers it was put down with');

  cart().clearCart();
  cart().setTableId('t4', 4);
  assert.equal(cart().guestCount, 4, 'once cleared, the cart follows the table again');

  console.log('\n✅ Covers of a new order: all checks passed');
}

try {
  main();
} catch (error) {
  console.error('\n❌ Test failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  Module._resolveFilename = originalResolveFilename;
}
