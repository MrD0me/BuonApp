import type { CartItem, Order } from '@/lib/types';
import { cartItemToPayload, type OrderItemPayload } from '@/lib/cart-payload';

/**
 * The handheld's send queue (docs/palmare.md, «La coda d'invio»).
 *
 * Pressing Invia does not send a ticket: it writes it here, frozen, and then
 * the queue sends it. A phone on the edge of the Wi-Fi loses the PC for a
 * minute, or loses the answer to a request the PC did receive; before this,
 * the one record of a send in doubt blocked every later send on every table
 * until the page was reloaded, and the reload threw the ticket away. Here a
 * ticket waits for as long as it has to, and the waiter goes on to the next
 * table.
 *
 * Three rules keep it from ever sending a dish twice:
 *
 * - **Frozen at the tap.** The key, the address and the body of an entry are
 *   fixed when the waiter presses Invia, and every retry sends them again
 *   unchanged. The backend keeps every key it has answered and replays the
 *   answer (order_idempotency), so a request that did arrive comes back as
 *   what it did, not as a second order.
 * - **The backend decides who opens a table.** An order is opened with
 *   `only_if_table_free`: if the table was opened meanwhile — another phone,
 *   the till, or an earlier ticket of this phone that just landed — the
 *   answer is a 409 naming the open order, which proves nothing was written,
 *   and the entry goes on as an addition to that order under a key derived
 *   from its own (`<key>:a`), the same on any phone that converts it.
 * - **Only a proven refusal gives the dishes back.** «Rimetti in comanda» is
 *   offered when the entry never left the phone or the PC refused it (a 4xx).
 *   After a timeout or a 5xx it may be on the check, and putting it back would
 *   make it twice.
 *
 * Entries go one at a time and in order within a table — an order is opened
 * before anything is added to it, and the kitchen gets its rounds in the
 * order they were taken — but a table waiting for a human does not hold up
 * the others. An entry is sent only with the token of the waiter who wrote
 * it: the backend keeps keys per account.
 *
 * Nothing here touches React, the network or the clock: storage and time are
 * handed in, so the whole of it is tested in tests/server-app-queue.test.ts.
 */

export const SEND_QUEUE_STORAGE_KEY = 'buonapp:server-app-queue';
/**
 * How long a ticket may wait and still go out by itself (the owner's choice,
 * 2026-10-07). Past it the waiter decides: a starter that reaches the kitchen
 * forty minutes late is a starter nobody is waiting for.
 */
export const AUTO_SEND_MAX_AGE_MS = 30 * 60 * 1000;
/** Answers in the 5xx range before an entry stops retrying by itself. */
export const SERVER_ERROR_ATTEMPTS = 3;
const SERVER_ERROR_BACKOFF_MS = [10_000, 30_000, 60_000];

export interface QueueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface CreateBody {
  table_id: string;
  type: 'dine_in';
  guest_count: number;
  special_instructions?: string;
  items: OrderItemPayload[];
  only_if_table_free?: true;
}

export interface AppendBody {
  items: OrderItemPayload[];
}

export type QueueRequest =
  | { kind: 'create'; body: CreateBody }
  | { kind: 'append'; orderId: number; body: AppendBody };

export type AttentionReason =
  | 'refused'
  | 'order_closed'
  | 'table_missing'
  | 'stock'
  | 'server_error'
  | 'conflict'
  | 'too_old';

export interface Attention {
  reason: AttentionReason;
  /** The PC said no: nothing of this entry is on the check. */
  refused: boolean;
  code?: string;
  message?: string;
  at: number;
}

