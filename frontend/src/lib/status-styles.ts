import type { Order, OrderItem, Reservation, Table } from '@/lib/types';

/**
 * Colours of state, in one place.
 *
 * A table, a dish in the kitchen, a bill: each has a handful of states, and
 * every screen used to paint them with its own literal Tailwind classes —
 * five copies of "occupied is red" that agreed by luck. This module maps a
 * state to a *tone* and a tone to classes built on the tokens in
 * `globals.css`, so the floor map on the PC, the tile on the handheld and the
 * badge on the order panel say the same thing in the same colour.
 *
 * Pure: no API, no store. It mounts on the handheld unchanged.
 */

export type Tone =
  | 'free' | 'occupied' | 'reserved' | 'cleaning' | 'held'
  | 'pending' | 'paid' | 'partial' | 'unpaid'
  | 'waiting' | 'preparing' | 'ready' | 'served'
  | 'cancelled' | 'neutral';

export interface ToneStyle {
  /** Pill: soft background, strong text. */
  badge: string;
  /** A solid dot or band in the strong colour. */
  dot: string;
  /** Text in the strong colour. */
  text: string;
  /** Border in the strong colour. */
  border: string;
  /** A thick band on the inline-start edge, in the strong colour. */
  band: string;
  /** The soft background on its own. */
  soft: string;
}

/*
 * Spelled out in full rather than built at runtime, so Tailwind's scanner
 * sees every class it has to emit.
 */
export const TONE_STYLES: Record<Tone, ToneStyle> = {
  free: { badge: 'bg-table-free-soft text-table-free', dot: 'bg-table-free', text: 'text-table-free', border: 'border-table-free', band: 'border-s-table-free', soft: 'bg-table-free-soft' },
  occupied: { badge: 'bg-table-occupied-soft text-table-occupied', dot: 'bg-table-occupied', text: 'text-table-occupied', border: 'border-table-occupied', band: 'border-s-table-occupied', soft: 'bg-table-occupied-soft' },
  reserved: { badge: 'bg-table-reserved-soft text-table-reserved', dot: 'bg-table-reserved', text: 'text-table-reserved', border: 'border-table-reserved', band: 'border-s-table-reserved', soft: 'bg-table-reserved-soft' },
  cleaning: { badge: 'bg-table-cleaning-soft text-table-cleaning', dot: 'bg-table-cleaning', text: 'text-table-cleaning', border: 'border-table-cleaning', band: 'border-s-table-cleaning', soft: 'bg-table-cleaning-soft' },
  held: { badge: 'bg-table-held-soft text-table-held', dot: 'bg-table-held', text: 'text-table-held', border: 'border-table-held', band: 'border-s-table-held', soft: 'bg-table-held-soft' },
  pending: { badge: 'bg-pending text-white', dot: 'bg-pending', text: 'text-pending', border: 'border-pending', band: 'border-s-pending', soft: 'bg-pending-soft' },
  paid: { badge: 'bg-paid-soft text-paid', dot: 'bg-paid', text: 'text-paid', border: 'border-paid', band: 'border-s-paid', soft: 'bg-paid-soft' },
  partial: { badge: 'bg-partial-soft text-partial', dot: 'bg-partial', text: 'text-partial', border: 'border-partial', band: 'border-s-partial', soft: 'bg-partial-soft' },
  unpaid: { badge: 'bg-unpaid-soft text-unpaid', dot: 'bg-unpaid', text: 'text-unpaid', border: 'border-unpaid', band: 'border-s-unpaid', soft: 'bg-unpaid-soft' },
  waiting: { badge: 'bg-kitchen-waiting-soft text-kitchen-waiting', dot: 'bg-kitchen-waiting', text: 'text-kitchen-waiting', border: 'border-kitchen-waiting', band: 'border-s-kitchen-waiting', soft: 'bg-kitchen-waiting-soft' },
  preparing: { badge: 'bg-kitchen-preparing-soft text-kitchen-preparing', dot: 'bg-kitchen-preparing', text: 'text-kitchen-preparing', border: 'border-kitchen-preparing', band: 'border-s-kitchen-preparing', soft: 'bg-kitchen-preparing-soft' },
  ready: { badge: 'bg-kitchen-ready-soft text-kitchen-ready', dot: 'bg-kitchen-ready', text: 'text-kitchen-ready', border: 'border-kitchen-ready', band: 'border-s-kitchen-ready', soft: 'bg-kitchen-ready-soft' },
  served: { badge: 'bg-kitchen-served-soft text-kitchen-served', dot: 'bg-kitchen-served', text: 'text-kitchen-served', border: 'border-kitchen-served', band: 'border-s-kitchen-served', soft: 'bg-kitchen-served-soft' },
  cancelled: { badge: 'bg-table-occupied-soft text-table-occupied', dot: 'bg-table-occupied', text: 'text-table-occupied', border: 'border-table-occupied', band: 'border-s-table-occupied', soft: 'bg-table-occupied-soft' },
  neutral: { badge: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground', text: 'text-muted-foreground', border: 'border-border', band: 'border-s-border', soft: 'bg-muted' },
};

export const TABLE_STATUS_TONE: Record<Table['status'], Tone> = {
  available: 'free',
  occupied: 'occupied',
  reserved: 'reserved',
  cleaning: 'cleaning',
  held: 'held',
};

export const ITEM_STATUS_TONE: Record<OrderItem['status'], Tone> = {
  pending: 'waiting',
  preparing: 'preparing',
  ready: 'ready',
  served: 'served',
  cancelled: 'cancelled',
  voided: 'cancelled',
  void_adjustment: 'cancelled',
};

export const ORDER_STATUS_TONE: Record<Order['status'], Tone> = {
  pending: 'waiting',
  preparing: 'preparing',
  ready: 'ready',
  served: 'served',
  completed: 'neutral',
  cancelled: 'cancelled',
};

export const PAYMENT_STATUS_TONE: Record<'paid' | 'partial' | 'unpaid', Tone> = {
  paid: 'paid',
  partial: 'partial',
  unpaid: 'unpaid',
};

export const RESERVATION_STATUS_TONE: Record<Reservation['status'], Tone> = {
  booked: 'reserved',
  seated: 'free',
  cancelled: 'neutral',
  no_show: 'cancelled',
  expired: 'neutral',
};

/** The style for a table's status, falling back to "free" for anything unknown. */
export function tableTone(status: string): ToneStyle {
  return TONE_STYLES[TABLE_STATUS_TONE[status as Table['status']] ?? 'free'];
}

/** The style for a booking's status, falling back to neutral. */
export function reservationTone(status: string): ToneStyle {
  return TONE_STYLES[RESERVATION_STATUS_TONE[status as Reservation['status']] ?? 'neutral'];
}

/** The style for a dish's kitchen status, falling back to "waiting". */
export function itemTone(status: string): ToneStyle {
  return TONE_STYLES[ITEM_STATUS_TONE[status as OrderItem['status']] ?? 'waiting'];
}
