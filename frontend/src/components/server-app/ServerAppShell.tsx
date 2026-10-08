'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, RefreshCw, Smartphone, WifiOff } from 'lucide-react';
import { useTranslations } from 'use-intl';
import toast from 'react-hot-toast';
import type { Order, Table } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useConfirm } from '@/hooks/use-confirm';
import type { CourseFill } from '@/lib/fixed-menu';
import { coversForNewOrder } from '@/lib/table-covers';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { apiErrorCode } from './server-api';
import { useServerSession } from './useServerSession';
import { useHandheldData } from './useHandheldData';
import { useConnection } from './connection';
import { useSendQueue } from './useSendQueue';
import { useHandheldDraft } from './useHandheldDraft';
import { SCREEN_DEPTH, enterScreen, placeOf, returnTo } from './handheld-history';
import { HandheldStatusProvider, HeaderSubtitle, type HandheldStatus } from './handheld-status';
import type { QueueEntry } from './send-queue';
import { QueueSheet } from './QueueSheet';
import { ServerLoginForm } from './ServerLoginForm';
import { SalaView, roomTabs } from './SalaView';
import { TableScreen } from './TableScreen';
import { OrdinaView } from './OrdinaView';

type View = 'sala' | 'table' | 'ordina';

/** A kitchen ticket waits for the printer, which can take longer than any other request. */
const KITCHEN_TIMEOUT_MS = 45_000;

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
 *
 * Sending goes through the send queue (`send-queue.ts`): the ticket is
 * written on the phone first and leaves from there, at once when the PC
 * answers and by itself when it comes back, so a Wi-Fi gap neither loses a
 * ticket nor stops the waiter taking the next table. Every header says when
 * the PC is out of reach or a ticket is waiting.
 */
