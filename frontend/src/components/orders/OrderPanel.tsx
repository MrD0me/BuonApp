'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { CreditCard, Trash2, RotateCcw, Clock, MessageCircle, Printer, XCircle, Percent, Banknote, Plus, ChefHat, Pencil, MoreHorizontal, Users, ChevronDown, ChevronRight, UserPlus, User, ShoppingBag, Send, Loader2, Ban, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentModal from '@/components/pos/PaymentModal';
import { shareBillViaWhatsApp, sendBillViaFlo } from '@/lib/whatsapp-share';
import { useConfirm } from '@/hooks/use-confirm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const itemStatusConfig: Record<OrderItem['status'], { dot: string; color: string; labelKey: OrdersKey }> = {
  pending: { dot: 'bg-yellow-400', color: 'text-yellow-700', labelKey: 'itemStatusWaiting' },
  preparing: { dot: 'bg-blue-500', color: 'text-blue-700', labelKey: 'itemStatusPreparing' },
  ready: { dot: 'bg-green-500', color: 'text-green-700', labelKey: 'itemStatusReady' },
  served: { dot: 'bg-purple-500', color: 'text-purple-700', labelKey: 'itemStatusServed' },
  cancelled: { dot: 'bg-red-400', color: 'text-red-500', labelKey: 'itemStatusCancelled' },
  voided: { dot: 'bg-red-500', color: 'text-red-600 line-through', labelKey: 'itemStatusVoided' },
  void_adjustment: { dot: 'bg-red-300', color: 'text-red-500 italic', labelKey: 'itemStatusVoidAdjustment' },
};

const orderStatusBadge: Record<Order['status'], { bg: string; text: string; labelKey: OrdersKey }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', labelKey: 'pending' },
  preparing: { bg: 'bg-blue-100', text: 'text-blue-700', labelKey: 'preparing' },
  ready: { bg: 'bg-green-100', text: 'text-green-700', labelKey: 'ready' },
  served: { bg: 'bg-purple-100', text: 'text-purple-700', labelKey: 'served' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', labelKey: 'completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', labelKey: 'cancelled' },
};

const paymentStatusBadge: Record<'paid' | 'partial' | 'unpaid', { bg: string; text: string; labelKey: OrdersKey }> = {
  paid: { bg: 'bg-green-100', text: 'text-green-700', labelKey: 'paid' },
  partial: { bg: 'bg-amber-100', text: 'text-amber-700', labelKey: 'partiallyPaid' },
  unpaid: { bg: 'bg-red-100', text: 'text-red-700', labelKey: 'unpaidBadge' },
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
}

