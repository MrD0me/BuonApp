'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, RefreshCw, Smartphone } from 'lucide-react';
import { useTranslations } from 'use-intl';
import toast from 'react-hot-toast';
import type { Order, Table } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useConfirm } from '@/hooks/use-confirm';
import { cartItemToPayload } from '@/lib/cart-payload';
import { coversForNewOrder } from '@/lib/table-covers';
import {
  buildAppendItemsFingerprint, clearAppendAttempt, getAppendAttemptStorage, getOrCreateAppendAttempt,
  isPermanentAppendRefusal, readAppendAttempt,
} from '@/lib/append-attempt';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { apiErrorCode, newIdempotencyKey } from './server-api';
import { clearOrderAttempt, readOrderAttempt, saveOrderAttempt, type OrderAttempt } from './order-attempt';
import { useServerSession } from './useServerSession';
import { useHandheldData } from './useHandheldData';
import { ServerLoginForm } from './ServerLoginForm';
import { SalaView, roomTabs } from './SalaView';
import { TableScreen } from './TableScreen';
import { OrdinaView } from './OrdinaView';

type View = 'sala' | 'table' | 'ordina';

/** The table a link opened the page on, if any: `/server-standalone?table=<id>`. */
function tableFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('table');
}

/**
 * The handheld, end to end.
 *
 * Three screens, one after the other: the floor, one of its tables, and the
 * order being taken on it. Back goes the same way in reverse, and sending a
 * round lands on the table again. Which open order a cart is being added to
 * is never stored — it is the order on the cart's table, read fresh each
 * time, so changing table can never send a round to the check it was not
 * meant for (the till learned that the hard way).
 */
