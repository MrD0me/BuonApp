'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import type { Category, Order, Product, Room, Table } from '@/lib/types';
import { seedTenantFormat } from './tenant-format';

/** The few settings the floor needs to take an order. */
export interface HandheldSettings {
  currency: string;
  country: string | null;
  /** So much a head; zero means the house charges none and the line stays hidden. */
  coverChargeAmount: number;
  /** Whether kitchen tickets exist here at all: decides if runs are worth showing. */
  kotPrintingEnabled: boolean;
}

const DEFAULT_SETTINGS: HandheldSettings = {
  currency: 'EUR',
  country: null,
  coverChargeAmount: 0,
  kotPrintingEnabled: true,
};

/** How often the floor is re-read while the phone is awake. */
const FLOOR_POLL_MS = 15_000;
/**
 * How far behind the till the menu on a phone is allowed to fall.
 *
 * The catalogue used to be read once per page load and never again, on the
 * grounds that a menu does not change mid-service. That is true of the
 * dishes and false of the phone: a handheld is opened once and then lives in
 * an apron for days, so a category renamed on the PC kept its old name on
 * that one phone — and only on that one — while every phone opened
 * afterwards showed the new one. It rides the same tick as the floor but at
 * a quarter of the rate: the menu is the bigger payload and the rarer change.
 */
const CATALOGUE_MAX_AGE_MS = 60_000;
/** The statuses an order on a table can be in while it is still being served. */
const OPEN_STATUSES = 'pending,preparing,ready,served';

export interface HandheldData {
  categories: Category[];
  products: Product[];
  rooms: Room[];
  orphanTables: Table[];
  /**
   * Every table seen on the floor since the page was opened, by id. A table
   * that drops out of the floor — the map edited on the PC to seat a big
   * party — stays here, so a ticket being written for it is not lost.
   */
  knownTables: ReadonlyMap<string, Table>;
  /** Every open dine-in order, rows included: the source of the pending-ticket dot. */
  orders: Order[];
  settings: HandheldSettings;
  /** The first load has landed, whatever it brought. */
  loaded: boolean;
  /** The first load failed: the floor on screen is not to be trusted. */
  loadError: boolean;
  /** Catalogue, settings and floor, all again. */
  refresh: () => Promise<void>;
  /** Rooms and orders only — what changes during service. */
  refreshFloor: () => Promise<void>;
  /** An order as a write just returned it, on screen before the next read of the floor. */
  applyOrder: (order: Order) => void;
}

/**
 * Keeps the objects of the orders that did not change, so whatever was drawn
 * from them — the open order of the table being served, above all — keeps
 * its identity and is not drawn again because some other table moved.
 */
function reuseUnchanged(next: Order[], previous: Map<number, { json: string; order: Order }>): {
  orders: Order[];
  index: Map<number, { json: string; order: Order }>;
} {
  const index = new Map<number, { json: string; order: Order }>();
  const orders = next.map((order) => {
    const json = JSON.stringify(order);
    const known = previous.get(order.id);
    const kept = known && known.json === json ? known.order : order;
    index.set(order.id, { json, order: kept });
    return kept;
  });
  return { orders, index };
}

/**
 * Everything the handheld reads, and when it reads it again.
 *
 * The floor is polled while the page is visible and re-read the moment it
 * comes back into view, because the thing a waiter most wants to know when
 * they lift the phone is what happened while it was in their pocket. The
 * catalogue and the settings ride the same tick, a minute apart instead of
 * fifteen seconds: they change far less often, but a phone that never
 * reloads has no other way to hear that they changed at all.
 *
 * A read that says what the last one said changes nothing on screen. The
 * answers come back as text and are compared before they are parsed: the
 * open orders run to hundreds of kilobytes in a busy evening, and turning
 * them into new objects every fifteen seconds redrew the whole menu under a
 * waiter who was taking an order, for nothing, on a phone that could not
 * spare it.
 *
 * Orders come from the list endpoint with their rows, not from the tables:
 * the table payload carries the order's head but not its items, and it is the
 * items that say whether a round is still waiting to go to the kitchen.
 */
