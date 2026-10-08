import type { CartItem, FixedMenuSelection, Product } from '@/lib/types';
import { normalizeCartItems } from '@/lib/cart-identity';

/**
 * The ticket being written, kept on the phone as it grows (docs/palmare.md,
 * «La comanda non si perde»).
 *
 * The cart lives in memory, and a phone loses memory more readily than a
 * till: a reload, a tab the browser threw away while the waiter answered a
 * call, an iPhone that reopened the app from scratch, a back gesture that
 * left the page. Twenty menus counted dish by dish went with it. A draft is
 * written after every change and read back on the next load: within half an
 * hour the phone goes straight back to the ticket — and to the menu window,
 * if one was open — and up to half a day later it offers it on the floor.
 *
 * The cart store itself is the till's too, and is not touched: the till keeps
 * its held tickets for this, and must not start restoring carts.
 *
 * Pure: storage and time are handed in (tests/server-app-draft.test.ts).
 */

const DRAFT_KEY_PREFIX = 'buonapp:server-app-draft:';
/** Past this a draft is offered on the floor rather than reopened. */
export const DRAFT_REOPEN_MS = 30 * 60 * 1000;
/** Past this it is a ticket from another service, and is dropped. */
export const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface DraftStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/** A fixed menu's window left open, with what had been counted in it. */
export interface DraftMenuWindow {
  menuProductId: string;
  /** The ticket line it was editing, when the menu was already on the ticket. */
  lineId?: string;
  menus: number | null;
  selection: FixedMenuSelection;
}

export interface HandheldDraft {
  v: 1;
  /** Which ticket this is: the send queue keeps it, so a ticket sent is never brought back. */
  id: string;
  userId: string;
  table: { id: string; name: string };
  items: CartItem[];
  guestCount: number;
  guestCountChosen: boolean;
  orderNotes: string;
  savedAt: number;
  menuWindow?: DraftMenuWindow;
}

export function draftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function isDraft(value: unknown, userId: string): value is HandheldDraft {
  const draft = value as Partial<HandheldDraft> | null;
  return !!draft
    && draft.v === 1
    && typeof draft.id === 'string'
    && draft.userId === userId
    && !!draft.table && typeof draft.table.id === 'string'
    && Array.isArray(draft.items)
    && typeof draft.savedAt === 'number';
}

/** The waiter's draft, or null; a broken, foreign or stale one is removed on the way. */
export function readDraft(storage: DraftStorage | null, userId: string, now: number): HandheldDraft | null {
  if (!storage) return null;
  const key = draftKey(userId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isDraft(parsed, userId) || now - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      storage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    try { storage.removeItem(key); } catch { /* nothing to clear */ }
    return null;
  }
}

/** False when the browser will not keep it. */
export function saveDraft(storage: DraftStorage | null, draft: HandheldDraft): boolean {
  if (!storage) return false;
  try {
    storage.setItem(draftKey(draft.userId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(storage: DraftStorage | null, userId: string): void {
  try { storage?.removeItem(draftKey(userId)); } catch { /* nothing to clear */ }
}

/** Whether there is anything worth keeping: dishes, or a menu window with something counted in it. */
export function hasContent(items: CartItem[], menuWindow?: DraftMenuWindow | null): boolean {
  return items.length > 0 || !!(menuWindow && (menuWindow.selection.length > 0 || menuWindow.menus !== null));
}

/**
 * What the waiter has written, and nothing else: the table, the dishes and
 * their counts, add-ons, notes and waves, the covers, the ticket's note and
 * the open menu window. Two drafts that say the same thing have the same
 * signature even when the copies of the dishes in them differ — a draft put
 * back in the cart carries the dishes as the menu reads now — so putting a
 * draft back does not count as writing it: its time stays the time the
 * waiter last touched it, and an old ticket stays old.
 */
export function draftSignature(content: {
  tableId: string;
  items: CartItem[];
  guestCount: number;
  guestCountChosen: boolean;
  orderNotes: string;
  menuWindow?: DraftMenuWindow | null;
}): string {
  return JSON.stringify({
    table: content.tableId,
    items: content.items.map((item) => [
      item.id,
      item.product.id,
      item.quantity,
      item.addons.map((addon) => [addon.id, addon.quantity ?? 1]),
      item.special_instructions,
      item.menu_selection ?? null,
      item.service_run ?? null,
    ]),
    guests: [content.guestCount, content.guestCountChosen],
    notes: content.orderNotes,
    menuWindow: content.menuWindow ?? null,
  });
}

/** What a draft found on load is for: reopened as it was, or offered on the floor. */
export function draftOutcome(draft: HandheldDraft, now: number): 'reopen' | 'offer' {
  return now - draft.savedAt <= DRAFT_REOPEN_MS ? 'reopen' : 'offer';
}

/**
 * The draft's lines, with each dish as the menu reads now: a price or a name
 * changed on the PC since the draft was written shows as it is. A dish no
 * longer on the menu keeps the copy the draft has — the PC decides at sending
 * whether it still takes it. Lines are normalised as a held ticket's are.
 */
export function restoredItems(draft: HandheldDraft, products: Product[]): CartItem[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return normalizeCartItems(draft.items.map((item) => ({ ...item, product: byId.get(item.product.id) ?? item.product })));
}