export function ServerAppShell() {
  const t = useTranslations('serverApp');
  const tOrders = useTranslations('orders');
  const session = useServerSession();
  const { api, user } = session;
  const data = useHandheldData(api, Boolean(user));
  const cart = useCartStore();
  const { confirm, ConfirmDialog } = useConfirm();

  const [view, setView] = useState<View>('sala');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recoveryStartedFor = useRef<string | null>(null);
  const linkedTable = useRef<string | null | undefined>(undefined);

  const allTables = useMemo<Table[]>(
    () => [...data.rooms.flatMap((room) => room.tables || []), ...data.orphanTables],
    [data.rooms, data.orphanTables],
  );
  const tabs = useMemo(() => roomTabs(data.rooms, data.orphanTables, t('orphanTables')), [data.rooms, data.orphanTables, t]);
  const activeTab = tabs.find((tab) => tab.id === selectedRoomId) || tabs[0] || null;

  const orderByTableId = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of data.orders) {
      if (order.table_id && !map.has(String(order.table_id))) map.set(String(order.table_id), order);
    }
    return map;
  }, [data.orders]);

  const selectedTable = useMemo(
    () => allTables.find((table) => table.id === selectedTableId) || null,
    [allTables, selectedTableId],
  );
  const selectedOrder = selectedTable ? orderByTableId.get(selectedTable.id) || null : null;
  // Derived, never stored: the order the cart adds to is whatever is open on
  // the cart's table right now.
  const cartTable = useMemo(
    () => (cart.tableId ? allTables.find((table) => table.id === cart.tableId) || null : null),
    [allTables, cart.tableId],
  );
  const pendingOrder = cart.tableId ? orderByTableId.get(cart.tableId) || null : null;

  useEffect(() => {
    if (data.loadError) toast.error(t('couldNotLoadData'));
  }, [data.loadError, t]);

  // A link that names a table opens it as soon as the floor is known.
  useEffect(() => {
    if (!data.loaded) return;
    if (linkedTable.current === undefined) linkedTable.current = tableFromLocation();
    const wanted = linkedTable.current;
    if (!wanted) return;
    linkedTable.current = null;
    if (allTables.some((table) => table.id === wanted)) {
      setSelectedTableId(wanted);
      setView('table');
    }
  }, [data.loaded, allTables]);

  const selectTable = (table: Table) => {
    setSelectedTableId(table.id);
    setView('table');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}?table=${encodeURIComponent(table.id)}`);
    }
  };

  const backToFloor = () => {
    setView('sala');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const sendToKitchen = useCallback(async (orderId: number) => {
    if (!api) return;
    try {
      const response = await api.post('/api/printers/print-kot', { orderId });
      const result = response.data || {};
      if (result.printed === false) return;
      toast.success(result.batch ? t('kitchenTicketSentBatch', { batch: result.batch }) : t('kitchenTicketSent'));
    } catch {
      // Kitchen printing is off, or a printer is down. The order stands
      // either way; the waiter needs to know the paper did not.
      toast.error(t('kitchenTicketFailed'));
    }
  }, [api, t]);

  /** Replays a new-order attempt left over from an earlier load, with its own key. */
  const replayOrderAttempt = useCallback(async (attempt: OrderAttempt): Promise<void> => {
    if (!api) return;
    try {
      await api.post('/api/orders', attempt.payload, { headers: { 'Idempotency-Key': attempt.idempotencyKey } });
      clearOrderAttempt();
    } catch (error) {
      if (isPermanentAppendRefusal(error)) {
        clearOrderAttempt();
        return;
      }
      throw error;
    }
  }, [api]);

  // What was left half-sent by an earlier load: same key, same body, so the
  // backend answers with what it already did rather than doing it twice.
  useEffect(() => {
    if (!api || !user || recoveryStartedFor.current === user.id) return;
    recoveryStartedFor.current = user.id;
    const storage = getAppendAttemptStorage();
    let pendingAppend = null;
    try { pendingAppend = readAppendAttempt(storage, { userId: user.id }); } catch { pendingAppend = null; }
    const pendingOrderAttempt = readOrderAttempt(user.id);
    if (!pendingAppend && !pendingOrderAttempt) return;

    toast(t('retryingSend'));
    (async () => {
      let replayed = false;
      if (pendingAppend) {
        try {
          await api.post(
            `/api/orders/${pendingAppend.orderId}/items`,
            { items: pendingAppend.items, special_instructions: pendingAppend.specialInstructions },
            { headers: { 'Idempotency-Key': pendingAppend.idempotencyKey } },
          );
          clearAppendAttempt(storage, pendingAppend);
          replayed = true;
        } catch (error) {
          if (isPermanentAppendRefusal(error)) {
            clearAppendAttempt(storage, pendingAppend);
            toast.error(t('attemptDropped'));
          } else {
            toast.error(t('couldNotSendOrder'));
          }
        }
      }
      if (pendingOrderAttempt) {
        try {
          await replayOrderAttempt(pendingOrderAttempt);
          replayed = true;
        } catch {
          toast.error(t('couldNotSendOrder'));
        }
      }
      if (replayed) {
        toast.success(t('orderSent'));
        data.refreshFloor().catch(() => {});
      }
    })();
  }, [api, user, t, data, replayOrderAttempt]);

  const startOrdering = async () => {
    if (!selectedTable) return;
    // A ticket begun on another table starts over, dishes (after asking) and
    // covers alike: a count made for that party is not this one's.
    if (cart.tableId !== selectedTable.id) {
      if (cart.items.length > 0) {
        const discard = await confirm(t('discardCartConfirm'), { destructive: true });
        if (!discard) return;
      }
      cart.clearCart();
    }
    cart.setOrderType('dine_in');
    if (selectedOrder) {
      cart.setTableId(selectedTable.id);
      cart.setGuestCount(selectedOrder.guest_count || 1);
    } else {
      // A new order starts from the booking's party, or from the seats.
      cart.setTableId(selectedTable.id, coversForNewOrder(selectedTable, allTables));
    }
    setView('ordina');
  };

  const sendCart = async () => {
    if (!api || !user || !cart.tableId || cart.items.length === 0) return;
    setSubmitting(true);
    const target = pendingOrder;
    try {
      const items = cart.items.map(cartItemToPayload);
      let orderId: number;
      if (target) {
        const storage = getAppendAttemptStorage();
        const attempt = getOrCreateAppendAttempt(storage, {
          userId: user.id,
          orderId: target.id,
          fingerprint: buildAppendItemsFingerprint(target.id, items, undefined),
          createKey: newIdempotencyKey,
          items,
          specialInstructions: undefined,
          orderNumber: target.order_number,
        });
        try {
          const { data: response } = await api.post(
            `/api/orders/${target.id}/items`,
            { items },
            { headers: { 'Idempotency-Key': attempt.idempotencyKey } },
          );
          orderId = response.order?.id ?? target.id;
        } catch (error) {
          if (isPermanentAppendRefusal(error)) clearAppendAttempt(storage, attempt);
          throw error;
        }
        if (!clearAppendAttempt(storage, attempt)) throw new Error('Unable to clear append retry state');
      } else {
        const payload = {
          table_id: cart.tableId,
          type: 'dine_in',
          guest_count: cart.guestCount,
          special_instructions: cart.orderNotes || undefined,
          items,
        };
        const fingerprint = JSON.stringify(payload);
        const prior = readOrderAttempt(user.id);
        // An older attempt for a different order goes first, with its own
        // key: overwriting it would forget an order the backend may have made.
        if (prior && prior.fingerprint !== fingerprint) await replayOrderAttempt(prior);
        const attempt: OrderAttempt = prior && prior.fingerprint === fingerprint
          ? prior
          : { userId: user.id, fingerprint, idempotencyKey: newIdempotencyKey(), payload, createdAt: Date.now() };
        if (!saveOrderAttempt(attempt)) throw new Error('Unable to persist the order attempt');
        const { data: response } = await api.post('/api/orders', payload, { headers: { 'Idempotency-Key': attempt.idempotencyKey } });
        clearOrderAttempt();
        orderId = response.order.id;
      }
      cart.clearCart();
      toast.success(t('orderSent'));
      // On a handheld, sending the order *is* the act of firing the ticket.
      // It runs after the success toast: the order is already committed, and
      // a jammed printer must not read as a failed order.
      await sendToKitchen(orderId);
      await data.refreshFloor().catch(() => {});
      setView('table');
    } catch (error) {
      if (target && isPermanentAppendRefusal(error)) toast.error(t('attemptDropped'));
      else toast.error(t('couldNotSendOrder'));
    } finally {
      setSubmitting(false);
    }
  };

  const changeGuests = async (count: number) => {
    if (!api || !selectedOrder) return;
    setBusy(true);
    try {
      await api.patch(`/api/orders/${selectedOrder.id}/guests`, { guest_count: count });
      await data.refreshFloor();
    } catch {
      toast.error(tOrders('guestsFailed'));
    } finally {
      setBusy(false);
    }
  };

  const changeServiceRun = async (itemId: number, run: number) => {
    if (!api || !selectedOrder) return;
    setBusy(true);
    try {
      await api.patch(`/api/orders/${selectedOrder.id}/items/${itemId}/service-run`, { service_run: run });
      await data.refreshFloor();
    } catch {
      toast.error(tOrders('serviceRunFailed'));
    } finally {
      setBusy(false);
    }
  };

  /** What a course of a menu on the check holds afterwards. Toasts on refusal. */
  const fillCourse = async (order: Order | null, groupId: string, courseId: string, productIds: string[]): Promise<boolean> => {
    if (!api || !order) return false;
    setBusy(true);
    try {
      await api.put(`/api/orders/${order.id}/menu-groups/${groupId}/courses/${courseId}`, { product_ids: productIds });
      await data.refreshFloor();
      return true;
    } catch (error) {
      toast.error(apiErrorCode(error) === 'course_in_progress' ? tOrders('menuCourseInProgress') : tOrders('menuCourseFillFailed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendSelectedToKitchen = async () => {
    if (!selectedOrder) return;
    setBusy(true);
    try {
      await sendToKitchen(selectedOrder.id);
      await data.refreshFloor().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const refreshAll = () => {
    data.refresh().catch(() => toast.error(t('refreshFailed')));
  };

  if (session.loading) {
    return <div className="flex h-screen items-center justify-center"><div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;
  }

  if (session.disabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <Smartphone size={44} className="text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">{t('disabledTitle')}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t('disabledHint')}</p>
      </div>
    );
  }

  if (!user) {
    return <ServerLoginForm onLogin={session.login} />;
  }

  if (view === 'ordina' && cartTable) {
    return (
      <>
        <OrdinaView
          table={cartTable}
          pendingOrder={pendingOrder}
          products={data.products}
          categories={data.categories}
          kotPrintingEnabled={data.settings.kotPrintingEnabled}
          coverChargeAmount={data.settings.coverChargeAmount}
          currency={data.settings.currency}
          submitting={submitting}
          onBack={() => { setSelectedTableId(cartTable.id); setView('table'); }}
          onSend={sendCart}
          onAttachToOrderMenu={(groupId, courseId, productIds) => fillCourse(pendingOrder, groupId, courseId, productIds)}
        />
        {ConfirmDialog}
      </>
    );
  }

  if (view === 'table' && selectedTable) {
    return (
      <>
        <TableScreen
          table={selectedTable}
          order={selectedOrder}
          products={data.products}
          categories={data.categories}
          kotPrintingEnabled={data.settings.kotPrintingEnabled}
          busy={busy}
          onBack={backToFloor}
          onAddItems={() => { void startOrdering(); }}
          onChangeGuests={changeGuests}
          onChangeServiceRun={changeServiceRun}
          onFillCourse={(groupId, courseId, productIds) => fillCourse(selectedOrder, groupId, courseId, productIds)}
          onSendToKitchen={sendSelectedToKitchen}
        />
        {ConfirmDialog}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto max-w-5xl px-3">
          <div className="flex h-16 items-center gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl leading-tight font-bold">{t('sala')}</h1>
              <p className="truncate text-sm text-muted-foreground">{user.name || user.email}</p>
            </div>
            <Button type="button" variant="outline" size="icon-touch" onClick={refreshAll} aria-label={t('refresh')}>
              <RefreshCw />
            </Button>
            <Button type="button" variant="outline" size="icon-touch" onClick={() => { void session.logout(); }} aria-label={t('logout')}>
              <LogOut />
            </Button>
          </div>
          {tabs.length > 1 && activeTab && (
            <div className="pb-3">
              <SegmentedControl
                scrollable
                size="lg"
                aria-label={t('rooms')}
                value={activeTab.id}
                onValueChange={setSelectedRoomId}
                items={tabs.map((tab) => ({ value: tab.id, label: tab.name, count: tab.tables.length }))}
              />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {data.loaded ? (
          <SalaView tab={activeTab} orderByTableId={orderByTableId} onSelectTable={selectTable} />
        ) : (
          <div className="flex justify-center py-16"><div className="size-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>
        )}
      </main>
      {ConfirmDialog}
    </div>
  );
}
