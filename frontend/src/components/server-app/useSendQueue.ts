'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';
import { useTranslations } from 'use-intl';
import type { Order } from '@/lib/types';
import { clearAppendAttempt, getAppendAttemptStorage, readAppendAttempt, type AppendAttempt } from '@/lib/append-attempt';
import { newIdempotencyKey } from './server-api';
import { isReachable } from './connection';
import {
  adoptLegacyAttempts, backOff, canPutBack, classifyWriteFailure, completeEntry, convertToAppend, enqueueTicket, entriesOf,
  isTooOld, loadQueue, markSent, needsAttention, nextEntry, othersWaiting, queuedOpeningFor, removeEntry, removeKot,
  retryEntry, saveQueue, sendAnyway, shouldRetryKitchen,
  type LegacyOrderAttempt, type QueueEntry, type QueueState, type QueueStorage, type Ticket,
  type WriteFailure,
} from './send-queue';
import type { ServerUser } from './useServerSession';

/** A kitchen ticket waits for the printer, which can take longer than any other request. */
const KITCHEN_TIMEOUT_MS = 45_000;
/** How often a waiting queue looks again, while the screen is on. */
const ROUND_MS = 15_000;
/** Sent within this of the tap, it was the waiter watching: the toast says so plainly. */
const LIVE_SEND_MS = 8_000;
/** Where the version before this one kept a new order in doubt (order-attempt.ts, gone). */
const LEGACY_ORDER_ATTEMPT_KEY = 'buonapp:server-app-order-attempt';

function browserStorage(): QueueStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readLegacyOrderAttempt(storage: QueueStorage | null, userId: string): LegacyOrderAttempt | null {
  try {
    const raw = storage?.getItem(LEGACY_ORDER_ATTEMPT_KEY);
    if (!raw) return null;
    const attempt = JSON.parse(raw) as Partial<LegacyOrderAttempt>;
    if (attempt.userId !== userId || typeof attempt.idempotencyKey !== 'string' || !attempt.payload || typeof attempt.createdAt !== 'number') return null;
    return attempt as LegacyOrderAttempt;
  } catch {
    return null;
  }
}

function failureOf(error: unknown): WriteFailure {
  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } })?.response;
  if (!response) return {};
  const data = response.data && typeof response.data === 'object' ? response.data : {};
  return {
    status: response.status,
    code: typeof data.code === 'string' ? data.code : undefined,
    message: typeof data.error === 'string' ? data.error : undefined,
    orderId: typeof data.order_id === 'number' ? data.order_id : undefined,
    orderNumber: typeof data.order_number === 'string' ? data.order_number : undefined,
  };
}

const dishesOf = (entry: QueueEntry) => entry.lines.reduce((sum, line) => sum + line.quantity, 0) || entry.request.body.items.length;

export interface SendQueue {
  /** This waiter's entries, oldest first. */
  entries: QueueEntry[];
  /** Other waiters' tickets left on this phone. */
  others: { userName: string; count: number }[];
  /** A round of sending is under way. */
  sending: boolean;
  /** Writes the ticket; false when the phone would not keep it, and then the cart must stay. */
  enqueue: (ticket: Omit<Ticket, 'userId' | 'userName'>, openOrderId: number | null) => boolean;
  flush: () => void;
  retry: (id: string) => void;
  sendAnyway: (id: string) => void;
  discard: (id: string) => void;
  /** Takes an entry out of the queue to put its dishes back in the cart; null when that is not safe. */
  takeBack: (id: string) => QueueEntry | null;
  /** The entry of this waiter still waiting to open a table, if any. */
  openingFor: (tableId: string) => QueueEntry | null;
  /** Whether a ticket written from this draft is in the queue already. */
  holdsDraft: (draftId: string) => boolean;
}

interface Options {
  api: AxiosInstance | null;
  user: ServerUser | null;
  kotPrintingEnabled: boolean;
  applyOrder: (order: Order) => void;
  refreshFloor: () => Promise<void>;
  /** A name for a table the queue only knows by id, as the floor last said it. */
  tableName: (tableId: string) => string;
}

/**
 * The send queue on screen (the rules are in `send-queue.ts`).
 *
 * The queue lives in the phone's storage and is read again before every
 * change, so a reload, a crash or a second tab finds it as it was; what is on
 * screen is a copy. A round sends one entry at a time and stops at the first
 * sign that the PC is out of reach, to start again when it is back: the
 * connection coming back, the screen coming on, every fifteen seconds while a
 * ticket waits, and «Riprova».
 */