export interface QueueEntry {
  v: 1;
  id: string;
  /** The Idempotency-Key, fixed when the entry is written. */
  key: string;
  userId: string;
  userName: string;
  tableId: string;
  tableName: string;
  createdAt: number;
  /** The draft this ticket came from, so a reload never brings it back as unsent. */
  draftId?: string;
  /** The ticket as it was sent: shown while it waits, and what goes back into the cart. */
  lines: CartItem[];
  guestCount: number;
  orderNotes: string;
  request: QueueRequest;
  /** Opened as a new order, found the table open, gone on as an addition. */
  converted?: { orderId: number; orderNumber?: string; own: boolean };
  /** Written before the first attempt: the request may have reached the PC. */
  sent: boolean;
  /** 5xx answers so far. */
  attempts: number;
  /** Not before this, after a 5xx. */
  retryAt?: number;
  /** Waiting for the waiter, not for the network. */
  attention?: Attention;
  /** «Invia lo stesso» past the age limit. */
  force?: boolean;
  /** Carried over from the retry records of the version before: no lines to give back. */
  legacy?: boolean;
}

export interface KotEntry {
  orderId: number;
  tableId: string;
  tableName: string;
  userId: string;
  since: number;
}

export interface QueueState {
  v: 1;
  entries: QueueEntry[];
  /** Orders whose new rows still have to be sent to the kitchen, one ticket each. */
  kot: KotEntry[];
}

export const EMPTY_QUEUE: QueueState = { v: 1, entries: [], kot: [] };

function isEntry(value: unknown): value is QueueEntry {
  const entry = value as Partial<QueueEntry> | null;
  return !!entry
    && entry.v === 1
    && typeof entry.id === 'string'
    && typeof entry.key === 'string'
    && typeof entry.userId === 'string'
    && typeof entry.tableId === 'string'
    && typeof entry.createdAt === 'number'
    && Array.isArray(entry.lines)
    && !!entry.request
    && (entry.request.kind === 'create' || (entry.request.kind === 'append' && typeof entry.request.orderId === 'number'));
}

function isKot(value: unknown): value is KotEntry {
  const kot = value as Partial<KotEntry> | null;
  return !!kot && typeof kot.orderId === 'number' && typeof kot.userId === 'string';
}

/** The queue as stored; an entry that does not read as one is dropped, never guessed at. */
export function loadQueue(storage: QueueStorage | null): QueueState {
  if (!storage) return EMPTY_QUEUE;
  try {
    const raw = storage.getItem(SEND_QUEUE_STORAGE_KEY);
    if (!raw) return EMPTY_QUEUE;
    const parsed = JSON.parse(raw) as Partial<QueueState>;
    return {
      v: 1,
      entries: Array.isArray(parsed.entries) ? parsed.entries.filter(isEntry) : [],
      kot: Array.isArray(parsed.kot) ? parsed.kot.filter(isKot) : [],
    };
  } catch {
    return EMPTY_QUEUE;
  }
}

/** False when the browser would not keep it: the caller must not let go of the ticket then. */
export function saveQueue(storage: QueueStorage | null, state: QueueState): boolean {
  if (!storage) return false;
  try {
    const serialized = JSON.stringify(state);
    storage.setItem(SEND_QUEUE_STORAGE_KEY, serialized);
    return storage.getItem(SEND_QUEUE_STORAGE_KEY) === serialized;
  } catch {
    return false;
  }
}

export interface Ticket {
  userId: string;
  userName: string;
  tableId: string;
  tableName: string;
  lines: CartItem[];
  guestCount: number;
  orderNotes: string;
  draftId?: string;
}

/**
 * The ticket written as an entry, frozen.
 *
 * An order known open on the table is added to — the derived rule of the
 * till: whatever is open on the table now. Otherwise the entry opens it,
 * guarded; and if this phone already has an opening waiting for the same
 * table, this one carries that one's covers and notes, since the waiter saw
 * them as already set and could not change them here.
 */
