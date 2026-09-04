'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
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
import { CurrentDayCard } from '@/components/service-days/CurrentDayCard';

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


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* The day this page is showing, and the ritual that ends it. */}
      <CurrentDayCard onChanged={fetchOrders} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{tNav('orders')}</h1>
        <div className="flex gap-2">
          {(['all', 'active', 'unpaid', 'held'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setTabFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                tabFilter === f
                  ? 'bg-brand text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {tOrders(tabLabelKey[f])}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search by order number */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={tOrders('search')}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full ps-9 pe-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
          />
        </div>

        {/* Table filter */}
        <select
          value={filters.table}
          onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          <option value="">{tOrders('allTables')}</option>
          {tables.map((table: Table) => (
            <option key={table.id} value={String(table.id)}>
              {table.name}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          <option value="">{tOrders('allTypes')}</option>
          {typeFilterOptions.map((type) => (
            <option key={type} value={type}>{tOrders(ORDER_TYPE_LABEL_KEYS[type])}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          <option value="">{tOrders('allStatuses')}</option>
          <option value="active">{tOrders('active')}</option>
          <option value="completed">{tOrders('completed')}</option>
          <option value="cancelled">{tOrders('cancelled')}</option>
        </select>
      </div>

      {/* Orders List */}
      {tabFilter === 'held' ? (
        loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : Object.keys(heldOrdersStore.orders).length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-gray-400">
            <p>{tOrders('heldEmpty')}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 content-start items-start auto-rows-max">
            {Object.values(heldOrdersStore.orders).map((heldOrder) => (
              <div key={heldOrder.tableId} className="bg-white rounded-xl border border-blue-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                 <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
                   <div>
                     <p className="font-bold text-gray-900">{tables.find(t => t.id === heldOrder.tableId)?.name || tCommon('tableFallback')}</p>
                     <p className="text-xs text-gray-500">{formatTime(heldOrder.heldAt)}</p>
                   </div>
                   <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold tracking-wide">{tOrders('held')}</span>
                 </div>
                 <div className="p-4 flex-1">
                   {heldOrder.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm py-1 text-gray-700">
                       <span>{item.quantity}x {item.product.name}</span>
                     </div>
                   ))}
                   {heldOrder.orderNotes && (
                     <div className="mt-3 text-sm italic text-gray-500 bg-gray-50 p-2 rounded-lg">
                       &quot;{heldOrder.orderNotes}&quot;
                     </div>
                   )}
                 </div>
                 <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                    <Button onClick={async () => {
                      try {
                        const held = await heldOrdersStore.restoreOrder(heldOrder.tableId);
                        if (held) {
                          cartStore.loadItems(held.items, heldOrder.tableId, held.customerId, held.guestCount, held.orderNotes, held.id);
                          cartStore.setOrderType('dine_in');
                          router.push('/pos');
                        } else {
                          await heldOrdersStore.fetchHeldOrders();
                          toast.error(tOrders('resumeFailed'));
                        }
                      } catch {
                        toast.error(tOrders('resumeFailed'));
                      }
                    }} variant="default" className="flex-1 bg-brand hover:bg-brand/90 text-white">{tOrders('resumeInPos')}</Button>
                    <Button onClick={async () => {
                      if (await confirm(tOrders('deleteHeldConfirm'), { destructive: true })) {
                        try {
                          const deleted = await heldOrdersStore.removeHeldOrder(heldOrder.tableId, heldOrder.id);
                          if (deleted) {
                            toast.success(tOrders('heldOrderRemoved'));
                          } else {
                            await heldOrdersStore.fetchHeldOrders();
                            toast.error(tOrders('removeHeldOrderFailed'));
                          }
                        } catch {
                          toast.error(tOrders('removeHeldOrderFailed'));
                        }
                      }
                    }} variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">{tOrders('delete')}</Button>
                 </div>
              </div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-gray-400">
          <p>{tOrders('empty')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 content-start items-start auto-rows-max">
            {filteredOrders.map((order) => (
              <OrderPanel
                key={order.id}
                order={order}
                onChanged={fetchOrders}
                discountMode={discountMode}
                discountRequiresApproval={discountRequiresApproval}
                nowMs={now}
              />
            ))}
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}