export function useSendQueue({ api, user, kotPrintingEnabled, applyOrder, refreshFloor, tableName }: Options): SendQueue {
  const t = useTranslations('serverApp');
  const storage = useMemo(() => browserStorage(), []);
  const [state, setState] = useState<QueueState>(() => loadQueue(storage));
  const [sending, setSending] = useState(false);
  /** The queue as it stands when the phone would not keep it: memory is all there is then. */
  const memory = useRef<QueueState | null>(null);
  const running = useRef(false);
  const again = useRef(false);
  /** Orders this phone opened in this session: finding one of them open is no news. */
  const ownOrders = useRef(new Set<number>());
  const adopted = useRef(new Set<string>());

  const latest = useRef({ api, user, kotPrintingEnabled, applyOrder, refreshFloor, tableName, t });
  useEffect(() => { latest.current = { api, user, kotPrintingEnabled, applyOrder, refreshFloor, tableName, t }; });

  const read = useCallback((): QueueState => memory.current ?? loadQueue(storage), [storage]);
  const write = useCallback((next: QueueState): boolean => {
    const kept = saveQueue(storage, next);
    memory.current = kept ? null : next;
    setState(next);
    return kept;
  }, [storage]);

  const sendKitchenTickets = useCallback(async (userId: string): Promise<void> => {
    const { api: client, kotPrintingEnabled: kitchen, t: translate } = latest.current;
    if (!client) return;
    for (const ticket of read().kot.filter((entry) => entry.userId === userId)) {
      if (!kitchen) {
        write(removeKot(read(), ticket.orderId));
        continue;
      }
      try {
        const { data } = await client.post('/api/printers/print-kot', { orderId: ticket.orderId }, { timeout: KITCHEN_TIMEOUT_MS });
        write(removeKot(read(), ticket.orderId));
        if (data?.printed !== false) {
          toast.success(data?.batch ? translate('kitchenTicketSentBatch', { batch: data.batch }) : translate('kitchenTicketSent'));
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        // Out of reach: the ticket stays on the list for the next round. A
        // printer that failed releases its rows on the PC, and the table
        // screen offers «Invia in cucina» again; kitchen tickets switched
        // off answer 403, which is no failure.
        if (shouldRetryKitchen(status)) return;
        write(removeKot(read(), ticket.orderId));
        if (status !== 403) toast.error(translate('kitchenTicketFailed'));
      }
    }
  }, [read, write]);

  const round = useCallback(async (): Promise<void> => {
    const { api: client, user: current, t: translate } = latest.current;
    if (!client || !current) return;
    if (!isReachable() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    let landed = false;
    for (let sent = 0; sent < 100; sent += 1) {
      const now = Date.now();
      const entry = nextEntry(read(), current.id, now);
      if (!entry) break;
      if (isTooOld(entry, now)) {
        write(needsAttention(read(), entry.id, { reason: 'too_old', refused: false, at: now }));
        continue;
      }
      if (!entry.sent) write(markSent(read(), entry.id));
      try {
        const headers = { 'Idempotency-Key': entry.key };
        const response = entry.request.kind === 'create'
          ? await client.post('/api/orders', entry.request.body, { headers })
          : await client.post(`/api/orders/${entry.request.orderId}/items`, entry.request.body, { headers });
        const order: Order | undefined = response.data?.order;
        const orderId = order?.id ?? (entry.request.kind === 'append' ? entry.request.orderId : null);
        if (orderId === null) throw new Error('The answer carried no order');
        write(completeEntry(read(), entry.id, { id: orderId }, { kitchen: latest.current.kotPrintingEnabled, now: Date.now() }));
        if (order) {
          latest.current.applyOrder(order);
          if (entry.request.kind === 'create') ownOrders.current.add(order.id);
        }
        landed = true;
        if (Date.now() - entry.createdAt < LIVE_SEND_MS && !entry.legacy) toast.success(translate('orderSent'));
        else toast.success(translate('queueSent', { table: entry.tableName, count: dishesOf(entry) }));
      } catch (error) {
        const failure = failureOf(error);
        const verdict = classifyWriteFailure(entry, failure);
        if (verdict.kind === 'transient' || verdict.kind === 'auth') return;
        if (verdict.kind === 'server') {
          write(backOff(read(), entry.id, Date.now(), { code: failure.code, message: failure.message }));
          continue;
        }
        if (verdict.kind === 'convert') {
          const own = ownOrders.current.has(verdict.orderId);
          write(convertToAppend(read(), entry.id, { orderId: verdict.orderId, orderNumber: verdict.orderNumber, own }));
          if (!own) toast(translate('tableWasOpen', { table: entry.tableName, order: verdict.orderNumber || `#${verdict.orderId}` }));
          continue;
        }
        write(needsAttention(read(), entry.id, { ...verdict.attention, at: Date.now() }));
        toast.error(translate('queueAttentionToast', { table: entry.tableName }));
      }
    }
    await sendKitchenTickets(current.id);
    if (landed) latest.current.refreshFloor().catch(() => { /* the next poll */ });
  }, [read, write, sendKitchenTickets]);

  const flush = useCallback(() => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setSending(true);
    void (async () => {
      try {
        do {
          again.current = false;
          await round();
        } while (again.current);
      } finally {
        running.current = false;
        setSending(false);
      }
    })();
  }, [round]);

  // Signed in — or back in after the session ran out — the queue goes. The
  // first time for a waiter in this page, whatever the version before left
  // half sent comes into the queue first.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    if (!adopted.current.has(userId)) {
      adopted.current.add(userId);
      const order = readLegacyOrderAttempt(storage, userId);
      const appendStorage = getAppendAttemptStorage();
      let append: AppendAttempt | null = null;
      try { append = readAppendAttempt(appendStorage, { userId }); } catch { append = null; }
      if (order || append) {
        const { user: current, tableName: nameOf } = latest.current;
        const next = adoptLegacyAttempts(read(), { order, append }, {
          userName: current?.name || current?.username || '',
          tableName: nameOf,
          newId: newIdempotencyKey,
        });
        if (write(next)) {
          try { window.localStorage.removeItem(LEGACY_ORDER_ATTEMPT_KEY); } catch { /* storage refused: it is read once per page anyway */ }
          if (append) clearAppendAttempt(appendStorage, append);
        }
      }
    }
    flush();
  }, [userId, storage, read, write, flush]);

  // While something waits: every fifteen seconds with the screen on, and the
  // moment it comes back on. Another tab that changed the queue is followed.
  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      if (document.hidden) return;
      if (entriesOf(read(), userId).length > 0 || read().kot.length > 0) flush();
    };
    const interval = window.setInterval(tick, ROUND_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    window.addEventListener('pageshow', tick);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'buonapp:server-app-queue') setState(read());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
      window.removeEventListener('pageshow', tick);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId, read, flush]);

  const enqueue = useCallback((ticket: Omit<Ticket, 'userId' | 'userName'>, openOrderId: number | null): boolean => {
    const current = latest.current.user;
    if (!current) return false;
    const { state: next } = enqueueTicket(read(), { ...ticket, userId: current.id, userName: current.name || current.username }, {
      openOrderId,
      now: Date.now(),
      newId: newIdempotencyKey,
      newKey: newIdempotencyKey,
    });
    // Only a ticket the phone has kept may leave the cart.
    if (!saveQueue(storage, next)) return false;
    memory.current = null;
    setState(next);
    flush();
    return true;
  }, [read, storage, flush]);

  const retry = useCallback((id: string) => {
    write(retryEntry(read(), id));
    flush();
  }, [read, write, flush]);

  const sendNow = useCallback((id: string) => {
    write(sendAnyway(read(), id));
    flush();
  }, [read, write, flush]);

  const discard = useCallback((id: string) => {
    write(removeEntry(read(), id));
  }, [read, write]);

  const takeBack = useCallback((id: string): QueueEntry | null => {
    const entry = read().entries.find((candidate) => candidate.id === id);
    if (!entry || !canPutBack(entry)) return null;
    write(removeEntry(read(), id));
    return entry;
  }, [read, write]);

  const openingFor = useCallback(
    (tableId: string) => (userId ? queuedOpeningFor(state, userId, tableId) : null),
    [state, userId],
  );

  const holdsDraft = useCallback(
    (draftId: string) => read().entries.some((entry) => entry.draftId === draftId),
    [read],
  );

  const entries = useMemo(() => (userId ? entriesOf(state, userId) : []), [state, userId]);
  const others = useMemo(() => (userId ? othersWaiting(state, userId) : []), [state, userId]);

  return { entries, others, sending, enqueue, flush, retry, sendAnyway: sendNow, discard, takeBack, openingFor, holdsDraft };
}