export function useHandheldData(api: AxiosInstance | null, enabled: boolean): HandheldData {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orphanTables, setOrphanTables] = useState<Table[]>([]);
  const [knownTables, setKnownTables] = useState<ReadonlyMap<string, Table>>(() => new Map());
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<HandheldSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const catalogueInFlight = useRef<Promise<void> | null>(null);
  /** When the menu on screen was last read. Zero until the first load lands. */
  const catalogueReadAt = useRef(0);
  /** The text of the last answer of each read, to tell a new answer from the same one. */
  const lastText = useRef(new Map<string, string>());
  const orderIndex = useRef(new Map<number, { json: string; order: Order }>());

  /** The body of a GET, parsed — or null when it reads exactly as the last one did. */
  const readIfChanged = useCallback(async <T,>(key: string, url: string, params?: Record<string, string | number>) => {
    if (!api) return null;
    const response = await api.get<string>(url, { params, responseType: 'text' });
    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    if (lastText.current.get(key) === text) return null;
    const parsed = JSON.parse(text) as T;
    lastText.current.set(key, text);
    return parsed;
  }, [api]);

  const loadCatalogue = useCallback(async () => {
    if (!api) return;
    // Same rule as the floor: one read at a time, so the poll landing on top
    // of the refresh button does not paint the same menu twice.
    if (catalogueInFlight.current) return catalogueInFlight.current;
    catalogueInFlight.current = (async () => {
      try {
        const [categoriesBody, productsBody, settingsBody] = await Promise.all([
          readIfChanged<{ categories?: Category[] }>('categories', '/api/categories', { active: 'true' }),
          readIfChanged<{ products?: Product[] }>('products', '/api/products', { active: 'true' }),
          readIfChanged<{ settings?: Record<string, string> }>('settings', '/api/settings'),
        ]);
        if (categoriesBody) setCategories(categoriesBody.categories || []);
        if (productsBody) setProducts(productsBody.products || []);
        if (settingsBody) {
          const raw: Record<string, string> = settingsBody.settings || {};
          const coverCharge = Number.parseFloat(raw.cover_charge_amount);
          setSettings({
            currency: raw.currency || DEFAULT_SETTINGS.currency,
            country: raw.country || null,
            coverChargeAmount: Number.isFinite(coverCharge) && coverCharge > 0 ? coverCharge : 0,
            kotPrintingEnabled: raw.kot_printing_enabled !== 'false',
          });
          seedTenantFormat(raw);
        }
        // Only a read that landed counts: a failed one must be retried on the
        // next tick, not treated as a menu freshly seen.
        catalogueReadAt.current = Date.now();
      } finally {
        catalogueInFlight.current = null;
      }
    })();
    return catalogueInFlight.current;
  }, [api, readIfChanged]);

  /** The menu again, unless it was read a moment ago. For the poll to call. */
  const refreshCatalogueIfStale = useCallback(async () => {
    if (Date.now() - catalogueReadAt.current < CATALOGUE_MAX_AGE_MS) return;
    await loadCatalogue();
  }, [loadCatalogue]);

  const refreshFloor = useCallback(async () => {
    if (!api) return;
    // One read at a time: a poll landing on top of a manual refresh would
    // only paint the same floor twice.
    if (inFlight.current) return inFlight.current;
    inFlight.current = (async () => {
      try {
        const [roomsBody, ordersBody] = await Promise.all([
          readIfChanged<{ rooms?: Room[]; orphanTables?: Table[] }>('rooms', '/api/rooms'),
          readIfChanged<{ orders?: Order[] }>('orders', '/api/orders', { type: 'dine_in', status: OPEN_STATUSES, per_page: 500 }),
        ]);
        if (roomsBody) {
          const liveRooms = (roomsBody.rooms || []).filter((room: Room) => room.is_active !== false);
          const orphans = roomsBody.orphanTables || [];
          setRooms(liveRooms);
          setOrphanTables(orphans);
          setKnownTables((previous) => {
            const next = new Map(previous);
            for (const table of [...liveRooms.flatMap((room) => room.tables || []), ...orphans]) next.set(table.id, table);
            return next;
          });
        }
        if (ordersBody) {
          const { orders: kept, index } = reuseUnchanged(ordersBody.orders || [], orderIndex.current);
          orderIndex.current = index;
          setOrders(kept);
        }
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, [api, readIfChanged]);

  const applyOrder = useCallback((order: Order) => {
    orderIndex.current.set(order.id, { json: JSON.stringify(order), order });
    // The next read of the floor must land whatever it says, even if it says
    // what the last one did before this order changed.
    lastText.current.delete('orders');
    setOrders((current) => (
      current.some((entry) => entry.id === order.id)
        ? current.map((entry) => (entry.id === order.id ? order : entry))
        : [order, ...current]
    ));
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadCatalogue(), refreshFloor()]);
  }, [loadCatalogue, refreshFloor]);

  // First load, once the device is paired.
  useEffect(() => {
    if (!api || !enabled) return;
    let cancelled = false;
    // The setters run once the requests come back, not in the effect body.
    refresh()
      .then(() => { if (!cancelled) setLoadError(false); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [api, enabled, refresh]);

  // The floor, again and again — but only while somebody is looking. The
  // menu comes along on the same tick, and declines most of them.
  useEffect(() => {
    if (!api || !enabled || typeof document === 'undefined') return;
    const tick = () => {
      if (document.hidden) return;
      refreshFloor().catch(() => { /* next tick */ });
      refreshCatalogueIfStale().catch(() => { /* next tick */ });
    };
    const interval = window.setInterval(tick, FLOOR_POLL_MS);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    // A phone added to the home screen comes back from the page cache rather
    // than reloading; on iOS that restore is the one moment the app has to
    // notice a menu that changed while the screen was off.
    window.addEventListener('pageshow', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [api, enabled, refreshFloor, refreshCatalogueIfStale]);

  return useMemo(() => ({
    categories, products, rooms, orphanTables, knownTables, orders, settings, loaded, loadError, refresh, refreshFloor, applyOrder,
  }), [categories, products, rooms, orphanTables, knownTables, orders, settings, loaded, loadError, refresh, refreshFloor, applyOrder]);
}
