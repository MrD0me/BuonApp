'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/hooks/use-confirm';
import type { Table } from '@/lib/types';
import type { Order } from '@/lib/types';
import { useHeldOrdersStore } from '@/store/held-orders';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { usePosSettingsStore } from '@/store/pos-settings';
import { useTranslations, type AppConfig } from 'use-intl';
import { useFormatDate } from '@/hooks/useFormatDate';
import { ORDER_TYPE_LABEL_KEYS } from '@/lib/order-types';
import { OrderPanel, paymentStatusOf } from '@/components/orders/OrderPanel';
import { OrderListRow } from '@/components/orders/OrderListRow';
import {
  normalizeDiscountMode,
  type DiscountMode,
} from '@/lib/discount-settings';
import {
  clearAppendAttempt,
  getAppendAttemptStorage,
  isPermanentAppendRefusal,
  readAppendAttempt,
  type AppendAttempt,
} from '@/lib/append-attempt';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { SidePanel, SidePanelDescription, SidePanelHeader, SidePanelTitle } from '@/components/ui/side-panel';
import { ServiceDayChip } from '@/components/service-days/ServiceDayChip';
import { Ltr } from '@/components/layout/Ltr';
import { ORDER_STATUS_TONE } from '@/lib/status-styles';

type OrdersKey = keyof AppConfig['Messages']['orders'];

type FilterType = 'all' | 'active' | 'unpaid' | 'held';

const tabLabelKey: Record<FilterType, OrdersKey> = {
  all: 'all',
  active: 'active',
  unpaid: 'unpaidBadge',
  held: 'held',
};

// Consolidated state types
interface Filters {
  search: string;
  table: string;
  type: string;
  status: string;
}

const SELECT = 'h-touch rounded-xl border border-input bg-card px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-brand';

/**
 * The service day in progress: every order taken since it opened, as a list.
 * A line says who, when, how much and where it stands; tapping it opens the
 * same panel the floor map opens on a table, beside the list. The page used
 * to draw every order as a full panel with every action, in a grid — a wall.
 */
