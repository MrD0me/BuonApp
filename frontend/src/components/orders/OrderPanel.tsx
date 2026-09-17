'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { RotateCcw, MessageCircle, Printer, XCircle, Percent, Banknote, Plus, Users, ChevronDown, ChevronRight, UserPlus, User, ShoppingBag, Send, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentModal from '@/components/pos/PaymentModal';
import { shareBillViaWhatsApp, sendBillViaFlo } from '@/lib/whatsapp-share';
import { useConfirm } from '@/hooks/use-confirm';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { OrderItem, Customer } from '@/lib/types';
import type { Order, Bill } from '@/lib/types';
import { getCurrencySymbol, getCountryByCode } from '@/lib/countries';
import { parseDbTimestamp } from '@/lib/utils';
import { usePrinterStore } from '@/hooks/usePrinter';
import { showPrintWarningsToast } from '@/lib/printer/warnings-toast';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { usePosSettingsStore } from '@/store/pos-settings';
import { useTranslations, useLocale, type AppConfig } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useWhatsAppReady } from '@/hooks/useWhatsAppReady';
import { ORDER_TYPE_LABEL_KEYS } from '@/lib/order-types';
import { useSendKot } from '@/hooks/useSendKot';
import { pendingDishCount, pendingKotItems } from '@/lib/kot';
import { menuAwareRowOrder, menuGroupsOfOrder, type MenuGroupState } from '@/lib/fixed-menu';
import { useCatalogStore } from '@/store/catalog';
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, TONE_STYLES } from '@/lib/status-styles';
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Stepper } from '@/components/ui/stepper';
import { OrderHeader } from '@/components/orders/OrderHeader';
import { OrderLines } from '@/components/orders/OrderLines';
import { LineActionSheet } from '@/components/orders/LineActionSheet';
import { OrderTotals } from '@/components/orders/OrderTotals';
import { OrderActionBar } from '@/components/orders/OrderActionBar';
import FixedMenuPicker from '@/components/pos/FixedMenuPicker';
import {
  defaultDiscountTypeForMode,
  isDiscountTypeAllowed,
  type DiscountMode,
  type DiscountType,
} from '@/lib/discount-settings';

/**
 * One order, everything that can be done to it.
 *
 * This is the single place an order is worked: the day's list renders one per
 * order, and the floor map opens one for the table it belongs to. Before it
 * existed the same order was handled in three screens — the POS created it,
 * the orders page billed it, the map only watched — and the map could show
 * that a course had not reached the kitchen without offering any way to send
 * it. Keep the logic here rather than copying it out: three versions of the
 * same void-with-PIN diverge at the first bug fix.
 */

type OrdersKey = keyof AppConfig['Messages']['orders'];

/* Colours come from `lib/status-styles.ts`; only the labels live here. */
const orderStatusBadge: Record<Order['status'], { badge: string; labelKey: OrdersKey }> = {
  pending: { badge: TONE_STYLES[ORDER_STATUS_TONE.pending].badge, labelKey: 'pending' },
  preparing: { badge: TONE_STYLES[ORDER_STATUS_TONE.preparing].badge, labelKey: 'preparing' },
  ready: { badge: TONE_STYLES[ORDER_STATUS_TONE.ready].badge, labelKey: 'ready' },
  served: { badge: TONE_STYLES[ORDER_STATUS_TONE.served].badge, labelKey: 'served' },
  completed: { badge: TONE_STYLES[ORDER_STATUS_TONE.completed].badge, labelKey: 'completed' },
  cancelled: { badge: TONE_STYLES[ORDER_STATUS_TONE.cancelled].badge, labelKey: 'cancelled' },
};

const paymentStatusBadge: Record<'paid' | 'partial' | 'unpaid', { badge: string; labelKey: OrdersKey }> = {
  paid: { badge: TONE_STYLES.paid.badge, labelKey: 'paid' },
  partial: { badge: TONE_STYLES.partial.badge, labelKey: 'partiallyPaid' },
  unpaid: { badge: TONE_STYLES.unpaid.badge, labelKey: 'unpaidBadge' },
};

interface CancelModal {
  order: Order;
  reason: string;
  freeTable: boolean;
  overridePin: string;
}

interface VoidItemModal {
  orderId: number;
  itemId: number;
  productName: string;
  overridePin: string;
}

interface RowEdit {
  item: OrderItem;
  unitPrice: string;
  overridePin: string;
}

interface DiscountModal {
  order: Order;
  type: DiscountType;
  value: number;
  reason: string;
}

export const isOrderPaid = (order: Order) => order.bill?.payment_status === 'paid';

/** Null for a cancelled order: nothing is owed on something that never ran. */
export const paymentStatusOf = (order: Order): 'paid' | 'partial' | 'unpaid' | null => {
  if (order.status === 'cancelled') return null;
  if (order.bill?.payment_status === 'paid') return 'paid';
  if (order.bill?.payment_status === 'partial') return 'partial';
  return 'unpaid';
};

interface OrderPanelProps {
  order: Order;
  /** Refetch whatever list or screen holds this order: it just changed. */
  onChanged: () => void;
  discountMode: DiscountMode;
  discountRequiresApproval: boolean;
  /**
   * Shared clock for the "12m ago" line. A list passes one ticking value so N
   * cards do not each run their own interval; on its own the panel just reads
   * the time it rendered at.
   */
  nowMs?: number;
  /** Entries the host adds to the "more" menu: what happens to the table, not the order. */
  extraMenu?: ReactNode;
}

