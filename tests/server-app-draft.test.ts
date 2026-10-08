/**
 * The handheld's draft (frontend/src/components/server-app/handheld-draft.ts).
 *
 * Checks:
 *  - a draft is kept per waiter and read back as written;
 *  - another waiter's, a broken, or a half-day-old draft is not read, and is
 *    removed;
 *  - within half an hour a draft is reopened, after that offered;
 *  - restored lines carry the dish as the menu reads now, and a dish gone
 *    from the menu keeps the draft's copy;
 *  - a menu window with something counted in it is worth keeping on its own;
 *  - a storage that refuses is reported, never thrown.
 *
 * Run: ts-node --transpile-only -P tests/tsconfig.json tests/server-app-draft.test.ts
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options?: unknown) {
  const resolved = request.startsWith('@/') ? path.resolve(__dirname, '../frontend/src', request.slice(2)) : request;
  return originalResolveFilename.call(this, resolved, parent, isMain, options);
};

const draftModule = require('../frontend/src/components/server-app/handheld-draft');

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.has(key) ? this.values.get(key)! : null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

let passed = 0;
function check(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const product = (id: string, name: string, price: number) => ({ id, name, price, category_id: 'c1', is_active: true });
const generateCartItemId = require('../frontend/src/lib/cart-identity').generateCartItemId;
const line = (p: ReturnType<typeof product>, quantity: number) => ({
  id: generateCartItemId(p.id, [], ''), product: p, quantity, addons: [], special_instructions: '',
});

function draft(extra: Record<string, unknown> = {}) {
  return {
    v: 1,
    id: 'draft-1',
    userId: 'u1',
    table: { id: 't20', name: 'Tav 20' },
    items: [line(product('p1', 'Lasagne', 10), 3)],
    guestCount: 20,
    guestCountChosen: true,
    orderNotes: 'compleanno',
    savedAt: 1_000,
    ...extra,
  };
}

console.log('The handheld draft');

check('a draft is kept per waiter and read back as written', () => {
  const storage = new MemoryStorage();
  assert.equal(draftModule.saveDraft(storage, draft()), true);
  assert.deepEqual(draftModule.readDraft(storage, 'u1', 2_000), draft());
  assert.equal(draftModule.readDraft(storage, 'u2', 2_000), null, 'not another waiter\'s');
  assert.ok(storage.getItem(draftModule.draftKey('u1')), 'and another waiter does not remove it');
});

check('a broken, foreign or half-day-old draft is not read, and is removed', () => {
  const storage = new MemoryStorage();
  storage.setItem(draftModule.draftKey('u1'), '{broken');
  assert.equal(draftModule.readDraft(storage, 'u1', 0), null);
  assert.equal(storage.getItem(draftModule.draftKey('u1')), null);
  storage.setItem(draftModule.draftKey('u1'), JSON.stringify(draft({ userId: 'u2' })));
  assert.equal(draftModule.readDraft(storage, 'u1', 0), null, 'a draft filed under the wrong waiter');
  draftModule.saveDraft(storage, draft());
  assert.equal(draftModule.readDraft(storage, 'u1', 1_000 + draftModule.DRAFT_MAX_AGE_MS + 1), null, 'from another service');
  assert.equal(storage.getItem(draftModule.draftKey('u1')), null);
});

check('within half an hour a draft is reopened, after that offered', () => {
  assert.equal(draftModule.draftOutcome(draft(), 1_000 + draftModule.DRAFT_REOPEN_MS), 'reopen');
  assert.equal(draftModule.draftOutcome(draft(), 1_000 + draftModule.DRAFT_REOPEN_MS + 1), 'offer');
});

check('restored lines carry the dish as the menu reads now', () => {
  const restored = draftModule.restoredItems(draft({
    items: [line(product('p1', 'Lasagne', 10), 3), line(product('p-gone', 'Piatto tolto', 8), 1)],
  }), [product('p1', 'Lasagne al forno', 11)]);
  assert.equal(restored.length, 2);
  assert.equal(restored[0].product.name, 'Lasagne al forno', 'the name the PC gives it now');
  assert.equal(restored[0].product.price, 11, 'and the price');
  assert.equal(restored[0].quantity, 3, 'with the plates counted');
  assert.equal(restored[1].product.name, 'Piatto tolto', 'a dish off the menu keeps the draft\'s copy');
});

check('putting a draft back is not writing it: the signature ignores the copies of the dishes', () => {
  const written = draft();
  const content = (items: unknown[], extra: Record<string, unknown> = {}) => ({
    tableId: 't20', items, guestCount: 20, guestCountChosen: true, orderNotes: 'compleanno', ...extra,
  });
  const restored = draftModule.restoredItems(written, [product('p1', 'Lasagne al forno', 11)]);
  assert.equal(
    draftModule.draftSignature(content(restored)),
    draftModule.draftSignature(content(written.items)),
    'the dish as the menu reads now is the same dish',
  );
  assert.notEqual(
    draftModule.draftSignature(content([{ ...written.items[0], quantity: 4 }])),
    draftModule.draftSignature(content(written.items)),
    'a plate more is a change',
  );
  assert.notEqual(
    draftModule.draftSignature(content(written.items, { menuWindow: { menuProductId: 'm1', menus: 20, selection: [] } })),
    draftModule.draftSignature(content(written.items)),
    'so is a menu window opened',
  );
  assert.notEqual(
    draftModule.draftSignature(content(written.items, { guestCount: 19 })),
    draftModule.draftSignature(content(written.items)),
    'and a cover less',
  );
});

check('a menu window with something counted in it is worth keeping on its own', () => {
  assert.equal(draftModule.hasContent([], null), false);
  assert.equal(draftModule.hasContent([], { menuProductId: 'm1', menus: null, selection: [] }), false);
  assert.equal(draftModule.hasContent([], { menuProductId: 'm1', menus: 20, selection: [] }), true);
  assert.equal(draftModule.hasContent([], { menuProductId: 'm1', menus: null, selection: [{ course_id: 'c1', product_id: 'p1', quantity: 2 }] }), true);
});

check('a storage that refuses is reported, never thrown', () => {
  const refusing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('denied'); } };
  assert.equal(draftModule.saveDraft(refusing, draft()), false);
  assert.equal(draftModule.readDraft(refusing, 'u1', 0), null);
  assert.doesNotThrow(() => draftModule.clearDraft(refusing, 'u1'));
  assert.equal(draftModule.saveDraft(null, draft()), false);
});

console.log(`\n✅ Handheld draft: ${passed} checks passed`);