export default function OrdersPage() {
  const { user } = useAuthStore();
  const heldOrdersStore = useHeldOrdersStore();
  const router = useRouter();
  const cartStore = useCartStore();
  const { setTablesRequired, orderTypes: enabledOrderTypes } = usePosSettingsStore();
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const { formatTime } = useFormatDate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Snapshot of "now" for the "Xm ago" timestamps below — Date.now() can't be called directly
  // during render (impure), so it's held in state and refreshed periodically instead.
  const [now, setNow] = useState(() => Date.now());
  const [tabFilter, setTabFilter] = useState<FilterType>('active');
  const [tables, setTables] = useState<Table[]>([]);
  const [kdsEnabled, setKdsEnabled] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The order open in the panel, by id: a refetch under it keeps it fresh.
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  // Consolidated filter state
  const [filters, setFilters] = useState<Filters>({ search: '', table: '', type: '', status: '' });

  const [discountMode, setDiscountMode] = useState<DiscountMode>('percentage');
  const [discountRequiresApproval, setDiscountRequiresApproval] = useState(false);

  const addItemsAttemptRef = useRef<AppendAttempt | null>(null);
  const appendRecoveryStartedUsersRef = useRef<Set<string>>(new Set());
  const activeUserId = user?.id == null ? null : String(user.id);

  const fetchOrders = async () => {
    try {
      // The service day, not the calendar day: a restaurant that closes at one
      // in the morning is still working the same evening, and its orders must
      // stay here rather than slide into the archive at midnight.
      // One page holds a whole service day: 500 is the API's ceiling and far
      // past what a dining room turns over in an evening, so the day is never
      // shown in halves.
      const { data } = await api.get('/orders', { params: { service_day: 'current', per_page: 500 } });
      setOrders(data.orders || []);
    } catch {
      toast.error(tOrders('loadOrdersFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeUserId || appendRecoveryStartedUsersRef.current.has(activeUserId)) return;
    let pendingAttempt: AppendAttempt | null = null;
    try {
      pendingAttempt = readAppendAttempt(getAppendAttemptStorage(), { userId: activeUserId });
    } catch {
      return;
    }
    if (!pendingAttempt) return;
    appendRecoveryStartedUsersRef.current.add(activeUserId);
    addItemsAttemptRef.current = pendingAttempt;
    api.post(`/orders/${pendingAttempt.orderId}/items`, {
      items: pendingAttempt.items,
      special_instructions: pendingAttempt.specialInstructions,
    }, { headers: { 'Idempotency-Key': pendingAttempt.idempotencyKey } }).then(() => {
      if (!clearAppendAttempt(getAppendAttemptStorage(), pendingAttempt!)) throw new Error('Unable to clear append retry state');
      if (addItemsAttemptRef.current?.idempotencyKey !== pendingAttempt!.idempotencyKey) return;
      addItemsAttemptRef.current = null;
      toast.success(tOrders('itemsAdded', { count: pendingAttempt!.items.length }));
      fetchOrders();
    }).catch((error: unknown) => {
      if (isPermanentAppendRefusal(error)) {
        clearAppendAttempt(getAppendAttemptStorage(), pendingAttempt!);
        addItemsAttemptRef.current = null;
        toast.error(tOrders('appendAttemptDropped'));
        return;
      }
      toast.error(tOrders('addItemsFailed'));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  useEffect(() => {
    api.get('/settings/kds_enabled')
      .then((res) => setKdsEnabled(res.data?.setting?.value !== 'false'))
      .catch(() => setKdsEnabled(true));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initPage = async () => {
      let isTablesRequired = true;
      try {
        const { data } = await api.get('/settings/business');
        isTablesRequired = typeof data.tables_required === 'boolean' ? data.tables_required : true;
        setTablesRequired(isTablesRequired);
      } catch {
        // Ignore and fallback to default (true)
      }

      fetchOrders();

      if (isTablesRequired) {
        heldOrdersStore.fetchHeldOrders();
        api.get('/tables')
          .then((res) => setTables(res.data.tables || []))
          .catch(() => {});
      }

      api.get('/settings/discount')
        .then((res) => {
          setDiscountMode(normalizeDiscountMode(res.data.discount_mode));
          setDiscountRequiresApproval(!!res.data.discount_requires_approval);
        })
        .catch(() => {});
    };

    initPage();

    // 10-second backup polling interval (WebSocket handles real-time updates)
    const interval = setInterval(fetchOrders, 10000);

    // Live WebSocket connection to trigger immediate updates
    let ws: globalThis.WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/kds`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          const token = localStorage.getItem('token');
          if (token) {
            ws?.send(JSON.stringify({ type: 'auth', token }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'order_updated' || data.type === 'orders' || data.type === 'initial_data') {
              fetchOrders();
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWS, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        // WS not supported
      }
    };

    connectWS();

    return () => {
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTablesRequired]);

  const isOrderActive = (order: Order) => {
    if (order.status === 'cancelled') return false;
    if (order.status === 'completed') {
      return kdsEnabled && (order.items || []).some((item) => !['served', 'cancelled'].includes(item.status));
    }
    return true;
  };

  // Types worth offering as a filter: what the tenant takes, plus anything an
  // order on screen actually is — switching takeaway off mid-service must not
  // strip the filter for the takeaway orders already taken today.
  const typeFilterOptions = useMemo(() => {
    const present = new Set(orders.map((order) => order.type));
    const enabled = enabledOrderTypes as readonly string[];
    return (['dine_in', 'takeaway', 'delivery', 'online'] as const)
      .filter((type) => enabled.includes(type) || present.has(type));
  }, [orders, enabledOrderTypes]);

  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (tabFilter === 'active' && !isOrderActive(order)) return false;
    // An order without a bill has not been paid yet. Bills are deliberately
    // generated only when checkout starts, so filtering on bill existence
    // hid otherwise payable orders from the Unpaid tab.
    if (tabFilter === 'unpaid' && !['unpaid', 'partial'].includes(paymentStatusOf(order) || '')) return false;

    // Search by order number
    if (filters.search && !order.order_number.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    // Filter by table
    if (filters.table && String(order.table_id) !== filters.table) {
      return false;
    }
    // Filter by type
    if (filters.type && order.type !== filters.type) {
      return false;
    }
    // Filter by status
    if (filters.status === 'active' && !isOrderActive(order)) {
      return false;
    }
    if (filters.status === 'completed' && order.status !== 'completed') {
      return false;
    }
    if (filters.status === 'cancelled' && order.status !== 'cancelled') {
      return false;
    }
    return true;
  });

  const counts: Record<FilterType, number> = {
    all: orders.length,
    active: orders.filter(isOrderActive).length,
    unpaid: orders.filter((order) => ['unpaid', 'partial'].includes(paymentStatusOf(order) || '')).length,
    held: Object.keys(heldOrdersStore.orders).length,
  };
  const activeFilters = [filters.search, filters.table, filters.type, filters.status].filter(Boolean).length;

  // Read fresh from the list on every render, so the panel follows the poll.
  const openOrder = openOrderId != null ? orders.find((order) => order.id === openOrderId) ?? null : null;

  const resumeHeld = async (tableId: string) => {
    try {
      const held = await heldOrdersStore.restoreOrder(tableId);
      if (held) {
        cartStore.loadItems(held.items, tableId, held.customerId, held.guestCount, held.orderNotes, held.id);
        cartStore.setOrderType('dine_in');
        router.push('/pos');
      } else {
        await heldOrdersStore.fetchHeldOrders();
        toast.error(tOrders('resumeFailed'));
      }
    } catch {
      toast.error(tOrders('resumeFailed'));
    }
  };

  const removeHeld = async (tableId: string, heldId?: string) => {
    if (!await confirm(tOrders('deleteHeldConfirm'), { destructive: true })) return;
    try {
      const deleted = await heldOrdersStore.removeHeldOrder(tableId, heldId);
      if (deleted) {
        toast.success(tOrders('heldOrderRemoved'));
      } else {
        await heldOrdersStore.fetchHeldOrders();
        toast.error(tOrders('removeHeldOrderFailed'));
      }
    } catch {
      toast.error(tOrders('removeHeldOrderFailed'));
    }
  };

  const spinner = (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="size-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      {/* The day this page is showing, and the ritual that ends it. */}
      <PageToolbar
        title={tNav('orders')}
        actions={<ServiceDayChip showStats onChanged={fetchOrders} />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          size="lg"
          aria-label={tOrders('allStatuses')}
          value={tabFilter}
          onValueChange={(value) => setTabFilter(value as FilterType)}
          items={(['all', 'active', 'unpaid', 'held'] as FilterType[]).map((f) => ({ value: f, label: tOrders(tabLabelKey[f]), count: counts[f] }))}
        />
        <div className="flex items-center gap-2">
          <div className="relative w-64 max-w-full">
            <Search size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={tOrders('search')}
              aria-label={tOrders('search')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="h-touch w-full rounded-xl border border-input bg-card ps-10 pe-3 text-base outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <Button type="button" variant={filtersOpen || activeFilters > 0 ? 'default' : 'outline'} size="touch" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
            <SlidersHorizontal /> {tOrders('filters')}{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <select
            value={filters.table}
            onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
            aria-label={tOrders('allTables')}
            className={SELECT}
          >
            <option value="">{tOrders('allTables')}</option>
            {tables.map((table: Table) => (
              <option key={table.id} value={String(table.id)}>
                {table.name}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            aria-label={tOrders('allTypes')}
            className={SELECT}
          >
            <option value="">{tOrders('allTypes')}</option>
            {typeFilterOptions.map((type) => (
              <option key={type} value={type}>{tOrders(ORDER_TYPE_LABEL_KEYS[type])}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            aria-label={tOrders('allStatuses')}
            className={SELECT}
          >
            <option value="">{tOrders('allStatuses')}</option>
            <option value="active">{tOrders('active')}</option>
            <option value="completed">{tOrders('completed')}</option>
            <option value="cancelled">{tOrders('cancelled')}</option>
          </select>
        </div>
      )}

      {/* The list */}
      {tabFilter === 'held' ? (
        loading ? spinner : Object.keys(heldOrdersStore.orders).length === 0 ? (
          <EmptyState className="flex-1" title={tOrders('heldEmpty')} />
        ) : (
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {Object.values(heldOrdersStore.orders).map((heldOrder) => (
              <div key={heldOrder.tableId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-table-held bg-card px-4 py-3">
                <span className="w-28 shrink-0 truncate text-lg font-bold text-foreground">{tables.find(t => t.id === heldOrder.tableId)?.name || tCommon('tableFallback')}</span>
                <Ltr className="w-14 shrink-0 text-sm text-muted-foreground">{formatTime(heldOrder.heldAt)}</Ltr>
                <StatusBadge tone="held" size="sm">{tOrders('held')}</StatusBadge>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {heldOrder.items.map((item) => `${item.quantity}× ${item.product.name}`).join(', ')}
                  {heldOrder.orderNotes ? ` — ${heldOrder.orderNotes}` : ''}
                </span>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="touch" onClick={() => { void resumeHeld(heldOrder.tableId); }} className="bg-brand text-white hover:bg-brand-hover">{tOrders('resumeInPos')}</Button>
                  <Button type="button" variant="outline" size="touch" onClick={() => { void removeHeld(heldOrder.tableId, heldOrder.id); }} className="text-table-occupied">{tOrders('delete')}</Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : loading ? spinner : filteredOrders.length === 0 ? (
        <EmptyState className="flex-1" title={tOrders('empty')} />
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {filteredOrders.map((order) => (
            <OrderListRow
              key={order.id}
              order={order}
              selected={order.id === openOrderId}
              onOpen={(picked) => setOpenOrderId(picked.id)}
            />
          ))}
        </div>
      )}

      {/* One order, beside the list: the same panel the floor map opens on a table. */}
      {openOrder && (
        <SidePanel open onOpenChange={(open) => { if (!open) setOpenOrderId(null); }}>
          <SidePanelHeader closeLabel={tCommon('close')}>
            <div className="flex flex-wrap items-center gap-2">
              <SidePanelTitle>{openOrder.table?.name ?? tOrders(ORDER_TYPE_LABEL_KEYS[openOrder.type])}</SidePanelTitle>
              <StatusBadge tone={ORDER_STATUS_TONE[openOrder.status] ?? 'neutral'}>
                {tOrders(openOrder.status === 'pending' ? 'pending' : openOrder.status === 'preparing' ? 'preparing' : openOrder.status === 'ready' ? 'ready' : openOrder.status === 'served' ? 'served' : openOrder.status === 'completed' ? 'completed' : 'cancelled')}
              </StatusBadge>
            </div>
            <SidePanelDescription>
              <Ltr>#{openOrder.order_number}</Ltr> · {tOrders(ORDER_TYPE_LABEL_KEYS[openOrder.type])} · <Ltr>{formatTime(openOrder.created_at)}</Ltr>
            </SidePanelDescription>
          </SidePanelHeader>
          <OrderPanel
            order={openOrder}
            onChanged={fetchOrders}
            discountMode={discountMode}
            discountRequiresApproval={discountRequiresApproval}
            nowMs={now}
          />
        </SidePanel>
      )}

      {ConfirmDialog}
    </div>
  );
}