export function OrderPanel({
  order, onChanged, discountMode, discountRequiresApproval, nowMs, extraMenu,
}: OrderPanelProps) {
  const { currentTenant } = useAuthStore();
  const { printBill } = usePrinterStore();
  const router = useRouter();
  const cartStore = useCartStore();
  const { autoPrintBill, printerUseUnicode, customersEnabled, kotPrintingEnabled, orderTypes: enabledOrderTypes } = usePosSettingsStore();
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');
  const tPos = useTranslations('pos');
  const tWhatsappSend = useTranslations('whatsapp.send');
  const { confirm, ConfirmDialog } = useConfirm();
  const isWhatsAppReady = useWhatsAppReady();

  // sendBillViaFlo (shared with PaymentModal) takes a translator callback;
  // bridge the typed `whatsapp.send` namespace to that contract.
  const whatsappSendT = (key: string): string =>
    tWhatsappSend(
      key.replace(/^whatsapp\.send\./, '') as
        | 'success'
        | 'failed'
        | 'error.notConnected'
        | 'error.notOnWhatsapp'
        | 'error.blocked'
        | 'error.rateLimited',
    );
  const { formatDateTime } = useFormatDate();
  const locale = useLocale();
  // Without a shared clock from a list, the panel keeps its own so the
  // "12m ago" line does not freeze at the minute it was opened.
  const [selfNow, setSelfNow] = useState(() => Date.now());
  useEffect(() => {
    if (nowMs !== undefined) return;
    const interval = setInterval(() => setSelfNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [nowMs]);
  const now = nowMs ?? selfNow;

  const [previewingBillId, setPreviewingBillId] = useState<number | null>(null);
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  // How many are actually eating. Fixed when the order was taken and never
  // touchable again, which with a cover charge on it leaves the bill wrong the
  // moment somebody joins the table.
  const [guestEdit, setGuestEdit] = useState<string | null>(null);

  const [cancelModal, setCancelModal] = useState<CancelModal | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [convertingOrderId, setConvertingOrderId] = useState<number | null>(null);

  const [voidItemModal, setVoidItemModal] = useState<VoidItemModal | null>(null);
  const [voidingItem, setVoidingItem] = useState(false);

  const [discountModal, setDiscountModal] = useState<DiscountModal | null>(null);
  const [discountPin, setDiscountPin] = useState('');

  const [generatingBill, setGeneratingBill] = useState<number | null>(null);
  const [printingBillId, setPrintingBillId] = useState<number | null>(null);
  const [sendingWaOrderId, setSendingWaOrderId] = useState<number | null>(null);
  const [confirmPrintBillId, setConfirmPrintBillId] = useState<number | null>(null);
  // Whether the print being confirmed is the whole check or one share of it.

  const [printHistoryExpanded, setPrintHistoryExpanded] = useState<Record<number, boolean>>({});
  const [printHistory, setPrintHistory] = useState<Record<number, { id: number; print_type: string; user_name: string; printed_at: string }[]>>({});

  const [sendingToKitchen, setSendingToKitchen] = useState(false);
  const [rowEdit, setRowEdit] = useState<RowEdit | null>(null);
  // The row whose action sheet is open, by id so a refetch never leaves it stale.
  const [lineSheetId, setLineSheetId] = useState<number | null>(null);
  const [savingRow, setSavingRow] = useState(false);


  // Link Customer states
  const [linkCustomerOrderId, setLinkCustomerOrderId] = useState<number | null>(null);
  const [linkCustomerSearch, setLinkCustomerSearch] = useState('');
  const [linkCustomerResults, setLinkCustomerResults] = useState<Customer[]>([]);
  const [linkingCustomer, setLinkingCustomer] = useState(false);
  const linkSearchRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const currency = getCurrencySymbol(currentTenant?.currency || 'INR', getCountryByCode(currentTenant?.country ?? 'IN')?.locale);
  const fmt = useFormatCurrency();
  const isOwnerOrManager = currentTenant?.role === 'owner' || currentTenant?.role === 'manager';
  const takeawayEnabled = (enabledOrderTypes as readonly string[]).includes('takeaway');
  const sendKotToKitchen = useSendKot();
  // Rows the kitchen has never seen. The floor map used to show this as a
  // badge with no way to act on it: the button belongs beside the count.
  // A row of an off-menu product that nobody has priced yet. Zero on its own
  // does not mean this: in a place that offers the coffee, zero means free.
  // Waiting on a price is about nobody having decided yet, not about the
  // number being zero: a dish given away at zero is a decision, and the price
  // a placeholder happens to carry in the menu means nothing. Saving a price
  // through the pencil — any price — is what settles it.
  const awaitsPrice = (item: OrderItem) =>
    Boolean(item.price_required) && !item.price_confirmed && item.status !== 'cancelled';
  const unpricedItems = (order.items || []).filter(awaitsPrice);
  const pendingKotRows = pendingKotItems(order.items || []);
  // What the button says it will send: plates, the same number the table's
  // badge carries. The package row of a menu is stamped with the round too
  // but nobody cooks it, and two different counts for one thing on one
  // screen is the floor asking which one is true.
  const pendingPlates = pendingDishCount(order.items || []);

  // A menu on the check names its dishes but not its courses, so drawing the
  // slots still to fill needs the catalogue.
  const catalogProducts = useCatalogStore((state) => state.products);
  const catalogCategories = useCatalogStore((state) => state.categories);
  const ensureCatalog = useCatalogStore((state) => state.ensureLoaded);
  const [menuFill, setMenuFill] = useState<{ group: MenuGroupState; courseId: string } | null>(null);
  const [fillingMenu, setFillingMenu] = useState(false);
  const hasMenuRows = (order.items || []).some((item: OrderItem) => item.menu_role === 'package');
  useEffect(() => {
    if (hasMenuRows) void ensureCatalog();
  }, [hasMenuRows, ensureCatalog]);

  /**
   * What this course holds now. One shape for adding, swapping and clearing,
   * because that is the shape the endpoint takes: the list is what the course
   * ends up with, not what to do to it.
   */
  const setCourseDishes = async (groupId: string, courseId: string, productIds: string[]) => {
    setFillingMenu(true);
    try {
      await api.put(`/orders/${order.id}/menu-groups/${groupId}/courses/${courseId}`, { product_ids: productIds });
      setMenuFill(null);
      onChanged();
    } catch (error: unknown) {
      // The kitchen has that dish. Taking it off the check is the void, with
      // the manager PIN it asks for — not something to do behind their back.
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'course_in_progress' ? tOrders('menuCourseInProgress') : tOrders('menuCourseFillFailed'));
    } finally {
      setFillingMenu(false);
    }
  };

  // The bill's print history, so the button can say "reprint" rather than
  // "print" the second time round.
  const fetchPrintHistory = (id: number) => api
    .get(`/bills/${id}/print-history`)
    .then(({ data }) => setPrintHistory((prev) => ({ ...prev, [id]: data.prints || [] })))
    // The history only decides whether the button says print or reprint.
    .catch(() => { });

  const billId = order.bill?.id ?? null;
  useEffect(() => {
    if (billId == null) return;
    fetchPrintHistory(billId);
  }, [billId]);

  const fetchOrders = onChanged;

  if (discountModal && !isDiscountTypeAllowed(discountMode, discountModal.type)) {
    setDiscountModal({
      ...discountModal,
      type: defaultDiscountTypeForMode(discountMode),
      value: 0,
    });
    setDiscountPin('');
  }

  const getTimeSince = (dateStr: string) => {
    const minutes = Math.floor((now - parseDbTimestamp(dateStr).getTime()) / 60000);
    if (minutes < 1) return tCommon('justNow');
    if (minutes < 60) return tCommon('timeMinutesAgo', { m: minutes });
    return tCommon('timeHoursMinutesAgo', { h: Math.floor(minutes / 60), m: minutes % 60 });
  };

  const handleCreateNewOrderForCustomer = async (order: Order) => {
    if (!order.customer) return;

    // Check for active POS cart items to avoid accidental loss of progress
    if (cartStore.items.length > 0) {
      const proceed = await confirm(
        tOrders('cartClearConfirm')
      );
      if (!proceed) return;
    }

    cartStore.clearCart();
    cartStore.setCustomer(order.customer);

    const posOrderType = (order.type === 'dine_in' || order.type === 'takeaway' || order.type === 'delivery')
      ? order.type
      : 'takeaway';
    cartStore.setOrderType(posOrderType);

    if (posOrderType === 'dine_in' && order.table_id) {
      cartStore.setTableId(order.table_id);
    }

    if (posOrderType === 'delivery' && order.customer.address) {
      cartStore.setDeliveryAddress(order.customer.address);
    }

    router.push('/pos');
    toast.success(tOrders('newOrderStarted', { name: order.customer.name }));
  };

  const searchCustomersForLink = (query: string) => {
    clearTimeout(linkSearchRef.current);
    if (query.length < 2) {
      setLinkCustomerResults([]);
      return;
    }
    linkSearchRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/customers-search?q=${encodeURIComponent(query)}`);
        setLinkCustomerResults(Array.isArray(data) ? data : (data.customers || []));
      } catch {
        setLinkCustomerResults([]);
      }
    }, 300);
  };

  const handleLinkCustomer = async (orderId: number, customerId: string) => {
    setLinkingCustomer(true);
    try {
      await api.patch(`/orders/${orderId}/customer`, { customer_id: customerId });
      toast.success(tOrders('customerLinked'));
      setLinkCustomerOrderId(null);
      setLinkCustomerSearch('');
      setLinkCustomerResults([]);
      fetchOrders();
    } catch {
      toast.error(tOrders('linkCustomerFailed'));
    } finally {
      setLinkingCustomer(false);
    }
  };

  // A prepaid order is marked 'completed' the moment its bill is fully paid,
  // which can happen before the kitchen has prepared anything (payment and
  // kitchen fulfillment are independent and can finish in either order) — so
  // a completed order still counts as "active" if the kitchen hasn't served
  // all of its items yet. Only applies when this business uses KDS; without
  // it item status is never updated, so it can't be used as a signal.

  const handleCheckout = async (orderId: number) => {
    setGeneratingBill(orderId);
    try {
      const { data } = await api.post('/bills/generate', { order_id: orderId });
      setPaymentBill(data.bill);
    } catch {
      toast.error(tOrders('generateBillFailed'));
    } finally {
      setGeneratingBill(null);
    }
  };

  /**
   * The bill on paper. Generating one is not the same as cashing up: the floor
   * takes it to the table long before anybody pays, and until now the only way
   * to get one was to press Checkout, which opens the payment window.
   */
  const handlePrintBill = async () => {
    if (order.bill?.id) {
      setConfirmPrintBillId(order.bill.id);
      return;
    }
    setGeneratingBill(order.id);
    try {
      const { data } = await api.post('/bills/generate', { order_id: order.id });
      onChanged();
      setConfirmPrintBillId(data.bill.id);
    } catch {
      toast.error(tOrders('generateBillFailed'));
    } finally {
      setGeneratingBill(null);
    }
  };

  const handlePaymentComplete = async () => {
    const bill = paymentBill; // capture before clearing state
    setPaymentBill(null);
    fetchOrders();

    if (bill && autoPrintBill) {
      try {
        const { data } = await api.get(`/bills/${bill.id}`);
        const latestBill = data.bill as Bill;
        await printBill(
          latestBill,
          {
            business_name: currentTenant?.business_name || tCommon('businessNameFallback'),
            currency: currentTenant?.currency || 'INR',
            country: currentTenant?.country || 'IN',
            timezone: currentTenant?.timezone || 'UTC',
            currency_display: currentTenant?.currency_display,
            number_digits: currentTenant?.number_digits,
            calendar: currentTenant?.calendar,
          },
          { isReprint: false }
        );
        await api.post(`/bills/${bill.id}/print`, { print_type: 'receipt' });
      } catch {
        toast.error(tOrders('receiptPrintFailedHint'));
      }
    }
  };

  const handlePrint = async (billId: number) => {
    // No guard on the panel's own copy of the order: a bill generated a moment
    // ago to print a preconto is not in it yet, and the bill is re-read from
    // the API below anyway.
    const isReprint = (printHistory[billId]?.length ?? 0) > 0;
    setPrintingBillId(billId);
    try {
      const { data } = await api.get(`/bills/${billId}`);
      const latestBill = data.bill as Bill;
      // Actually attempt the print first — only log/report success if the printer accepted the job,
      // otherwise a disconnected printer would silently report "success" (it was only logging before).
      const printWarnings = await printBill(
        latestBill,
        {
          business_name: currentTenant?.business_name || tCommon('businessNameFallback'),
          currency: currentTenant?.currency || 'INR',
          country: currentTenant?.country || 'IN',
          timezone: currentTenant?.timezone || 'UTC',
          currency_display: currentTenant?.currency_display,
          number_digits: currentTenant?.number_digits,
          calendar: currentTenant?.calendar,
        },
        { isReprint }
      );
      await api.post(`/bills/${billId}/print`, { print_type: isReprint ? 'reprint' : 'receipt' });
      toast.success(isReprint ? tOrders('printReceiptReprint') : tOrders('printReceipt'));
      showPrintWarningsToast(printWarnings);
      fetchPrintHistory(billId);
    } catch {
      toast.error(tOrders('printReceiptFailed'));
    } finally {
      setPrintingBillId(null);
      setConfirmPrintBillId(null);
    }
  };

  const handleDownloadPrintPreview = async (billId: number) => {
    setPreviewingBillId(billId);
    try {
      const isReprint = (printHistory[billId]?.length ?? 0) > 0;
      const { data } = await api.post<{
        columns: number;
        printer: { name: string };
        text: string;
      }>('/printers/print-bill', {
        billId,
        useUnicode: printerUseUnicode,
        isReprint,
        preview: true,
      });
      const contents = `Printer: ${data.printer.name}\nColumns: ${data.columns}\n\n${data.text}\n`;
      const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${billId}-${data.columns}cols.txt`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(tOrders('printPreviewDownloaded'));
    } catch {
      toast.error(tOrders('printPreviewFailed'));
    } finally {
      setPreviewingBillId(null);
    }
  };

  const deleteItem = async (orderId: number, itemId: number, item?: OrderItem) => {
    if (!isOwnerOrManager) {
      toast.error(tOrders('onlyOwnersRemove'));
      return;
    }
    // Pressing the menu's own row takes the whole menu; pressing one of its
    // dishes takes only that dish. The question has to say which.
    const question = item?.menu_role === 'package' ? tOrders('removeMenuConfirm') : tOrders('removeItemConfirm');
    if (!await confirm(question, { destructive: true, confirmLabel: tCommon('remove') })) return;
    try {
      await api.patch(`/orders/${orderId}/items/${itemId}/cancel`, { reason: tOrders('removedByManager') });
      toast.success(tOrders('itemRemoved'));
      fetchOrders();
    } catch {
      toast.error(tOrders('removeItemFailed'));
    }
  };

  const handleVoidItem = async () => {
    if (!voidItemModal) return;
    setVoidingItem(true);
    try {
      await api.patch(`/orders/${voidItemModal.orderId}/items/${voidItemModal.itemId}/cancel`, {
        reason: tOrders('removedByManager'),
        override_pin: voidItemModal.overridePin || undefined,
      });
      toast.success(tOrders('itemVoided'));
      setVoidItemModal(null);
      fetchOrders();
    } catch {
      toast.error(tOrders('voidItemFailed'));
    } finally {
      setVoidingItem(false);
    }
  };

  const restoreItem = async (orderId: number, itemId: number) => {
    if (!isOwnerOrManager) return;
    try {
      await api.patch(`/orders/${orderId}/items/${itemId}/restore`);
      toast.success(tOrders('itemRestored'));
      fetchOrders();
    } catch {
      toast.error(tOrders('restoreItemFailed'));
    }
  };

  const handleWhatsAppShare = (order: Order) => {
    if (!order.bill) {
      toast.error(tOrders('billNotFound'));
      return;
    }
    if (!order.customer?.phone) {
      toast.error(tOrders('customerPhoneMissing'));
      return;
    }

    try {
      shareBillViaWhatsApp(
        order.bill,
        { phone: order.customer.phone, country_code: order.customer.country_code },
        {
          business_name: currentTenant?.business_name || tCommon('businessNameFallback'),
          currency,
          country: currentTenant?.country || 'IN',
        },
        { pointsEarned: order.bill.points_earned ?? 0 },
        locale,
      );
    } catch {
      toast.error(tOrders('whatsappFailed'));
    }
  };

  const handleSendViaFlo = async (order: Order) => {
    if (!order.bill) {
      toast.error(tOrders('billNotFound'));
      return;
    }
    if (!order.customer?.phone) {
      toast.error(tWhatsappSend('customerPhoneRequired'));
      return;
    }
    setSendingWaOrderId(order.id);
    try {
      await sendBillViaFlo(
        order.bill,
        order.customer.phone,
        {
          business_name: currentTenant?.business_name || tCommon('businessNameFallback'),
          currency: currentTenant?.currency || 'INR',
          country: currentTenant?.country || 'IN',
        },
        whatsappSendT,
        { pointsEarned: order.bill.points_earned ?? 0 },
        locale,
      );
    } finally {
      setSendingWaOrderId(null);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountModal) return;

    // Check if PIN is required
    if (discountRequiresApproval && discountModal.value > 0 && !discountPin) {
      toast.error(tOrders('managerPinRequired'));
      return;
    }
    if (discountModal.value > 0 && !isDiscountTypeAllowed(discountMode, discountModal.type)) {
      toast.error(tOrders('discountFailed'));
      return;
    }

    try {
      await api.patch(`/orders/${discountModal.order.id}/discount`, {
        discount_type: discountModal.type,
        discount_value: discountModal.value,
        discount_reason: discountModal.reason || undefined,
        override_pin: discountRequiresApproval && discountModal.value > 0 ? discountPin : undefined,
      });
      toast.success(tOrders('discountApplied'));
      fetchOrders();
    } catch {
      toast.error(tOrders('discountFailed'));
    } finally {
      setDiscountModal(null);
      setDiscountPin('');
    }
  };


  const showCheckout = (order: Order) => {
    return !isOrderPaid(order) && !['completed', 'cancelled'].includes(order.status);
  };

  const handleConvertToTakeaway = async (order: Order) => {
    const tableNote = order.table ? tOrders('freeTableSuffix', { name: order.table.name }) : '';
    if (!await confirm(tOrders('convertToTakeawayConfirm', { number: order.order_number, tableNote }))) return;
    setConvertingOrderId(order.id);
    try {
      await api.patch(`/orders/${order.id}/convert-to-takeaway`);
      toast.success(tOrders('orderConvertedTakeaway'));
      fetchOrders();
    } catch {
      toast.error(tOrders('convertOrderFailed'));
    } finally {
      setConvertingOrderId(null);
    }
  };

  /**
   * Hands the order to the ordering screen, which is the only place with the
   * catalogue and the add-on choices — the picker that used to live here could
   * not order a pizza with extra anchovies.
   */
  const saveGuestCount = async () => {
    if (guestEdit === null) return;
    const parsed = Number(guestEdit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
      toast.error(tOrders('guestsInvalid'));
      return;
    }
    setSavingRow(true);
    try {
      await api.patch(`/orders/${order.id}/guests`, { guest_count: parsed });
      toast.success(tOrders('guestsSaved'));
      setGuestEdit(null);
      onChanged();
    } catch {
      toast.error(tOrders('guestsFailed'));
    } finally {
      setSavingRow(false);
    }
  };

  const handleAddItems = async () => {
    if (cartStore.items.length > 0) {
      const proceed = await confirm(tOrders('addItemsCartClearConfirm'));
      if (!proceed) return;
      cartStore.clearCart();
    }
    router.push(`/pos?append=${order.id}`);
  };

  const openRowEdit = (item: OrderItem) => setRowEdit({
    item,
    unitPrice: String(Number(item.unit_price) || 0),
    overridePin: '',
  });

  const saveRowPrice = async () => {
    if (!rowEdit) return;
    const parsed = Number(rowEdit.unitPrice.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error(tOrders('rowPriceInvalid'));
      return;
    }
    setSavingRow(true);
    try {
      await api.patch(`/orders/${order.id}/items/${rowEdit.item.id}/price`, {
        unit_price: parsed,
        override_pin: discountRequiresApproval && rowEdit.overridePin ? rowEdit.overridePin : undefined,
      });
      toast.success(tOrders('rowPriceSaved'));
      setRowEdit(null);
      fetchOrders();
    } catch {
      toast.error(tOrders('rowPriceFailed'));
    } finally {
      setSavingRow(false);
    }
  };

  /**
   * Moves one row to another wave.
   *
   * No confirmation and no PIN: no money moves and nothing is re-sent. A row
   * already on a printed ticket still moves — the paper in the kitchen is
   * simply out of date, which is what the muted chip is there to say.
   */
  const changeServiceRun = async (item: OrderItem, run: number) => {
    try {
      await api.patch(`/orders/${order.id}/items/${item.id}/service-run`, { service_run: run });
      onChanged();
    } catch {
      toast.error(tOrders('serviceRunFailed'));
    }
  };

  const handleSendToKitchen = async () => {
    setSendingToKitchen(true);
    try {
      await sendKotToKitchen(order, { auto: false });
      // Re-read the order so the rows just sent stop counting as pending.
      onChanged();
    } finally {
      setSendingToKitchen(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModal) return;

    setCancellingOrderId(cancelModal.order.id);
    try {
      await api.patch(`/orders/${cancelModal.order.id}/status`, {
        status: 'cancelled',
        reason: cancelModal.reason || undefined,
        free_table: cancelModal.freeTable,
        override_pin: cancelModal.overridePin || undefined,
      });
      toast.success(tOrders('orderCancelled'));
      fetchOrders();
    } catch {
      toast.error(tOrders('cancelOrderFailed'));
    } finally {
      setCancellingOrderId(null);
      setCancelModal(null);
    }
  };

  // Helper to update cancel modal state
  const updateCancelModal = (updates: Partial<Omit<CancelModal, 'order'>>) => {
    if (cancelModal) {
      setCancelModal({ ...cancelModal, ...updates });
    }
  };

  // Helper to update discount modal state
  const updateDiscountModal = (updates: Partial<Omit<DiscountModal, 'order'>>) => {
    if (discountModal) {
      setDiscountModal({ ...discountModal, ...updates });
    }
  };

            const activeItems = menuAwareRowOrder((order.items || []).filter((i: OrderItem) => i.status !== 'cancelled'));
            // The menus on this check: which courses are filled, which are
            // still open, and which required ones nobody has chosen for.
            const menuGroups = menuGroupsOfOrder(activeItems, catalogProducts);
            const menusMissingCourses = menuGroups.filter((entry) => entry.missingRequired.length > 0);
            const lastRowOfGroup = new Map<string, number>();
            for (const row of activeItems) {
              if (row.menu_group_id) lastRowOfGroup.set(String(row.menu_group_id), row.id);
            }
            const cancelledItems = (order.items || []).filter((i: OrderItem) => i.status === 'cancelled');
            const paid = isOrderPaid(order);
            const payStatus = paymentStatusOf(order);
            const payBadge = payStatus ? paymentStatusBadge[payStatus] : null;
            const bill = order.bill;
            // A preconto nobody has generated yet has no bill row behind it;
            // the panel then shows the order’s own figures, which are the
            // same numbers the bill would carry.
            const fromOrder = !bill;
            const discount = fromOrder ? Number(order.discount_amount) : Number(bill.discount_amount);
            const subtotal = fromOrder ? Number(order.subtotal) : Number(bill.subtotal);
            const coverCharge = Number(fromOrder ? order.cover_charge || 0 : bill.cover_charge || 0);
            const total = fromOrder ? Number(order.total) : Number(bill.total);
            const paidSoFar = Number(bill?.paid_amount || 0);
            const stillOwed = Number(bill?.balance || 0);

  const orderOpen = !['completed', 'cancelled'].includes(order.status);
  const canAct = isOwnerOrManager && !paid && orderOpen;
  const statusBadge = orderStatusBadge[order.status];
  // The row the sheet is open on, read fresh from the order so a refetch
  // underneath it (a run moved, a price saved) is what the sheet shows.
  const sheetItem = lineSheetId != null ? (order.items || []).find((row) => row.id === lineSheetId) ?? null : null;
  const sheetSwappable = sheetItem && sheetItem.menu_role === 'course' && sheetItem.menu_course_id && sheetItem.status === 'pending' && !paid
    ? menuGroups.find((entry) => entry.group_id === sheetItem.menu_group_id)
    : undefined;
  const INPUT = 'h-touch w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-brand';
  const LABEL = 'mb-1.5 block text-sm font-semibold text-foreground';

  return (
    <>
      <div className={`flex min-h-0 flex-1 flex-col ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <OrderHeader
            order={order}
            statusTone={ORDER_STATUS_TONE[order.status] ?? 'neutral'}
            statusLabel={tOrders(statusBadge.labelKey)}
            paymentTone={payStatus ? PAYMENT_STATUS_TONE[payStatus] : null}
            paymentLabel={payBadge ? tOrders(payBadge.labelKey) : null}
            typeLabel={tOrders(ORDER_TYPE_LABEL_KEYS[order.type])}
            timeSince={getTimeSince(order.created_at)}
            actions={(
              <>
                {paid && order.customer?.phone && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-touch"
                    onClick={() => isWhatsAppReady ? handleSendViaFlo(order) : handleWhatsAppShare(order)}
                    disabled={sendingWaOrderId === order.id}
                    aria-label={isWhatsAppReady ? tCommon('sendViaFlo') : tCommon('shareViaWhatsApp')}
                    title={isWhatsAppReady ? tCommon('sendViaFlo') : tCommon('shareViaWhatsApp')}
                    className="text-kitchen-ready"
                  >
                    {sendingWaOrderId === order.id ? <Loader2 className="animate-spin" /> : isWhatsAppReady ? <Send /> : <MessageCircle />}
                  </Button>
                )}
                {order.bill && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-touch"
                    onClick={handlePrintBill}
                    disabled={printingBillId === order.bill.id}
                    aria-label={(printHistory[order.bill.id]?.length ?? 0) > 0 ? tCommon('reprint') : tCommon('print')}
                    title={(printHistory[order.bill.id]?.length ?? 0) > 0 ? tCommon('reprint') : tCommon('print')}
                  >
                    <Printer />
                  </Button>
                )}
              </>
            )}
          />

          {/* Order notes */}
          {order.special_instructions && (
            <p className="mx-4 mb-2 rounded-xl bg-table-reserved-soft px-3 py-2 text-sm font-medium break-words text-table-reserved">
              {order.special_instructions}
            </p>
          )}

          {/* Customer info strip */}
          {order.customer ? (
            <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <User size={16} className="shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium text-foreground">{order.customer.name}</span>
                {order.customer.phone && (
                  <span className="shrink-0 text-sm text-muted-foreground"><Ltr>{order.customer.phone}</Ltr></span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => handleCreateNewOrderForCustomer(order)} title={tOrders('startNewOrderForCustomer')}>
                <Plus /> {tOrders('newOrder')}
              </Button>
            </div>
          ) : customersEnabled && isOwnerOrManager && orderOpen ? (
            <div className="mx-4 mb-2">
              {linkCustomerOrderId === order.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={linkCustomerSearch}
                    onChange={(e) => {
                      setLinkCustomerSearch(e.target.value);
                      searchCustomersForLink(e.target.value);
                    }}
                    placeholder={tOrders('searchCustomer')}
                    className={INPUT}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-touch"
                    aria-label={tCommon('cancel')}
                    onClick={() => {
                      setLinkCustomerOrderId(null);
                      setLinkCustomerSearch('');
                      setLinkCustomerResults([]);
                    }}
                  >
                    <XCircle />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLinkCustomerOrderId(order.id)} className="text-muted-foreground">
                  <UserPlus /> {tOrders('linkCustomer')}
                </Button>
              )}
              {linkCustomerOrderId === order.id && linkCustomerResults.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {linkCustomerResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleLinkCustomer(order.id, String(customer.id))}
                      disabled={linkingCustomer}
                      className="flex min-h-touch w-full items-center justify-between rounded-xl border border-border bg-card px-3 text-start transition active:bg-muted disabled:opacity-50"
                    >
                      <span>
                        <span className="text-sm font-medium text-foreground">{customer.name}</span>
                        {customer.phone && (
                          <span className="ms-2 text-xs text-muted-foreground"><Ltr>{customer.phone}</Ltr></span>
                        )}
                      </span>
                      {linkingCustomer && <span className="text-xs text-muted-foreground">{tOrders('linking')}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Items — presented like a bill */}
          <div className="px-2 pb-4">
            <OrderLines
              items={activeItems}
              menuGroups={menuGroups}
              lastRowOfGroup={lastRowOfGroup}
              canAct={canAct}
              canFillCourses={!paid && orderOpen}
              kotEnabled={kotPrintingEnabled}
              awaitsPrice={awaitsPrice}
              onLineTap={(item) => setLineSheetId(item.id)}
              onFillCourse={(group, courseId) => setMenuFill({ group, courseId })}
            />

            {/* A menu still waiting on a course. A line, never a dialog: in a
                house that routinely sells the menu without dessert, a dialog
                every evening is a dialog nobody reads. Nothing here stops the
                check being closed — sometimes the dessert is genuinely not
                wanted. */}
            {menusMissingCourses.length > 0 && !paid && (
              <p className="mt-2 px-2 text-sm text-pending">
                {tOrders('menuAwaitingCourses', {
                  courses: menusMissingCourses
                    .flatMap((entry) => entry.missingRequired.map((course) => course.label))
                    .join(', '),
                })}
              </p>
            )}

            <div className="mt-3">
              <OrderTotals
                subtotal={subtotal}
                discount={discount}
                coverCharge={coverCharge}
                guestCount={order.guest_count}
                total={total}
                partial={bill && payStatus === 'partial' ? { paid: paidSoFar, balance: stillOwed } : null}
              />
            </div>

            {/* Cancelled items */}
            {cancelledItems.length > 0 && isOwnerOrManager && (
              <div className="mt-3 border-t border-border px-2 pt-2">
                {cancelledItems.map((item: OrderItem) => (
                  <div key={item.id} className="flex min-h-touch items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground line-through">
                      <Ltr>{item.quantity}×</Ltr> {item.product_name}
                    </span>
                    {!paid && orderOpen && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => restoreItem(order.id, item.id)} className="text-table-free">
                        <RotateCcw /> {tCommon('restore')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {order.bill && printHistory[order.bill.id]?.length > 0 && (
              <div className="mt-3 border-t border-border px-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrintHistoryExpanded(prev => ({ ...prev, [order.bill!.id]: !prev[order.bill!.id] }));
                  }}
                  className="flex min-h-touch items-center gap-1 text-sm text-muted-foreground"
                >
                  {printHistoryExpanded[order.bill!.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} className="rtl-flip" />}
                  {tOrders('printHistory')}
                </button>

                {printHistoryExpanded[order.bill!.id] && (
                  <div className="mt-1 flex flex-col gap-1 ps-5">
                    {printHistory[order.bill!.id].map((print, index) => (
                      <div key={print.id} className="text-sm text-muted-foreground">
                        {index + 1}. {tOrders('printHistoryEntry', { printedType: print.print_type === 'reprint' ? tOrders('reprint') : tOrders('printed'), user: print.user_name, time: formatDateTime(print.printed_at) })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {(orderOpen || extraMenu) && (
          <OrderActionBar
            canAdd={orderOpen}
            onAdd={handleAddItems}
            pendingCount={kotPrintingEnabled && orderOpen && pendingKotRows.length > 0 ? pendingPlates : 0}
            onSendToKitchen={handleSendToKitchen}
            sendingToKitchen={sendingToKitchen}
            canPrint={order.status !== 'cancelled'}
            onPrint={handlePrintBill}
            printing={generatingBill === order.id || printingBillId === order.bill?.id}
            canCheckout={showCheckout(order)}
            onCheckout={() => handleCheckout(order.id)}
            generating={generatingBill === order.id}
            menu={(orderOpen || extraMenu) ? (
              <>
                {orderOpen && isOwnerOrManager && !paid && (
                  <DropdownMenuItem onClick={() => setDiscountModal({
                    order,
                    type: defaultDiscountTypeForMode(discountMode),
                    value: 0,
                    reason: '',
                  })}>
                    <Percent className="me-2" />
                    {tOrders('orderDiscountAction')}
                  </DropdownMenuItem>
                )}
                {orderOpen && order.type === 'dine_in' && (
                  <DropdownMenuItem onClick={() => setGuestEdit(String(order.guest_count || 1))}>
                    <Users className="me-2" />
                    {tOrders('changeGuests')}
                  </DropdownMenuItem>
                )}
                {orderOpen && order.type === 'dine_in' && takeawayEnabled && (
                  <DropdownMenuItem
                    onClick={() => handleConvertToTakeaway(order)}
                    disabled={convertingOrderId === order.id}
                  >
                    <ShoppingBag className="me-2" />
                    {convertingOrderId === order.id ? tOrders('converting') : tOrders('convertToTakeaway')}
                  </DropdownMenuItem>
                )}
                {extraMenu && (
                  <>
                    {orderOpen && <DropdownMenuSeparator />}
                    {extraMenu}
                  </>
                )}
                {orderOpen && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCancelModal({ order, reason: '', freeTable: true, overridePin: '' })}
                      disabled={cancellingOrderId === order.id}
                      variant="destructive"
                    >
                      <XCircle className="me-2" />
                      {cancellingOrderId === order.id ? tOrders('cancelling') : tOrders('cancelOrderAction')}
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : undefined}
          />
        )}
      </div>

      {/* One row, up close: everything that can be done to it. */}
      {sheetItem && (
        <LineActionSheet
          item={sheetItem}
          kotEnabled={kotPrintingEnabled}
          canChangeRun={!paid && orderOpen}
          canEditPrice={isOwnerOrManager && !paid && orderOpen}
          canDelete={sheetItem.status === 'pending' && isOwnerOrManager && !paid}
          canVoid={(sheetItem.status === 'preparing' || sheetItem.status === 'ready') && isOwnerOrManager && !paid}
          canSwap={Boolean(sheetSwappable?.menu)}
          onChangeRun={(run) => changeServiceRun(sheetItem, run)}
          onEditPrice={() => openRowEdit(sheetItem)}
          onDelete={() => { void deleteItem(order.id, sheetItem.id, sheetItem); }}
          onVoid={() => setVoidItemModal({ orderId: order.id, itemId: sheetItem.id, productName: sheetItem.product_name, overridePin: '' })}
          onSwap={() => { if (sheetSwappable) setMenuFill({ group: sheetSwappable, courseId: String(sheetItem.menu_course_id) }); }}
          onClose={() => setLineSheetId(null)}
        />
      )}

      {/* Payment Modal */}
      {paymentBill && (
        <PaymentModal
          bill={paymentBill}
          currency={currency}
          onClose={() => setPaymentBill(null)}
          onPaid={handlePaymentComplete}
          onBillUpdate={(updated) => setPaymentBill(updated)}
        />
      )}

      {/* Print confirmation */}
      {confirmPrintBillId !== null && (
        <Modal open onOpenChange={(open) => { if (!open) setConfirmPrintBillId(null); }} size="sm">
          <ModalHeader closeLabel={tCommon('close')}>
            <ModalTitle>
              {(printHistory[confirmPrintBillId]?.length ?? 0) > 0 ? tOrders('reprintReceiptTitle') : tOrders('printReceiptTitle')}
            </ModalTitle>
            <ModalDescription>
              {(printHistory[confirmPrintBillId]?.length ?? 0) > 0
                ? tOrders('reprintReceiptWarning')
                : tOrders('printReceiptConfirm')}
            </ModalDescription>
          </ModalHeader>
          {/* Warned rather than blocked: a genuinely free row exists, and a
              block would push the floor into inventing a workaround. */}
          {unpricedItems.length > 0 && (
            <ModalBody className="py-3">
              <p className="rounded-xl bg-pending-soft px-3 py-2 text-sm text-pending">
                {tOrders('unpricedRowsWarning', { count: unpricedItems.length })}
              </p>
            </ModalBody>
          )}
          <ModalFooter className="flex-row justify-end">
            <Button type="button" variant="outline" size="touch" onClick={() => setConfirmPrintBillId(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-touch"
              onClick={() => handleDownloadPrintPreview(confirmPrintBillId)}
              disabled={previewingBillId === confirmPrintBillId}
              title={tOrders('downloadPrintPreview')}
              aria-label={tOrders('downloadPrintPreview')}
            >
              {previewingBillId === confirmPrintBillId ? <Loader2 className="animate-spin" /> : <Download />}
            </Button>
            <Button type="button" size="touch" onClick={() => handlePrint(confirmPrintBillId)} disabled={printingBillId === confirmPrintBillId}>
              <Printer />
              {printingBillId === confirmPrintBillId
                ? tOrders('printing')
                : (printHistory[confirmPrintBillId]?.length ?? 0) > 0
                  ? tOrders('confirmReprint')
                  : tOrders('confirmPrint')}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Cancel Order */}
      {cancelModal && (
        <Modal open onOpenChange={(open) => { if (!open) setCancelModal(null); }} size="sm">
          <ModalHeader closeLabel={tCommon('close')}>
            <ModalTitle>{tOrders('cancel')} #<Ltr>{cancelModal.order.order_number}</Ltr></ModalTitle>
          </ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <div>
              <label htmlFor="cancelReason" className={LABEL}>{tCommon('reasonOptional')}</label>
              <input
                id="cancelReason"
                type="text"
                value={cancelModal.reason}
                onChange={(e) => updateCancelModal({ reason: e.target.value })}
                placeholder={tOrders('cancelReason')}
                className={INPUT}
              />
            </div>

            {cancelModal.order.type === 'dine_in' && cancelModal.order.table && (
              <label htmlFor="freeTable" className="flex min-h-touch items-center gap-3 text-base text-foreground">
                <input
                  id="freeTable"
                  type="checkbox"
                  checked={cancelModal.freeTable}
                  onChange={(e) => updateCancelModal({ freeTable: e.target.checked })}
                  className="size-5 rounded border-input accent-brand"
                />
                {tOrders('freeTable', { name: cancelModal.order.table.name })}
              </label>
            )}

            {(cancelModal.order.status !== 'pending' || cancelModal.order.items?.some((i) => ['preparing', 'ready', 'served', 'completed'].includes(i.status))) && (
              <div>
                <label htmlFor="overridePin" className={LABEL}>{tOrders('overridePinLabel')}</label>
                <input
                  id="overridePin"
                  type="password"
                  value={cancelModal.overridePin}
                  onChange={(e) => updateCancelModal({ overridePin: e.target.value })}
                  placeholder={tOrders('managerPin')}
                  className={INPUT}
                  dir="ltr"
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex-row justify-end">
            <Button type="button" variant="outline" size="touch" onClick={() => setCancelModal(null)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" variant="destructive" size="touch" onClick={handleCancelOrder} disabled={cancellingOrderId === cancelModal.order.id}>
              {cancellingOrderId === cancelModal.order.id ? tOrders('cancelling') : tOrders('confirmCancel')}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Void In-Progress Item */}
      {voidItemModal && (
        <Modal open onOpenChange={(open) => { if (!open) setVoidItemModal(null); }} size="sm">
          <ModalHeader closeLabel={tCommon('close')}>
            <ModalTitle>{tOrders('voidItem')}</ModalTitle>
            <ModalDescription>{tOrders('voidItemConfirm', { name: voidItemModal.productName })}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            <label htmlFor="voidOverridePin" className={LABEL}>{tOrders('overridePinLabel')}</label>
            <input
              id="voidOverridePin"
              type="password"
              autoFocus
              value={voidItemModal.overridePin}
              onChange={(e) => setVoidItemModal({ ...voidItemModal, overridePin: e.target.value })}
              placeholder={tOrders('managerPin')}
              className={INPUT}
              dir="ltr"
            />
          </ModalBody>
          <ModalFooter className="flex-row justify-end">
            <Button type="button" variant="outline" size="touch" onClick={() => setVoidItemModal(null)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" variant="destructive" size="touch" onClick={handleVoidItem} disabled={voidingItem || !voidItemModal.overridePin}>
              {voidingItem ? tOrders('voidingItem') : tOrders('confirmVoidItem')}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Discount */}
      {discountModal && (
        <Modal open onOpenChange={(open) => { if (!open) setDiscountModal(null); }} size="sm">
          <ModalHeader closeLabel={tCommon('close')}>
            <ModalTitle>{tOrders('applyDiscountTitle', { number: discountModal.order.order_number })}</ModalTitle>
          </ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            {/* Discount type */}
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              {isDiscountTypeAllowed(discountMode, 'percentage') && (
                <button
                  type="button"
                  aria-pressed={discountModal.type === 'percentage'}
                  onClick={() => updateDiscountModal({ type: 'percentage', value: 0 })}
                  className={`flex h-touch flex-1 items-center justify-center gap-2 rounded-lg text-base font-semibold transition ${
                    discountModal.type === 'percentage' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <Percent size={16} />
                  {tCommon('percentage')}
                </button>
              )}
              {isDiscountTypeAllowed(discountMode, 'amount') && (
                <button
                  type="button"
                  aria-pressed={discountModal.type === 'amount'}
                  onClick={() => updateDiscountModal({ type: 'amount', value: 0 })}
                  className={`flex h-touch flex-1 items-center justify-center gap-2 rounded-lg text-base font-semibold transition ${
                    discountModal.type === 'amount' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <Banknote size={16} />
                  {tCommon('amount')}
                </button>
              )}
            </div>

            {/* Discount value */}
            <div>
              <label htmlFor="discountValue" className={LABEL}>
                {discountModal.type === 'percentage' ? tOrders('discountPercentageLabel') : tOrders('discountAmountLabel')}
              </label>
              <div className="relative">
                <span className="absolute start-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                  {discountModal.type === 'percentage' ? '%' : currency}
                </span>
                <input
                  id="discountValue"
                  type="number"
                  min={0}
                  max={discountModal.type === 'percentage' ? 100 : Number(discountModal.order.total)}
                  step={discountModal.type === 'percentage' ? 1 : 0.01}
                  value={discountModal.value || ''}
                  onChange={(e) => updateDiscountModal({ value: Number(e.target.value) })}
                  placeholder={discountModal.type === 'percentage' ? '0' : '0.00'}
                  className={`${INPUT} ps-10`}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Discount reason */}
            <div>
              <label htmlFor="discountReason" className={LABEL}>{tCommon('reasonOptional')}</label>
              <input
                id="discountReason"
                type="text"
                value={discountModal.reason}
                onChange={(e) => updateDiscountModal({ reason: e.target.value })}
                placeholder={tOrders('discountReason')}
                className={INPUT}
              />
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-1.5 rounded-xl bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tCommon('subtotal')}</span>
                <Ltr className="text-foreground">{fmt(Number(discountModal.order.subtotal))}</Ltr>
              </div>
              <div className="flex justify-between text-sm text-table-held">
                <span>
                  {tCommon('discount')}
                  {discountModal.type === 'percentage' && discountModal.value > 0 && (
                    <span className="ms-1 text-muted-foreground">{tOrders('percentOnSubtotal', { value: discountModal.value })}</span>
                  )}
                </span>
                <Ltr>
                  -{fmt(
                    discountModal.type === 'percentage'
                      ? Number(discountModal.order.subtotal) * discountModal.value / 100
                      : Number(discountModal.value)
                  )}
                </Ltr>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold text-foreground">
                <span>{tOrders('newTotal')}</span>
                <Ltr>
                  {fmt(
                    discountModal.type === 'percentage'
                      ? Number(discountModal.order.subtotal) * (1 - discountModal.value / 100)
                      : Number(discountModal.order.subtotal) - Number(discountModal.value)
                  )}
                </Ltr>
              </div>
            </div>

            {discountRequiresApproval && discountModal.value > 0 && (
              <div>
                <label htmlFor="discountPin" className={LABEL}>{tOrders('managerPinLabel')}</label>
                <input
                  id="discountPin"
                  type="password"
                  value={discountPin}
                  onChange={(e) => setDiscountPin(e.target.value)}
                  placeholder={tOrders('managerPin')}
                  maxLength={6}
                  className={INPUT}
                  dir="ltr"
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex-row justify-end">
            <Button type="button" variant="outline" size="touch" onClick={() => setDiscountModal(null)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" size="touch" onClick={handleApplyDiscount} disabled={discountModal.value <= 0}>
              <Percent />
              {tOrders('applyDiscount')}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* One row, up close: what it costs and what comes off it. The price can
          go up as well as down — a dish agreed at the table has no list price
          to discount from. */}
      {rowEdit && (
        <Modal open onOpenChange={(open) => { if (!open) setRowEdit(null); }} size="sm">
          <ModalHeader closeLabel={tCommon('close')}>
            <ModalTitle>{rowEdit.item.product_name}</ModalTitle>
            <ModalDescription>
              {tOrders('rowCurrentPrice')} <Ltr>{fmt(Number(rowEdit.item.unit_price))}</Ltr>
              {' × '}<Ltr>{String(rowEdit.item.quantity)}</Ltr>
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            {awaitsPrice(rowEdit.item) && (
              <p className="rounded-xl bg-pending-soft px-3 py-2 text-sm text-pending">
                {tOrders('rowPriceAwaitingHint')}
              </p>
            )}
            <div>
              <label htmlFor="rowNewPrice" className={LABEL}>{tOrders('rowNewPrice')}</label>
              <input
                id="rowNewPrice"
                type="text"
                inputMode="decimal"
                value={rowEdit.unitPrice}
                onChange={(e) => setRowEdit({ ...rowEdit, unitPrice: e.target.value })}
                className={`${INPUT} text-lg font-semibold`}
                dir="ltr"
                autoFocus
              />
            </div>
            {discountRequiresApproval && (
              <div>
                <label htmlFor="rowPin" className={LABEL}>{tOrders('managerPin')}</label>
                <input
                  id="rowPin"
                  type="password"
                  value={rowEdit.overridePin}
                  onChange={(e) => setRowEdit({ ...rowEdit, overridePin: e.target.value })}
                  className={INPUT}
                  dir="ltr"
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" size="touch-lg" onClick={saveRowPrice} disabled={savingRow} className="w-full">
              {awaitsPrice(rowEdit.item) ? tOrders('rowConfirmPrice') : tOrders('rowSavePrice')}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* How many are at the table. Its own little window because it changes
          what the guests pay, not just what the screen says. */}
      {guestEdit !== null && (
        <Modal open onOpenChange={(open) => { if (!open) setGuestEdit(null); }} size="sm">
          <ModalHeader closeLabel={tCommon('close')}>
            <ModalTitle>{tOrders('changeGuests')}</ModalTitle>
            <ModalDescription>{tOrders('changeGuestsHint')}</ModalDescription>
          </ModalHeader>
          <ModalBody className="flex justify-center py-6">
            <Stepper
              size="lg"
              min={1}
              max={99}
              value={Math.max(1, Number(guestEdit) || 1)}
              onChange={(count) => setGuestEdit(String(count))}
              decreaseLabel={tPos('decreasePax')}
              increaseLabel={tPos('increasePax')}
            />
          </ModalBody>
          <ModalFooter className="flex-row">
            <Button type="button" variant="outline" size="touch-lg" className="flex-1" onClick={() => setGuestEdit(null)} disabled={savingRow}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" size="touch-lg" className="flex-1" onClick={saveGuestCount} disabled={savingRow}>
              {tCommon('save')}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Filling in a course of a menu already on the check. The same window
          the till uses, told to show one course — props in, callback out, no
          API client of its own, which is what lets it mount here at all. */}
      {menuFill?.group.menu && (
        <FixedMenuPicker
          menu={menuFill.group.menu}
          products={catalogProducts}
          categories={catalogCategories}
          mode="fill"
          restrictToCourseId={menuFill.courseId}
          // Every course the menu already holds, not only the one on show:
          // the window reads "still missing" and the line price off the whole
          // selection, and with the others left out it listed courses that
          // were full and priced a menu without its surcharges. onAdd keeps
          // only the shown course, so nothing else is rewritten.
          initialSelection={menuFill.group.slots
            .flatMap((slot) => slot.filled.map((row) => ({ course_id: slot.course.id, product_id: String(row.product_id) })))}
          onClose={() => { if (!fillingMenu) setMenuFill(null); }}
          onAdd={(_menu, selection) => setCourseDishes(
            menuFill.group.group_id,
            menuFill.courseId,
            selection.filter((choice) => choice.course_id === menuFill.courseId).map((choice) => choice.product_id),
          )}
        />
      )}

      {ConfirmDialog}
    </>
  );
}