export function enqueueTicket(
  state: QueueState,
  ticket: Ticket,
  context: { openOrderId: number | null; now: number; newId: () => string; newKey: () => string },
): { state: QueueState; entry: QueueEntry } {
  const items = ticket.lines.map(cartItemToPayload);
  const opening = queuedOpeningFor(state, ticket.userId, ticket.tableId);
  const guestCount = opening ? opening.guestCount : ticket.guestCount;
  const orderNotes = opening ? opening.orderNotes : ticket.orderNotes;
  const request: QueueRequest = context.openOrderId !== null
    ? { kind: 'append', orderId: context.openOrderId, body: { items } }
    : {
      kind: 'create',
      body: {
        table_id: ticket.tableId,
        type: 'dine_in',
        guest_count: guestCount,
        ...(orderNotes ? { special_instructions: orderNotes } : {}),
        items,
        only_if_table_free: true,
      },
    };
  const entry: QueueEntry = {
    v: 1,
    id: context.newId(),
    key: context.newKey(),
    userId: ticket.userId,
    userName: ticket.userName,
    tableId: ticket.tableId,
    tableName: ticket.tableName,
    createdAt: context.now,
    ...(ticket.draftId ? { draftId: ticket.draftId } : {}),
    lines: ticket.lines,
    guestCount,
    orderNotes,
    request,
    sent: false,
    attempts: 0,
  };
  return { state: { ...state, entries: [...state.entries, entry] }, entry };
}

/** An entry of this waiter that still has to open the table — what a second ticket there goes after. */
export function queuedOpeningFor(state: QueueState, userId: string, tableId: string): QueueEntry | null {
  return state.entries.find((entry) => (
    entry.userId === userId && entry.tableId === tableId && entry.request.kind === 'create'
  )) || null;
}

function isWaitingOnHuman(entry: QueueEntry): boolean {
  return !!entry.attention;
}

/**
 * The entry to send next, or null.
 *
 * Within a table only the oldest entry may go, and if it waits — for a human,
 * or after a 5xx — the table waits with it. Among tables, the oldest head
 * goes first.
 */
export function nextEntry(state: QueueState, userId: string, now: number): QueueEntry | null {
  const heads = new Map<string, QueueEntry>();
  for (const entry of state.entries) {
    if (entry.userId !== userId || heads.has(entry.tableId)) continue;
    heads.set(entry.tableId, entry);
  }
  let next: QueueEntry | null = null;
  for (const head of heads.values()) {
    if (isWaitingOnHuman(head)) continue;
    if (head.retryAt !== undefined && head.retryAt > now) continue;
    if (!next || head.createdAt < next.createdAt) next = head;
  }
  return next;
}

/** Past the age limit, unless the waiter said to send it anyway. */
export function isTooOld(entry: QueueEntry, now: number): boolean {
  return !entry.force && now - entry.createdAt > AUTO_SEND_MAX_AGE_MS;
}

function update(state: QueueState, id: string, change: (entry: QueueEntry) => QueueEntry): QueueState {
  return { ...state, entries: state.entries.map((entry) => (entry.id === id ? change(entry) : entry)) };
}

/** Written before the request leaves: from here on it may be on the check. */
export function markSent(state: QueueState, id: string): QueueState {
  return update(state, id, (entry) => ({ ...entry, sent: true }));
}

/**
 * The PC took it. The entry goes, and its order joins the kitchen list in
 * the same write — a crash between the two would otherwise lose the ticket
 * for the kitchen or keep the entry for a second send.
 */
export function completeEntry(
  state: QueueState,
  id: string,
  order: Pick<Order, 'id'>,
  options: { kitchen: boolean; now: number },
): QueueState {
  const entry = state.entries.find((candidate) => candidate.id === id);
  if (!entry) return state;
  const entries = state.entries.filter((candidate) => candidate.id !== id);
  const kot = options.kitchen && !state.kot.some((ticket) => ticket.orderId === order.id)
    ? [...state.kot, { orderId: order.id, tableId: entry.tableId, tableName: entry.tableName, userId: entry.userId, since: options.now }]
    : state.kot;
  return { ...state, entries, kot };
}

/**
 * The table was open: the same dishes go on as an addition to that order.
 * The key is derived from the entry's own, so two phones that convert the
 * same entry send the same request. Covers and notes stay with the order
 * that is open: an addition carrying notes would overwrite that order's.
 */