export function ServerAppShell() {
  const t = useTranslations('serverApp');
  const tOrders = useTranslations('orders');
  const session = useServerSession();
  const { api, user } = session;
  const data = useHandheldData(api, Boolean(user));
  const cartTableId = useCartStore((state) => state.tableId);
  const { confirm, ConfirmDialog } = useConfirm();

  const [view, setView] = useState<View>('sala');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
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
  // the cart's table right now. A table that has dropped off the floor — the
  // map edited on the PC to seat a big party — keeps its ticket on screen,
  // with the header saying so: unmounting Ordina there took the menu window
  // down with it, and twenty counted dishes with the window.
  const cartTableOnFloor = useMemo(
    () => (cartTableId ? allTables.find((table) => table.id === cartTableId) || null : null),
    [allTables, cartTableId],
  );
  const cartTable = cartTableOnFloor || (cartTableId ? data.knownTables.get(cartTableId) || null : null);
  const pendingOrder = cartTableId ? orderByTableId.get(cartTableId) || null : null;

  /** A table's name as the floor said it last; an order's own label for a ticket known only by its order. */
  const nameOfTable = useCallback((tableId: string) => {
    if (tableId.startsWith('order:')) {
      const order = data.orders.find((candidate) => `order:${candidate.id}` === tableId);
      const table = order?.table_id ? data.knownTables.get(String(order.table_id)) : undefined;
      return table?.name || order?.table_label || `#${tableId.slice('order:'.length)}`;
    }
    return data.knownTables.get(tableId)?.name || tableId;
  }, [data.orders, data.knownTables]);

  const queue = useSendQueue({
    api,
    user,
    kotPrintingEnabled: data.settings.kotPrintingEnabled,
    applyOrder: data.applyOrder,
    refreshFloor: data.refreshFloor,
    tableName: nameOfTable,
  });
  const draft = useHandheldDraft({
    user,
    ready: data.loaded,
    products: data.products,
    tableName: (tableId) => data.knownTables.get(tableId)?.name ?? null,
    isQueued: queue.holdsDraft,
    onRestore: (restored, outcome) => {
      if (outcome !== 'reopen') return;
      // Written within the half hour: straight back to the ticket, and to
      // the menu window if one was open (OrdinaView reopens it).
      setSelectedTableId(restored.table.id);
      setTicketOpen(false);
      setView('ordina');
      toast(t('draftRestored', { table: restored.table.name }));
    },
  });
  const reachable = useConnection(api, () => {
    queue.flush();
    data.refreshFloor().catch(() => { /* the next poll */ });
  });

  const waiting = queue.entries.filter((entry) => !entry.attention).length;
  const attention = queue.entries.length - waiting;
  const status = useMemo<HandheldStatus>(() => ({
    reachable, waiting, attention, sending: queue.sending, openQueue: () => setQueueOpen(true),
  }), [reachable, waiting, attention, queue.sending]);
  const queuedByTable = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of queue.entries) counts.set(entry.tableId, (counts.get(entry.tableId) || 0) + 1);
    return counts;
  }, [queue.entries]);

  useEffect(() => {
    if (data.loadError) toast.error(t('couldNotLoadData'));
  }, [data.loadError, t]);

  // Two things only a phone needs, set while the handheld is on screen.
  //
  // A double tap is two taps here, never a zoom: counting dishes is tapping
  // the same row fast, and a page that zoomed in on the second tap was a page
  // where the next tap landed somewhere else.
  //
  // And after the keyboard closes, an iPhone can leave the page drawn a few
  // pixels from where it takes taps until something scrolls. A scroll to
  // where the page already is makes it settle.
  useEffect(() => {
    const root = document.documentElement;
    const touchAction = root.style.touchAction;
    root.style.touchAction = 'manipulation';
    let settle = 0;
    const onFocusOut = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        if ((window.visualViewport?.offsetTop ?? 0) > 0) window.scrollTo(window.scrollX, window.scrollY);
      }, 100);
    };
    document.addEventListener('focusout', onFocusOut);
    return () => {
      root.style.touchAction = touchAction;
      window.clearTimeout(settle);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Back and forward in the browser move between the screens this page
  // entered (handheld-history.ts): the Android back gesture closes the ticket
  // onto the menu, the menu onto the table, the table onto the floor.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const place = placeOf(event.state);
      setTicketOpen(place.screen === 'ticket');
      if (place.screen === 'sala') {
        setView('sala');
        return;
      }
      if (place.tableId) setSelectedTableId(place.tableId);
      setView(place.screen === 'table' ? 'table' : 'ordina');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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

  // Forward is a tap, and adds a screen to the history; back goes through the
  // history when the screen came from there. The screen is set at once either
  // way, and the browser's report of the move sets the same one again.
  const selectTable = (table: Table) => {
    enterScreen({ screen: 'table', tableId: table.id });
    setSelectedTableId(table.id);
    setView('table');
  };

  const backToFloor = () => {
    returnTo({ screen: 'sala', tableId: null }, SCREEN_DEPTH.sala);
    setView('sala');
  };

  const backToTable = (tableId: string) => {
    returnTo({ screen: 'table', tableId }, SCREEN_DEPTH.table);
    setTicketOpen(false);
    setSelectedTableId(tableId);
    setView('table');
  };

  const changeTicketOpen = (open: boolean) => {
    if (!cartTableId) return;
    if (open) enterScreen({ screen: 'ticket', tableId: cartTableId });
    else returnTo({ screen: 'ordina', tableId: cartTableId }, SCREEN_DEPTH.ordina);
    setTicketOpen(open);
  };

  /**
   * The PC is needed for this and the phone cannot reach it: said at once.
   * Covers, waves, a course filled on the check — they change the check
   * itself, and are not queued; a tap used to hold the screen for ten
   * seconds before saying the same thing.
   */
  const outOfReach = (): boolean => {
    if (reachable) return false;
    toast.error(t('needsConnection'));
    return true;
  };

  const sendToKitchen = useCallback(async (orderId: number) => {
    if (!api) return;
    try {
      const response = await api.post('/api/printers/print-kot', { orderId }, { timeout: KITCHEN_TIMEOUT_MS });
      const result = response.data || {};
      if (result.printed === false) return;
      toast.success(result.batch ? t('kitchenTicketSentBatch', { batch: result.batch }) : t('kitchenTicketSent'));
    } catch {
      // Kitchen printing is off, or a printer is down. The order stands
      // either way; the waiter needs to know the paper did not.
      toast.error(t('kitchenTicketFailed'));
    }
  }, [api, t]);

  const startOrdering = async () => {
    if (!selectedTable) return;
    const cart = useCartStore.getState();
    // A ticket begun on another table starts over, dishes (after asking) and
    // covers alike: a count made for that party is not this one's. A ticket
    // whose table has left the floor is the exception: it was meant for a
    // table that no longer exists, so it goes with the waiter to this one.
    // Back to the same ticket: a menu window it left open comes back too.
    if (cart.tableId === selectedTable.id) draft.reopenLeftMenuWindow();
    if (cart.tableId !== selectedTable.id) {
      const orphaned = cart.tableId !== null && !allTables.some((table) => table.id === cart.tableId);
      if (orphaned) {
        draft.reopenLeftMenuWindow();
      } else {
        if (cart.items.length > 0) {
          const discard = await confirm(t('discardCartConfirm'), { destructive: true });
          if (!discard) return;
        }
        // The window left open on the ticket thrown away goes with it.
        draft.setMenuWindow(null);
        cart.clearCart();
      }
    }
    cart.setOrderType('dine_in');
    if (selectedOrder) {
      cart.setTableId(selectedTable.id);
      cart.setGuestCount(selectedOrder.guest_count || 1);
    } else {
      // A new order starts from the booking's party, or from the seats.
      cart.setTableId(selectedTable.id, coversForNewOrder(selectedTable));
    }
    enterScreen({ screen: 'ordina', tableId: selectedTable.id });
    setTicketOpen(false);
    setView('ordina');
  };

  /**
   * Invia: the ticket is written into the queue and leaves the cart, and the
   * waiter is on the table again. The queue sends it — now, or as soon as
   * the PC is back — and says when it has arrived. A phone that would not
   * keep the ticket keeps the cart instead.
   */
  const sendCart = () => {
    const cart = useCartStore.getState();
    if (!user || !cart.tableId || cart.items.length === 0 || !cartTable) return;
    const tableId = cart.tableId;
    const kept = queue.enqueue({
      tableId,
      tableName: cartTable.name,
      lines: cart.items,
      guestCount: pendingOrder?.guest_count ?? cart.guestCount,
      orderNotes: cart.orderNotes,
      draftId: draft.currentDraftId() ?? undefined,
    }, pendingOrder?.id ?? null);
    if (!kept) {
      toast.error(t('queueSaveFailed'));
      return;
    }
    // The table first, then the cart emptied: emptied first, the screen had
    // no table to stand on and showed the floor for a moment, and a tap there
    // opened some other table.
    backToTable(tableId);
    cart.clearCart();
    if (!reachable) toast(t('queuedOffline'));
  };

  const changeGuests = async (count: number) => {
    if (!api || !selectedOrder || outOfReach()) return;
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

  /** How many menus a line on the check feeds. Below what a course holds, the check says no. */
  const changeMenuCount = async (groupId: string, quantity: number) => {
    if (!api || !selectedOrder || outOfReach()) return;
    setBusy(true);
    try {
      await api.patch(`/api/orders/${selectedOrder.id}/menu-groups/${groupId}`, { quantity });
      await data.refreshFloor();
    } catch (error) {
      toast.error(apiErrorCode(error) === 'menu_course_overflow' ? tOrders('menuCountOverflow') : tOrders('menuCountFailed'));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Moves a line of the table to another wave. A line folds every row of a
   * dish that reads the same — two Coca-Cola and a third added later — and the
   * picker sits under the line, so all of them move: a call per row, then one
   * refresh, which also shows a line left half moved by a call that failed.
   */
  const changeServiceRun = async (itemIds: number[], run: number) => {
    if (!api || !selectedOrder || outOfReach()) return;
    setBusy(true);
    try {
      for (const itemId of itemIds) {
        await api.patch(`/api/orders/${selectedOrder.id}/items/${itemId}/service-run`, { service_run: run });
      }
    } catch {
      toast.error(tOrders('serviceRunFailed'));
    } finally {
      await data.refreshFloor().catch(() => {});
      setBusy(false);
    }
  };

  /** What a course of a menu on the check holds afterwards. Toasts on refusal. */
  const fillCourse = async (order: Order | null, groupId: string, courseId: string, dishes: CourseFill): Promise<boolean> => {
    if (!api || !order || outOfReach()) return false;
    setBusy(true);
    try {
      const { data: response } = await api.put(`/api/orders/${order.id}/menu-groups/${groupId}/courses/${courseId}`, { product_ids: dishes });
      if (response?.order) data.applyOrder(response.order);
      await data.refreshFloor().catch(() => {});
      return true;
    } catch (error) {
      toast.error(apiErrorCode(error) === 'course_in_progress' ? tOrders('menuCourseInProgress') : tOrders('menuCourseFillFailed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendSelectedToKitchen = async () => {
    if (!selectedOrder || outOfReach()) return;
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
    queue.flush();
  };

  const logout = async () => {
    if (queue.entries.length > 0 && !await confirm(t('logoutWithQueue', { count: queue.entries.length }))) return;
    await session.logout();
  };

  /** A ticket the PC has none of, back in the cart to be changed and sent again. */
  const putBack = async (entry: QueueEntry) => {
    const current = useCartStore.getState();
    if (current.items.length > 0 && current.tableId !== entry.tableId) {
      if (!await confirm(t('putBackReplaceConfirm'), { destructive: true })) return;
    }
    const taken = queue.takeBack(entry.id);
    if (!taken) return;
    const kept = useCartStore.getState();
    const alongside = kept.tableId === taken.tableId ? kept.items : [];
    kept.loadItems([...alongside, ...taken.lines], taken.tableId, null, taken.guestCount, taken.orderNotes);
    kept.setOrderType('dine_in');
    setQueueOpen(false);
    enterScreen({ screen: 'ordina', tableId: taken.tableId });
    setTicketOpen(false);
    setSelectedTableId(taken.tableId);
    setView('ordina');
  };

  /** The ticket of an older draft, put back in the cart and offered on the floor. */
  const openOffered = () => {
    const offered = draft.offered;
    draft.dismissOffer();
    if (!offered || !data.knownTables.has(offered.table.id)) return;
    // With the menu window it had open, if it had one.
    draft.reopenLeftMenuWindow();
    enterScreen({ screen: 'ordina', tableId: offered.table.id });
    setTicketOpen(false);
    setSelectedTableId(offered.table.id);
    setView('ordina');
  };

  const discardOffered = () => {
    draft.dismissOffer();
    useCartStore.getState().clearCart();
  };

  const discard = async (entry: QueueEntry) => {
    const maybeThere = entry.sent && entry.attention?.refused !== true;
    const question = maybeThere
      ? t('deleteMaybeSentConfirm', { table: entry.tableName })
      : t('deleteQueuedConfirm', { table: entry.tableName });
    if (!await confirm(question, { destructive: true })) return;
    queue.discard(entry.id);
  };

  if (session.loading) {
    if (session.connecting) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
          <WifiOff size={44} className="text-pending" />
          <h1 className="text-lg font-semibold text-foreground">{t('connecting')}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{t('connectingHint')}</p>
          <Button type="button" variant="outline" size="touch" onClick={session.retry}>{t('retry')}</Button>
        </div>
      );
    }
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

  let screen;
  if (view === 'ordina' && cartTable) {
    screen = (
      <OrdinaView
        table={cartTable}
        tableMissing={!cartTableOnFloor}
        pendingOrder={pendingOrder}
        queuedOpening={pendingOrder ? null : queue.openingFor(cartTable.id)}
        products={data.products}
        categories={data.categories}
        kotPrintingEnabled={data.settings.kotPrintingEnabled}
        coverChargeAmount={data.settings.coverChargeAmount}
        currency={data.settings.currency}
        ticketOpen={ticketOpen}
        onTicketOpenChange={changeTicketOpen}
        onMenuWindowChange={draft.setMenuWindow}
        restoreMenuWindow={draft.pendingMenuWindow}
        onMenuWindowRestored={draft.takePendingMenuWindow}
        onBack={() => backToTable(cartTable.id)}
        onSend={sendCart}
        onAttachToOrderMenu={(groupId, courseId, productIds) => fillCourse(pendingOrder, groupId, courseId, productIds)}
      />
    );
  } else if (view === 'table' && selectedTable) {
    screen = (
      <TableScreen
        table={selectedTable}
        order={selectedOrder}
        queued={queue.entries.filter((entry) => entry.tableId === selectedTable.id)}
        products={data.products}
        kotPrintingEnabled={data.settings.kotPrintingEnabled}
        busy={busy}
        onBack={backToFloor}
        onAddItems={() => { void startOrdering(); }}
        onChangeGuests={changeGuests}
        onChangeServiceRun={changeServiceRun}
        onChangeMenuCount={changeMenuCount}
        onFillCourse={(groupId, courseId, dishes) => fillCourse(selectedOrder, groupId, courseId, dishes)}
        onSendToKitchen={sendSelectedToKitchen}
      />
    );
  } else {
    screen = (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <header className={`sticky top-0 z-20 border-b border-border pt-[env(safe-area-inset-top)] ${!reachable || attention > 0 ? 'bg-pending-soft' : 'bg-background'}`}>
          <div className="mx-auto max-w-5xl px-3">
            <div className="flex h-16 items-center gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl leading-tight font-bold">{t('sala')}</h1>
                <HeaderSubtitle className="text-muted-foreground">{user.name || user.username}</HeaderSubtitle>
              </div>
              <Button type="button" variant="outline" size="icon-touch" onClick={refreshAll} aria-label={t('refresh')}>
                <RefreshCw />
              </Button>
              <Button type="button" variant="outline" size="icon-touch" onClick={() => { void logout(); }} aria-label={t('logout')}>
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
          {draft.offered && cartTableId === draft.offered.table.id && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-pending-soft px-3 py-2">
              <p className="min-w-0 flex-1 text-sm font-semibold text-pending">
                {t(data.knownTables.has(draft.offered.table.id) ? 'draftPending' : 'draftPendingNoTable', {
                  table: draft.offered.table.name,
                  time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(draft.offered.savedAt),
                })}
              </p>
              {data.knownTables.has(draft.offered.table.id) && (
                <Button type="button" size="touch" onClick={openOffered}>{t('draftOpen')}</Button>
              )}
              <Button type="button" size="touch" variant="ghost" onClick={discardOffered}>{t('draftDiscard')}</Button>
            </div>
          )}
          {queue.others.map((other) => (
            <p key={other.userName} className="mb-3 rounded-xl bg-pending-soft px-3 py-2 text-sm font-semibold text-pending">
              {t('othersWaiting', { count: other.count, name: other.userName })}
            </p>
          ))}
          {data.loaded ? (
            <SalaView tab={activeTab} orderByTableId={orderByTableId} queuedByTable={queuedByTable} onSelectTable={selectTable} />
          ) : (
            <div className="flex justify-center py-16"><div className="size-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>
          )}
        </main>
      </div>
    );
  }

  return (
    <HandheldStatusProvider value={status}>
      {screen}
      {queueOpen && (
        <QueueSheet
          entries={queue.entries}
          others={queue.others}
          reachable={reachable}
          sending={queue.sending}
          onRetry={(entry) => queue.retry(entry.id)}
          onSendAnyway={(entry) => queue.sendAnyway(entry.id)}
          onPutBack={(entry) => { void putBack(entry); }}
          onDiscard={(entry) => { void discard(entry); }}
          onClose={() => setQueueOpen(false)}
        />
      )}
      {ConfirmDialog}
    </HandheldStatusProvider>
  );
}
