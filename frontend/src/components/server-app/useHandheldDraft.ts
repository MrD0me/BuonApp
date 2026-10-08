'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { newIdempotencyKey } from './server-api';
import {
  clearDraft, draftOutcome, draftSignature, hasContent, readDraft, restoredItems, saveDraft,
  type DraftMenuWindow, type DraftStorage, type HandheldDraft,
} from './handheld-draft';
import type { ServerUser } from './useServerSession';

/** Changes come in bursts — twenty taps on the menu window — and are written once the burst settles. */
const SAVE_DELAY_MS = 300;

function browserStorage(): DraftStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

interface Options {
  user: ServerUser | null;
  /** The catalogue and the floor have been read: a draft can be put back. */
  ready: boolean;
  products: Product[];
  /** What a table is called, for the draft to say; null for a table the floor does not show. */
  tableName: (tableId: string) => string | null;
  /** Whether a ticket written from this draft is already in the send queue. */
  isQueued: (draftId: string) => boolean;
  /** A draft was put back in the cart: reopen it, or offer it. */
  onRestore: (draft: HandheldDraft, outcome: 'reopen' | 'offer') => void;
}

export interface HandheldDraftHandle {
  /** The id of the ticket in the cart, for the send queue to keep with it. */
  currentDraftId: () => string | null;
  /** What the menu window has counted, or null when it closed the usual way. */
  setMenuWindow: (menuWindow: DraftMenuWindow | null) => void;
  /** A menu window that was open when the page went, waiting for Ordina to reopen it. */
  pendingMenuWindow: DraftMenuWindow | null;
  takePendingMenuWindow: () => void;
  /**
   * A menu window that went off screen without being closed — a back gesture
   * took Ordina away under it — set to open again when Ordina comes back.
   */
  reopenLeftMenuWindow: () => void;
  /** A draft older than half an hour, put back in the cart and offered on the floor. */
  offered: HandheldDraft | null;
  dismissOffer: () => void;
}

/**
 * The draft on screen (the rules are in `handheld-draft.ts`).
 *
 * Writes the cart, and the menu window if one is open, a moment after every
 * change and at once when the page goes into the background — the last
 * chance a phone gives before it may throw the page away. Reads it back once
 * per waiter per page, after the menu and the floor are known, and only into
 * an empty cart: a cart with dishes in it is newer than any draft.
 */