export function convertToAppend(
  state: QueueState,
  id: string,
  open: { orderId: number; orderNumber?: string; own: boolean },
): QueueState {
  return update(state, id, (entry) => ({
    ...entry,
    key: entry.key.endsWith(':a') ? entry.key : `${entry.key}:a`,
    request: { kind: 'append', orderId: open.orderId, body: { items: entry.request.body.items } },
    converted: { orderId: open.orderId, ...(open.orderNumber ? { orderNumber: open.orderNumber } : {}), own: open.own },
    sent: false,
    attempts: 0,
    retryAt: undefined,
  }));
}

/** A 5xx: it may be on the check. Again in a while, and after a few times, ask the waiter. */
export function backOff(state: QueueState, id: string, now: number, detail?: { code?: string; message?: string }): QueueState {
  return update(state, id, (entry) => {
    const attempts = entry.attempts + 1;
    if (attempts >= SERVER_ERROR_ATTEMPTS) {
      return {
        ...entry,
        attempts,
        retryAt: undefined,
        attention: { reason: 'server_error', refused: false, ...detail, at: now },
      };
    }
    return { ...entry, attempts, retryAt: now + SERVER_ERROR_BACKOFF_MS[Math.min(attempts - 1, SERVER_ERROR_BACKOFF_MS.length - 1)] };
  });
}

export function needsAttention(state: QueueState, id: string, attention: Attention): QueueState {
  return update(state, id, (entry) => ({ ...entry, retryAt: undefined, attention }));
}

/** «Riprova»: the same request, the same key, from the start of its retries. */
export function retryEntry(state: QueueState, id: string): QueueState {
  return update(state, id, (entry) => ({ ...entry, attention: undefined, attempts: 0, retryAt: undefined }));
}

/** «Invia lo stesso», for one past the age limit: the same key, so a second send is a replay. */
export function sendAnyway(state: QueueState, id: string): QueueState {
  return update(state, id, (entry) => ({ ...entry, force: true, attention: undefined, attempts: 0, retryAt: undefined }));
}

export function removeEntry(state: QueueState, id: string): QueueState {
  return { ...state, entries: state.entries.filter((entry) => entry.id !== id) };
}

export function removeKot(state: QueueState, orderId: number): QueueState {
  return { ...state, kot: state.kot.filter((ticket) => ticket.orderId !== orderId) };
}

/** Whether the dishes may go back into the cart: never left the phone, or the PC said no. */
export function canPutBack(entry: QueueEntry): boolean {
  if (entry.legacy || entry.lines.length === 0) return false;
  return !entry.sent || entry.attention?.refused === true;
}

/** What an answer — or no answer — means for an entry. */
export type WriteVerdict =
  | { kind: 'transient' }
  | { kind: 'auth' }
  | { kind: 'server' }
  | { kind: 'convert'; orderId: number; orderNumber?: string }
  | { kind: 'attention'; attention: Omit<Attention, 'at'> };

export interface WriteFailure {
  /** The HTTP status; none when no answer came back. */
  status?: number;
  code?: string;
  message?: string;
  orderId?: number;
  orderNumber?: string;
}

const TRANSIENT_STATUSES = new Set([408, 425, 429, 502, 503, 504]);

const REASON_BY_CODE: Record<string, AttentionReason> = {
  order_closed: 'order_closed',
  order_not_found: 'order_closed',
  table_not_found: 'table_missing',
  insufficient_stock: 'stock',
};

export function classifyWriteFailure(entry: QueueEntry, failure: WriteFailure): WriteVerdict {
  const { status, code, message } = failure;
  if (status === undefined) return { kind: 'transient' };
  if (status === 401) return { kind: 'auth' };
  if (TRANSIENT_STATUSES.has(status)) return { kind: 'transient' };
  if (status === 409 && code === 'table_has_open_order' && entry.request.kind === 'create' && typeof failure.orderId === 'number') {
    return { kind: 'convert', orderId: failure.orderId, ...(failure.orderNumber ? { orderNumber: failure.orderNumber } : {}) };
  }
  if (status === 409 && code === 'idempotency_conflict') {
    // Cannot happen with a frozen body, and if it does nobody knows what is
    // on the check: the waiter looks, it is not given back.
    return { kind: 'attention', attention: { reason: 'conflict', refused: false, code, message } };
  }
  if (status >= 400 && status < 500) {
    return { kind: 'attention', attention: { reason: (code && REASON_BY_CODE[code]) || 'refused', refused: true, code, message } };
  }
  return { kind: 'server' };
}