export function OrderPanel({
  order, onChanged, discountMode, discountRequiresApproval, nowMs,
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
  const pendingKotItems = (order.items || []).filter(
    (item) => item.kot_batch == null && item.status !== 'cancelled',
  );

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
    // A fixed menu comes off the check whole, from whichever of its rows this
    // was pressed on. Say so before doing it.
    const question = item?.menu_group_id ? tOrders('removeMenuConfirm') : tOrders('removeItemConfirm');
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

            const activeItems = (order.items || []).filter((i: OrderItem) => i.status !== 'cancelled');
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

  return (
    <>
      <div
        key={order.id}
        className={`bg-white rounded-xl border overflow-hidden flex flex-col ${
          order.status === 'cancelled' ? 'border-red-200 opacity-75' : 'border-gray-100'
        }`}
      >
        {/* Top bar: order id/status on the left, payment badge + reprint on the right */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold text-gray-900">#<Ltr>{order.order_number}</Ltr></span>
            {(() => { const badge = orderStatusBadge[order.status]; return badge ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{tOrders(badge.labelKey)}</span>
            ) : null; })()}
            <span className="text-sm text-gray-500 capitalize">{tOrders(ORDER_TYPE_LABEL_KEYS[order.type])}</span>
            {order.table && (
              <span className="text-sm text-orange-600 font-medium">{order.table.name}</span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={12} />
              {getTimeSince(order.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {payBadge && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${payBadge.bg} ${payBadge.text}`}>
                {tOrders(payBadge.labelKey)}
              </span>
            )}
            {paid && order.customer?.phone && (
              <button
                onClick={() => isWhatsAppReady ? handleSendViaFlo(order) : handleWhatsAppShare(order)}
                disabled={sendingWaOrderId === order.id}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-70"
                title={isWhatsAppReady ? tCommon('sendViaFlo') : tCommon('shareViaWhatsApp')}
              >
                {sendingWaOrderId === order.id ? <Loader2 className="size-4 animate-spin" /> : isWhatsAppReady ? <Send size={14} /> : <MessageCircle size={14} />}
              </button>
            )}
            {order.bill && (
              <button
                onClick={handlePrintBill}
                disabled={printingBillId === order.bill.id}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                title={(printHistory[order.bill.id]?.length ?? 0) > 0 ? tCommon('reprint') : tCommon('print')}
              >
                <Printer size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Order notes */}
        {order.special_instructions && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <p className="text-sm text-amber-700 font-medium break-words">
              📝 {order.special_instructions}
            </p>
          </div>
        )}

        {/* Customer info strip */}
        {order.customer ? (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <User size={14} className="text-blue-600 shrink-0" />
              <span className="text-sm font-medium text-blue-800 truncate">{order.customer.name}</span>
              {order.customer.phone && (
                <span className="text-xs text-blue-600 shrink-0"><Ltr>{order.customer.phone}</Ltr></span>
              )}
            </div>
            <button
              onClick={() => handleCreateNewOrderForCustomer(order)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-lg transition-colors shrink-0"
              title={tOrders('startNewOrderForCustomer')}
            >
              <Plus size={12} /> {tOrders('newOrder')}
            </button>
          </div>
        ) : customersEnabled && isOwnerOrManager && !['completed', 'cancelled'].includes(order.status) ? (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
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
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setLinkCustomerOrderId(null);
                    setLinkCustomerSearch('');
                    setLinkCustomerResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLinkCustomerOrderId(order.id)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <UserPlus size={14} />
                {tOrders('linkCustomer')}
              </button>
            )}
            {linkCustomerOrderId === order.id && linkCustomerResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {linkCustomerResults.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleLinkCustomer(order.id, String(customer.id))}
                    disabled={linkingCustomer}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-start disabled:opacity-50"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                      {customer.phone && (
                        <span className="text-xs text-gray-500 ms-2"><Ltr>{customer.phone}</Ltr></span>
                      )}
                    </div>
                    {linkingCustomer && <span className="text-xs text-gray-400">{tOrders('linking')}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Items — presented like a bill */}
        <div className="px-4 py-3 flex-1">
          <div className="divide-y divide-gray-50">
            {activeItems.map((item: OrderItem) => {
              const config = itemStatusConfig[item.status] || itemStatusConfig.pending;
              const isMenuCourse = item.menu_role === 'course';
              return (
                <div key={item.id} className="py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} title={tOrders(config.labelKey)} />
                      <span className={`text-sm font-medium ${config.color}`}>
                        {item.quantity}x
                      </span>
                      <span className={`text-sm truncate ${isMenuCourse ? 'text-gray-500 ps-3' : 'text-gray-900'}`}>{item.product_name}</span>
                      {awaitsPrice(item) && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-medium">
                          {tOrders('rowPriceMissing')}
                        </span>
                      )}
                      {item.special_instructions && (
                        <span className="text-xs text-red-500 italic break-words">&quot;{item.special_instructions}&quot;</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* A dish inside a menu is paid for by the package: it
                          shows a surcharge or nothing, never a bare 0,00. */}
                      <span className="text-sm text-gray-600">
                        {isMenuCourse
                          ? (Number(item.total) > 0 ? `+${fmt(Number(item.total))}` : '')
                          : fmt(Number(item.total))}
                      </span>
                      {item.status === 'pending' && isOwnerOrManager && !paid && (
                        <button
                          onClick={() => deleteItem(order.id, item.id, item)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          title={tCommon('removeItem')}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {isOwnerOrManager && !paid && !['completed', 'cancelled'].includes(order.status) && (
                        <button
                          onClick={() => openRowEdit(item)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title={tOrders('editRow')}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {(item.status === 'preparing' || item.status === 'ready') && isOwnerOrManager && !paid && (
                        <button
                          onClick={() => setVoidItemModal({ orderId: order.id, itemId: item.id, productName: item.product_name, overridePin: '' })}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          title={tOrders('voidItem')}
                        >
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="ps-4 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {item.addons.map((addon, idx) => (
                        <span key={addon.id ?? `${item.id}-${idx}`} className="text-xs text-gray-400">
                          + {addon.name}{(addon.quantity || 1) > 1 ? ` ×${addon.quantity}` : ''}{addon.price ? ` (${fmt(Number(addon.price) * (addon.quantity || 1))})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bill summary */}
          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{tCommon('subtotal')}</span>
              <span className="text-gray-700">{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-purple-600">{tCommon('discount')}</span>
                <span className="text-purple-600">-{fmt(discount)}</span>
              </div>
            )}
            {coverCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {tOrders('coverCharge')}
                  {order.guest_count ? ` (${order.guest_count})` : ''}
                </span>
                <span className="text-gray-700">{fmt(coverCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-100">
              <span className="text-gray-900">{tCommon('total')}</span>
              <span className="text-gray-900">{fmt(total)}</span>
            </div>
            {bill && payStatus === 'partial' && (
              <div className="flex justify-between text-xs text-gray-500 pt-0.5">
                <span>{tOrders('paid')} {fmt(paidSoFar)}</span>
                <span>{tOrders('balance')} {fmt(stillOwed)}</span>
              </div>
            )}
          </div>

          {/* Cancelled items */}
          {cancelledItems.length > 0 && isOwnerOrManager && (
            <div className="mt-2 pt-2 border-t border-gray-50">
              {cancelledItems.map((item: OrderItem) => (
                <div key={item.id} className="flex items-center justify-between py-1 opacity-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">❌</span>
                    <span className="text-xs text-gray-400 line-through">
                      {item.quantity}x {item.product_name}
                    </span>
                  </div>
                  {!paid && order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => restoreItem(order.id, item.id)}
                      className="p-1 rounded hover:bg-green-50 text-green-400 hover:text-green-600"
                      title={tCommon('restore')}
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {order.bill && printHistory[order.bill.id]?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setPrintHistoryExpanded(prev => ({ ...prev, [order.bill!.id]: !prev[order.bill!.id] }));
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {printHistoryExpanded[order.bill!.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl-flip" />}
                {tOrders('printHistory')}
              </button>

              {printHistoryExpanded[order.bill!.id] && (
                <div className="mt-2 ps-4 space-y-1">
                  {printHistory[order.bill!.id].map((print, index) => (
                    <div key={print.id} className="text-xs text-gray-500">
                      {index + 1}. {tOrders('printHistoryEntry', { printedType: print.print_type === 'reprint' ? tOrders('reprint') : tOrders('printed'), user: print.user_name, time: formatDateTime(print.printed_at) })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with actions
            Four things the floor does, then everything else behind "more":
            voiding, discounting the whole check, converting and cancelling are
            manager business, and putting them in the same row as "add a dish"
            is how a footer becomes a wall of buttons. */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          {!['completed', 'cancelled'].includes(order.status) && (
            <Button
              variant="outline"
              onClick={handleAddItems}
              size="sm"
              className="flex-1 justify-center border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              <Plus size={14} className="me-1.5" />
              {tOrders('addItem')}
            </Button>
          )}
          {pendingKotItems.length > 0 && kotPrintingEnabled && !['completed', 'cancelled'].includes(order.status) && (
            <Button
              variant="outline"
              onClick={handleSendToKitchen}
              disabled={sendingToKitchen}
              size="sm"
              className="flex-1 justify-center border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
            >
              <ChefHat size={14} className="me-1.5" />
              {sendingToKitchen ? tPos('kotSending') : tPos('sendToKitchen', { count: pendingKotItems.length })}
            </Button>
          )}
          {/* The bill on paper, which in this fork is what goes to the table.
              It used to appear only after checkout had opened the payment
              window, so printing one meant going through cashing up first. */}
          {order.status !== 'cancelled' && (
            <Button
              variant="outline"
              onClick={handlePrintBill}
              disabled={generatingBill === order.id || printingBillId === order.bill?.id}
              size="sm"
              className="flex-1 justify-center"
            >
              <Printer size={14} className="me-1.5" />
              {tOrders('printBillAction')}
            </Button>
          )}
          {showCheckout(order) && (
            <Button
              onClick={() => handleCheckout(order.id)}
              disabled={generatingBill === order.id}
              size="sm"
              className="flex-1 justify-center"
            >
              <CreditCard size={14} className="me-1.5" />
              {generatingBill === order.id ? tOrders('generating') : tOrders('checkout')}
            </Button>
          )}

          {!['completed', 'cancelled'].includes(order.status) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="justify-center px-2" title={tCommon('more')}>
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isOwnerOrManager && !paid && (
                  <DropdownMenuItem onClick={() => setDiscountModal({
                    order,
                    type: defaultDiscountTypeForMode(discountMode),
                    value: 0,
                    reason: '',
                  })}>
                    <Percent size={14} className="me-2" />
                    {tOrders('orderDiscountAction')}
                  </DropdownMenuItem>
                )}
                {order.type === 'dine_in' && (
                  <DropdownMenuItem onClick={() => setGuestEdit(String(order.guest_count || 1))}>
                    <Users size={14} className="me-2" />
                    {tOrders('changeGuests')}
                  </DropdownMenuItem>
                )}
                {order.type === 'dine_in' && takeawayEnabled && (
                  <DropdownMenuItem
                    onClick={() => handleConvertToTakeaway(order)}
                    disabled={convertingOrderId === order.id}
                  >
                    <ShoppingBag size={14} className="me-2" />
                    {convertingOrderId === order.id ? tOrders('converting') : tOrders('convertToTakeaway')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCancelModal({ order, reason: '', freeTable: true, overridePin: '' })}
                  disabled={cancellingOrderId === order.id}
                  variant="destructive"
                >
                  <XCircle size={14} className="me-2" />
                  {cancellingOrderId === order.id ? tOrders('cancelling') : tOrders('cancelOrderAction')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

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

      {/* Print Confirmation Modal */}
      {confirmPrintBillId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {(printHistory[confirmPrintBillId]?.length ?? 0) > 0 ? tOrders('reprintReceiptTitle') : tOrders('printReceiptTitle')}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {(printHistory[confirmPrintBillId]?.length ?? 0) > 0
                ? tOrders('reprintReceiptWarning')
                : tOrders('printReceiptConfirm')}
            </p>
            {/* Warned rather than blocked: a genuinely free row exists, and a
                block would push the floor into inventing a workaround. */}
            {unpricedItems.length > 0 && (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
                {tOrders('unpricedRowsWarning', { count: unpricedItems.length })}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmPrintBillId(null)}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPrintPreview(confirmPrintBillId)}
                disabled={previewingBillId === confirmPrintBillId}
                title={tOrders('downloadPrintPreview')}
                aria-label={tOrders('downloadPrintPreview')}
                className="w-9 px-0"
              >
                {previewingBillId === confirmPrintBillId
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Download size={14} />}
              </Button>
              <Button
                size="sm"
                onClick={() => handlePrint(confirmPrintBillId)}
                disabled={printingBillId === confirmPrintBillId}
              >
                <Printer size={14} className="me-1.5" />
                {printingBillId === confirmPrintBillId
                  ? tOrders('printing')
                  : (printHistory[confirmPrintBillId]?.length ?? 0) > 0
                    ? tOrders('confirmReprint')
                    : tOrders('confirmPrint')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{tOrders('cancel')} #<Ltr>{cancelModal.order.order_number}</Ltr></h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                  {tCommon('reasonOptional')}
                </label>
                <input
                  id="cancelReason"
                  type="text"
                  value={cancelModal.reason}
                  onChange={(e) => updateCancelModal({ reason: e.target.value })}
                  placeholder={tOrders('cancelReason')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {cancelModal.order.type === 'dine_in' && cancelModal.order.table && (
                <div className="flex items-center gap-2">
                  <input
                    id="freeTable"
                    type="checkbox"
                    checked={cancelModal.freeTable}
                    onChange={(e) => updateCancelModal({ freeTable: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="freeTable" className="text-sm text-gray-700">
                    {tOrders('freeTable', { name: cancelModal.order.table.name })}
                  </label>
                </div>
              )}

              {(cancelModal.order.status !== 'pending' || cancelModal.order.items?.some((i) => ['preparing', 'ready', 'served', 'completed'].includes(i.status))) && (
                <div>
                  <label htmlFor="overridePin" className="block text-sm font-medium text-gray-700 mb-1">
                    {tOrders('overridePinLabel')}
                  </label>
                  <input
                    id="overridePin"
                    type="password"
                    value={cancelModal.overridePin}
                    onChange={(e) => updateCancelModal({ overridePin: e.target.value })}
placeholder={tOrders('managerPin')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModal(null)}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleCancelOrder}
                disabled={cancellingOrderId === cancelModal.order.id}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {cancellingOrderId === cancelModal.order.id ? tOrders('cancelling') : tOrders('confirmCancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Void In-Progress Item Modal */}
      {voidItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{tOrders('voidItem')}</h2>
            <p className="text-sm text-gray-500 mb-4">{tOrders('voidItemConfirm', { name: voidItemModal.productName })}</p>

            <div>
              <label htmlFor="voidOverridePin" className="block text-sm font-medium text-gray-700 mb-1">
                {tOrders('overridePinLabel')}
              </label>
              <input
                id="voidOverridePin"
                type="password"
                autoFocus
                value={voidItemModal.overridePin}
                onChange={(e) => setVoidItemModal({ ...voidItemModal, overridePin: e.target.value })}
                placeholder={tOrders('managerPin')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVoidItemModal(null)}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleVoidItem}
                disabled={voidingItem || !voidItemModal.overridePin}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {voidingItem ? tOrders('voidingItem') : tOrders('confirmVoidItem')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{tOrders('applyDiscountTitle', { number: discountModal.order.order_number })}</h2>

            <div className="space-y-4">
              {/* Discount Type Toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {isDiscountTypeAllowed(discountMode, 'percentage') && (
                  <button
                    onClick={() => updateDiscountModal({ type: 'percentage', value: 0 })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                      discountModal.type === 'percentage'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Percent size={14} />
                    {tCommon('percentage')}
                  </button>
                )}
                {isDiscountTypeAllowed(discountMode, 'amount') && (
                  <button
                    onClick={() => updateDiscountModal({ type: 'amount', value: 0 })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                      discountModal.type === 'amount'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Banknote size={14} />
                    {tCommon('amount')}
                  </button>
                )}
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {discountModal.type === 'percentage' ? tOrders('discountPercentageLabel') : tOrders('discountAmountLabel')}
                </label>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {discountModal.type === 'percentage' ? '%' : currency}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={discountModal.type === 'percentage' ? 100 : Number(discountModal.order.total)}
                    step={discountModal.type === 'percentage' ? 1 : 0.01}
                    value={discountModal.value || ''}
                    onChange={(e) => updateDiscountModal({ value: Number(e.target.value) })}
                    placeholder={discountModal.type === 'percentage' ? '0' : '0.00'}
                    className="w-full ps-8 pe-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Discount Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tCommon('reasonOptional')}
                </label>
                <input
                  type="text"
                  value={discountModal.reason}
                  onChange={(e) => updateDiscountModal({ reason: e.target.value })}
                  placeholder={tOrders('discountReason')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{tCommon('subtotal')}</span>
                  <span className="text-gray-900">{fmt(Number(discountModal.order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-600">
                    {tCommon('discount')}
                    {discountModal.type === 'percentage' && discountModal.value > 0 && (
                      <span className="text-gray-400 ms-1">{tOrders('percentOnSubtotal', { value: discountModal.value })}</span>
                    )}
                  </span>
                  <span className="text-purple-600">
                    -{fmt(
                      discountModal.type === 'percentage'
                        ? Number(discountModal.order.subtotal) * discountModal.value / 100
                        : Number(discountModal.value)
                    )}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm font-bold">
                  <span className="text-gray-900">{tOrders('newTotal')}</span>
                  <span className="text-gray-900">
                    {fmt(
                      discountModal.type === 'percentage'
                        ? Number(discountModal.order.subtotal) * (1 - discountModal.value / 100)
                        : Number(discountModal.order.subtotal) - Number(discountModal.value)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {discountRequiresApproval && discountModal.value > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{tOrders('managerPinLabel')}</label>
                <input
                  type="password"
                  value={discountPin}
                  onChange={(e) => setDiscountPin(e.target.value)}
placeholder={tOrders('managerPin')}
                maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscountModal(null)}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleApplyDiscount}
                disabled={discountModal.value <= 0}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Percent size={14} className="me-1.5" />
                {tOrders('applyDiscount')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* One row, up close: what it costs and what comes off it. The price can
          go up as well as down — a dish agreed at the table has no list price
          to discount from. */}
      {rowEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-gray-900">{rowEdit.item.product_name}</h3>
              <button onClick={() => setRowEdit(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {tOrders('rowCurrentPrice')} <Ltr>{fmt(Number(rowEdit.item.unit_price))}</Ltr>
              {' × '}{rowEdit.item.quantity}
            </p>
            {awaitsPrice(rowEdit.item) && (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
                {tOrders('rowPriceAwaitingHint')}
              </p>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">{tOrders('rowNewPrice')}</label>
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                inputMode="decimal"
                value={rowEdit.unitPrice}
                onChange={(e) => setRowEdit({ ...rowEdit, unitPrice: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand"
                dir="ltr"
                autoFocus
              />
              <Button type="button" onClick={saveRowPrice} disabled={savingRow}>
                {awaitsPrice(rowEdit.item) ? tOrders('rowConfirmPrice') : tOrders('rowSavePrice')}
              </Button>
            </div>

            {discountRequiresApproval && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{tOrders('managerPin')}</label>
                <input
                  type="password"
                  value={rowEdit.overridePin}
                  onChange={(e) => setRowEdit({ ...rowEdit, overridePin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand"
                  dir="ltr"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* How many are at the table. Its own little window because it changes
          what the guests pay, not just what the screen says. */}
      {guestEdit !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs">
            <h3 className="font-bold text-gray-900 mb-1">{tOrders('changeGuests')}</h3>
            <p className="text-sm text-gray-500 mb-4">{tOrders('changeGuestsHint')}</p>
            <div className="flex items-center justify-center gap-3 mb-5">
              <button
                type="button"
                onClick={() => setGuestEdit(String(Math.max(1, Number(guestEdit) - 1)))}
                className="size-9 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label={tPos('decreasePax')}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="99"
                value={guestEdit}
                onChange={(e) => setGuestEdit(e.target.value)}
                className="w-16 text-center text-lg font-semibold border border-gray-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setGuestEdit(String(Math.min(99, Number(guestEdit) + 1)))}
                className="size-9 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label={tPos('increasePax')}
              >
                +
              </button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setGuestEdit(null)} disabled={savingRow}>
                {tCommon('cancel')}
              </Button>
              <Button type="button" className="flex-1" onClick={saveGuestCount} disabled={savingRow}>
                {tCommon('save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}