export function useHandheldDraft({ user, ready, products, tableName, isQueued, onRestore }: Options): HandheldDraftHandle {
  const storage = useMemo(() => browserStorage(), []);
  const draftId = useRef<string | null>(null);
  const menuWindow = useRef<DraftMenuWindow | null>(null);
  const restoredFor = useRef(new Set<string>());
  /** What was last written, and when: a save that would write the same thing writes nothing. */
  const lastSaved = useRef<{ signature: string; savedAt: number; tableId: string; tableName: string } | null>(null);
  const [pendingMenuWindow, setPendingMenuWindow] = useState<DraftMenuWindow | null>(null);
  const [offered, setOffered] = useState<HandheldDraft | null>(null);
  const latest = useRef({ user, tableName });
  useEffect(() => { latest.current = { user, tableName }; });

  const save = useCallback(() => {
    const current = latest.current.user;
    if (!current) return;
    const cart = useCartStore.getState();
    if (!cart.tableId || !hasContent(cart.items, menuWindow.current)) {
      clearDraft(storage, current.id);
      draftId.current = null;
      lastSaved.current = null;
      return;
    }
    // Only what the waiter changed is written, with the time of the change:
    // putting a draft back fills the cart, and saving that as new would make
    // a ticket from lunch look written a moment ago.
    const signature = draftSignature({
      tableId: cart.tableId,
      items: cart.items,
      guestCount: cart.guestCount,
      guestCountChosen: cart.guestCountChosen,
      orderNotes: cart.orderNotes,
      menuWindow: menuWindow.current,
    });
    if (lastSaved.current?.signature === signature) return;
    // A table gone from the floor keeps the name the draft had for it.
    const tableName = latest.current.tableName(cart.tableId)
      ?? (lastSaved.current?.tableId === cart.tableId ? lastSaved.current.tableName : cart.tableId);
    if (!draftId.current) draftId.current = newIdempotencyKey();
    const savedAt = Date.now();
    const kept = saveDraft(storage, {
      v: 1,
      id: draftId.current,
      userId: current.id,
      table: { id: cart.tableId, name: tableName },
      items: cart.items,
      guestCount: cart.guestCount,
      guestCountChosen: cart.guestCountChosen,
      orderNotes: cart.orderNotes,
      savedAt,
      ...(menuWindow.current ? { menuWindow: menuWindow.current } : {}),
    });
    if (kept) lastSaved.current = { signature, savedAt, tableId: cart.tableId, tableName };
  }, [storage]);

  const timer = useRef(0);
  const scheduleSave = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, SAVE_DELAY_MS);
  }, [save]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = useCartStore.subscribe(scheduleSave);
    const saveNow = () => {
      window.clearTimeout(timer.current);
      save();
    };
    const onHidden = () => { if (document.hidden) saveNow(); };
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      unsubscribe();
      window.clearTimeout(timer.current);
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [userId, save, scheduleSave]);

  // Once per waiter per page, when the menu and the floor are there.
  const restoreHandler = useRef(onRestore);
  const queuedCheck = useRef(isQueued);
  useEffect(() => { restoreHandler.current = onRestore; queuedCheck.current = isQueued; });
  useEffect(() => {
    if (!userId || !ready || restoredFor.current.has(userId)) return;
    // Read from the phone's storage, an outside source: what it finds
    // reaches React from a callback, after this render.
    const timer = window.setTimeout(() => {
      if (restoredFor.current.has(userId)) return;
      restoredFor.current.add(userId);
      const draft = readDraft(storage, userId, Date.now());
      if (!draft) return;
      // Sent already: the page went between writing it in the queue and
      // emptying the cart. The queue has it; the draft would send it twice.
      if (queuedCheck.current(draft.id)) {
        clearDraft(storage, userId);
        return;
      }
      const cart = useCartStore.getState();
      if (cart.items.length > 0) return;
      cart.loadItems(restoredItems(draft, products), draft.table.id, null, draft.guestCount, draft.orderNotes);
      useCartStore.setState({ guestCountChosen: draft.guestCountChosen, orderType: 'dine_in' });
      draftId.current = draft.id;
      menuWindow.current = draft.menuWindow ?? null;
      const restored = useCartStore.getState();
      lastSaved.current = {
        signature: draftSignature({
          tableId: draft.table.id,
          items: restored.items,
          guestCount: restored.guestCount,
          guestCountChosen: restored.guestCountChosen,
          orderNotes: restored.orderNotes,
          menuWindow: menuWindow.current,
        }),
        savedAt: draft.savedAt,
        tableId: draft.table.id,
        tableName: draft.table.name,
      };
      // A table the floor no longer shows cannot be reopened: the ticket is
      // offered instead, and goes with the waiter to the table they open next.
      const outcome = latest.current.tableName(draft.table.id) === null ? 'offer' : draftOutcome(draft, Date.now());
      if (outcome === 'reopen') setPendingMenuWindow(draft.menuWindow ?? null);
      else setOffered(draft);
      restoreHandler.current(draft, outcome);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [userId, ready, storage, products]);

  const setMenuWindow = useCallback((next: DraftMenuWindow | null) => {
    menuWindow.current = next;
    scheduleSave();
  }, [scheduleSave]);

  return {
    currentDraftId: useCallback(() => draftId.current, []),
    setMenuWindow,
    pendingMenuWindow,
    takePendingMenuWindow: useCallback(() => setPendingMenuWindow(null), []),
    reopenLeftMenuWindow: useCallback(() => {
      if (menuWindow.current) setPendingMenuWindow(menuWindow.current);
    }, []),
    offered,
    dismissOffer: useCallback(() => setOffered(null), []),
  };
}