/** Whether a kitchen ticket that failed should be tried again on the next round. */
export function shouldRetryKitchen(status: number | undefined): boolean {
  return status === undefined || status === 401 || status === 408 || status === 429 || status === 503 || status === 504;
}

/** The current waiter's entries, in the order they were written. */
export function entriesOf(state: QueueState, userId: string): QueueEntry[] {
  return state.entries.filter((entry) => entry.userId === userId);
}

/** Waiters other than this one who left tickets on the phone, with how many. */
export function othersWaiting(state: QueueState, userId: string): { userName: string; count: number }[] {
  const byUser = new Map<string, { userName: string; count: number }>();
  for (const entry of state.entries) {
    if (entry.userId === userId) continue;
    const known = byUser.get(entry.userId);
    if (known) known.count += 1;
    else byUser.set(entry.userId, { userName: entry.userName, count: 1 });
  }
  return [...byUser.values()];
}

export interface LegacyOrderAttempt {
  userId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface LegacyAppendAttempt {
  userId: string;
  orderId: string;
  idempotencyKey: string;
  items: unknown[];
  specialInstructions?: string;
  createdAt: number;
}

/**
 * The retry records the version before this one may have left on the phone,
 * turned into entries already sent, with their key and body as they were: if
 * the PC has them it answers with what it did. They have no lines to give
 * back, and an order opened this way carries no guard — it was sent without.
 */
export function adoptLegacyAttempts(
  state: QueueState,
  legacy: { order: LegacyOrderAttempt | null; append: LegacyAppendAttempt | null },
  context: { userName: string; tableName: (tableId: string) => string; newId: () => string },
): QueueState {
  const entries = [...state.entries];
  const known = new Set(entries.map((entry) => entry.key));
  if (legacy.order && !known.has(legacy.order.idempotencyKey)) {
    const body = legacy.order.payload as unknown as CreateBody;
    const tableId = String(body.table_id ?? '');
    entries.push({
      v: 1,
      id: context.newId(),
      key: legacy.order.idempotencyKey,
      userId: legacy.order.userId,
      userName: context.userName,
      tableId,
      tableName: context.tableName(tableId),
      createdAt: legacy.order.createdAt,
      lines: [],
      guestCount: Number(body.guest_count) || 1,
      orderNotes: typeof body.special_instructions === 'string' ? body.special_instructions : '',
      request: { kind: 'create', body },
      sent: true,
      attempts: 0,
      legacy: true,
    });
  }
  const orderId = legacy.append ? Number(legacy.append.orderId) : NaN;
  if (legacy.append && Number.isFinite(orderId) && !known.has(legacy.append.idempotencyKey)) {
    entries.push({
      v: 1,
      id: context.newId(),
      key: legacy.append.idempotencyKey,
      userId: legacy.append.userId,
      userName: context.userName,
      tableId: `order:${orderId}`,
      tableName: context.tableName(`order:${orderId}`),
      createdAt: legacy.append.createdAt,
      lines: [],
      guestCount: 1,
      orderNotes: '',
      request: {
        kind: 'append',
        orderId,
        body: {
          items: legacy.append.items as OrderItemPayload[],
          ...(legacy.append.specialInstructions ? { special_instructions: legacy.append.specialInstructions } : {}),
        } as AppendBody,
      },
      sent: true,
      attempts: 0,
      legacy: true,
    });
  }
  return entries.length === state.entries.length ? state : { ...state, entries };
}
