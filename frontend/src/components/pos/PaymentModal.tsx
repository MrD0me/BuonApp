'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Wallet, ArrowLeftRight, CheckCircle2, Sparkles, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Bill } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useTranslations, useLocale, type AppConfig } from 'use-intl';
import { PAYMENT_METHODS, type CustomPaymentMethod } from '@/lib/payment-methods';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useCurrencyUnitAdapter } from '@/hooks/useCurrencyUnitAdapter';
import { useWhatsAppReady } from '@/hooks/useWhatsAppReady';
import { sendBillViaFlo, shareBillViaWhatsApp } from '@/lib/whatsapp-share';
import { useAuthStore } from '@/store/auth';

interface Props {
  bill: Bill;
  currency: string;
  onClose: () => void;
  onPaid: () => void;
  onBillUpdate?: (bill: Bill) => void;
}

interface Payment {
  method: string;
  payment_method_id?: number;
  amount: string;
}

// Fixed conversion rate for redeeming loyalty wallet points as payment (points per 1 currency unit).
// Must match LOYALTY_REDEMPTION_RATE in main/routes/bills.ts.
const LOYALTY_REDEMPTION_RATE = 100;

type PosKey = keyof AppConfig['Messages']['pos'];

// Built-in payment method label keys mapped to typed `pos` leaf keys.
const BUILT_IN_PAYMENT_KEYS = {
  cash: 'methodCash',
  card: 'methodCard',
} as const satisfies Record<'cash' | 'card', PosKey>;

export default function PaymentModal({ bill, onClose, onPaid, onBillUpdate }: Props) {
  const remaining = Number(bill.balance);
  const cartCustomerId = useCartStore((s) => s.customerId);
  const cartCustomer = useCartStore((s) => s.customer);
  const effectiveCustomerId = bill.customer_id || cartCustomerId || null;
  const t = useTranslations('pos');
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const tOrders = useTranslations('orders');
  const tWhatsappSend = useTranslations('whatsapp.send');

  // sendBillViaFlo (shared with OrdersPage) takes a translator callback;
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
  const { currentTenant } = useAuthStore();
  const isWhatsAppReady = useWhatsAppReady();
  const unitAdapter = useCurrencyUnitAdapter();
  const { toDisplay: toDisplayUnit, toStored: toStoredUnit, label: inputCurrencyLabel, step: inputCurrencyStep, formatInput } = unitAdapter;

  const idempotencyKeyRef = useRef<string | null>(null);
  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [bill.id]);
  const [justPaid, setJustPaid] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [payments, setPayments] = useState<Payment[]>(
    PAYMENT_METHODS.map((method) => ({ method: method.key, amount: '' })),
  );
  // Tracks whether the cashier has manually typed a split amount — once true, we stop
  // auto-rescaling payment splits (e.g. on discount edits) so we don't clobber their entry.
  const [paymentsTouched, setPaymentsTouched] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [customMethods, setCustomMethods] = useState<CustomPaymentMethod[]>([]);

  const [loyaltySettings, setLoyaltySettings] = useState<{ loyalty_enabled: boolean } | null>(null);

  // Dynamically update payment inputs when remaining balance changes, but only until the
  // cashier manually edits an amount — after that, discount/wallet edits must not silently
  // rewrite amounts they've already typed in. Same during-render pattern as above.
  const [syncedRemaining, setSyncedRemaining] = useState(remaining);
  if (!paymentsTouched && remaining !== syncedRemaining) {
    setSyncedRemaining(remaining);
    const totalAllocated = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (totalAllocated > 0) {
      const displayRemaining = toDisplayUnit(remaining);
      setPayments(payments.map(p => {
        const ratio = (parseFloat(p.amount) || 0) / totalAllocated;
        return { ...p, amount: formatInput(displayRemaining * ratio) };
      }));
    }
  }

  useEffect(() => {
    const custId = bill.customer_id || cartCustomerId;
    if (custId) {
      api.get(`/customers/${custId}/wallet`)
        .then((res) => {
          setWalletBalance(Number(res.data.balance) || 0);
        })
        .catch(() => setWalletBalance(0));
    }
    api.get('/settings/loyalty')
      .then((res) => setLoyaltySettings(res.data))
      .catch(() => {});
    api.get('/payment-methods')
      .then((res) => {
        const methods: CustomPaymentMethod[] = res.data.payment_methods || [];
        setCustomMethods(methods);
        setPayments((current) => [
          ...PAYMENT_METHODS.map((method) => current.find((row) => row.method === method.key && row.payment_method_id === undefined) || { method: method.key, amount: '' }),
          ...methods.map((method) => current.find((row) => row.payment_method_id === method.id) || { method: 'custom', payment_method_id: method.id, amount: '' }),
        ]);
      })
      .catch(() => setCustomMethods([]));
  }, [bill.customer_id, cartCustomerId]);

  const walletAmt = toStoredUnit(parseFloat(walletAmount) || 0);
  const totalPayment = payments.reduce((s, p) => s + toStoredUnit(parseFloat(p.amount) || 0), 0) + walletAmt;

  const updatePaymentAmount = (idx: number, value: string) => {
    setPaymentsTouched(true);
    setPayments(payments.map((payment, index) => index === idx ? { ...payment, amount: value } : payment));
  };

  /**
   * "Pay it all with this." The other methods are cleared, so tapping cash and
   * then changing your mind to card does not leave the card at nothing with
   * the cash still filled in — which meant deleting a figure by hand to pick
   * the other one. A bill settled with two methods is still built by typing
   * the amounts into the boxes.
   */
  const allocateRemainingTo = (idx: number) => {
    const dueStored = Math.max(0, remaining - walletAmt);
    const dueDisplay = toDisplayUnit(dueStored);
    setPaymentsTouched(true);
    setPayments(payments.map((payment, index) => index === idx
      ? { ...payment, amount: dueDisplay > 0 ? String(dueDisplay) : '' }
      : { ...payment, amount: '' }));
  };

  const hasCash = payments.some((p) => p.method === 'cash' && (parseFloat(p.amount) || 0) > 0);

  const change = hasCash && totalPayment > remaining + 0.009
    ? parseFloat((totalPayment - remaining).toFixed(2))
    : 0;

  const currencyFmt = useFormatCurrency();
  const fmtNum = useFormatNumber();

  const handlePay = async () => {
    const amountIsValid = (value: string) => value.trim() === '' || /^\d+(?:\.\d{1,4})?$/.test(value.trim());
    if (payments.some((p) => (
      !PAYMENT_METHODS.some((allowed) => allowed.key === p.method)
      && !customMethods.some((method) => method.id === p.payment_method_id)
    ) || !amountIsValid(p.amount))) {
      toast.error(t('paymentFailed'));
      return;
    }
    if (walletAmount.trim() && !/^\d+(?:\.\d{1,4})?$/.test(walletAmount.trim())) {
      toast.error(t('paymentFailed'));
      return;
    }
    const nonCashTotal = payments
      .filter((p) => p.method !== 'cash')
      .reduce((sum, p) => sum + toStoredUnit(Number(p.amount) || 0), 0) + walletAmt;
    if (nonCashTotal > remaining + 0.000001) {
      toast.error(t('paymentAboveBalance'));
      return;
    }
    if (totalPayment < remaining - 0.01) {
      toast.error(t('paymentBelowBalance'));
      return;
    }
    // Validate wallet amount against available balance (convert currency to points for comparison)
    if (walletAmt > 0 && walletBalance !== null) {
      const redemptionRate = LOYALTY_REDEMPTION_RATE;
      const walletPointsRequired = walletAmt * redemptionRate;
      if (walletPointsRequired > walletBalance) {
        const maxCurrency = Math.floor(walletBalance / redemptionRate);
        toast.error(t('walletMaxAmount', { max: currencyFmt(maxCurrency) }));
        return;
      }
    }
    setProcessing(true);
    try {
      const splitLines = payments
        .map((p) => ({
          method: p.payment_method_id === undefined ? p.method : 'custom',
          ...(p.payment_method_id !== undefined ? { payment_method_id: p.payment_method_id } : {}),
          amount: toStoredUnit(parseFloat(p.amount) || 0),
        }))
        .filter((p) => p.amount > 0 && !isNaN(p.amount));
      if (walletAmt > 0) splitLines.push({ method: 'wallet', amount: walletAmt });

      // Single atomic call (#177) — either every split line is applied, or none are.
      // Sequential per-line requests would leave the bill partially paid if a later
      // line failed (e.g. network drop) after an earlier one had already committed.
      const idempotencyKey = idempotencyKeyRef.current || (typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : 'payment-req');
      idempotencyKeyRef.current = idempotencyKey;
      const res = await api.post(
        `/bills/${bill.id}/payments`,
        { payments: splitLines, customer_id: effectiveCustomerId },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      const updatedBill = res.data?.bill as Bill | undefined;
      if (!updatedBill || updatedBill.payment_status !== 'paid') {
        // This request committed a partial payment, so the next attempt is a
        // new request and must not reuse the completed request's hash.
        if (updatedBill) idempotencyKeyRef.current = null;
        if (updatedBill && onBillUpdate) onBillUpdate(updatedBill);
        toast.error(t('paymentIncomplete', {
          amount: currencyFmt(Number(updatedBill?.balance) || 0),
        }));
        return;
      }
      const earned = res.data?.loyaltyPointsEarned > 0 ? res.data.loyaltyPointsEarned : 0;
      setPointsEarned(earned);
      if (earned > 0) {
        toast.success(t('paymentRecordedWithPoints', { points: earned }));
      } else {
        toast.success(t('paymentRecorded'));
      }
      setJustPaid(true);
    } catch {
      toast.error(t('paymentFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const tenantForShare = {
    business_name: currentTenant?.business_name || tCommon('businessNameFallback'),
    currency: currentTenant?.currency || 'INR',
    country: currentTenant?.country || 'IN',
  };

  const handleSendWhatsApp = async () => {
    const phone = cartCustomer?.phone;
    if (!phone) {
      toast.error(tWhatsappSend('customerPhoneRequired'));
      return;
    }
    setSendingWa(true);
    try {
      await sendBillViaFlo(bill, phone, tenantForShare, whatsappSendT, { pointsEarned }, locale);
    } finally {
      setSendingWa(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!cartCustomer?.phone) {
      toast.error(tWhatsappSend('customerPhoneRequired'));
      return;
    }
    try {
      shareBillViaWhatsApp(
        bill,
        { phone: cartCustomer.phone, country_code: cartCustomer.country_code },
        tenantForShare,
        { pointsEarned },
        locale,
      );
    } catch {
      toast.error(tOrders('whatsappFailed'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('payment')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('billNumber', { number: bill.bill_number })}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Amount + Customer Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl px-5 py-4 text-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{t('totalDue')}</p>
                <p className="text-4xl font-bold mt-1 tracking-tight">{currencyFmt(remaining)}</p>
              </div>
              {cartCustomer && (
                <div className="text-end ms-4 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-1 ms-auto">
                    <User size={16} className="text-white/70" />
                  </div>
                  <p className="text-sm font-semibold text-white leading-tight">{cartCustomer.name}</p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>{t('subtotal')}</span>
                <span>{currencyFmt(Number(bill.subtotal))}</span>
              </div>
              {Number(bill.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>{t('discount')}</span>
                  <span>− {currencyFmt(Number(bill.discount_amount))}</span>
                </div>
              )}
              {Number(bill.delivery_charge) > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>{t('delivery')}</span>
                  <span>{currencyFmt(Number(bill.delivery_charge))}</span>
                </div>
              )}
              {Number(bill.packaging_charge) > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>{t('packaging')}</span>
                  <span>{currencyFmt(Number(bill.packaging_charge))}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-semibold border-t border-white/10 pt-1.5 mt-1">
                <span>{t('total')}</span>
                <span>{currencyFmt(Number(bill.total))}</span>
              </div>
            </div>
          </div>

          {/* Loyalty Info Strip (staff reference) */}
          {loyaltySettings?.loyalty_enabled && effectiveCustomerId && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
              <Sparkles size={13} className="text-gray-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                <span className="text-gray-700 font-medium">{t('loyalty')}</span>
                <span className="font-semibold text-gray-700">
                  {walletBalance !== null
                    ? t('pointsApproxValue', { count: fmtNum(walletBalance), value: currencyFmt(Math.floor(walletBalance / (LOYALTY_REDEMPTION_RATE))) })
                    : '…'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {payments.map((payment, idx) => {
              const builtIn = PAYMENT_METHODS.find((method) => method.key === payment.method && payment.payment_method_id === undefined);
              const custom = customMethods.find((method) => method.id === payment.payment_method_id);
              const label = builtIn ? t(BUILT_IN_PAYMENT_KEYS[builtIn.key]) : custom?.name || tCommon('unknown');
              const Icon = builtIn?.icon;
              const active = (parseFloat(payment.amount) || 0) > 0;
              return <div key={payment.payment_method_id === undefined ? payment.method : `custom:${payment.payment_method_id}`} className="flex h-14">
                {/* Tapping the method fills in what is still owed: the till is
                    not a place to retype a number the screen already knows.
                    The box beside it stays for the two cases that need one —
                    cash handed over for change, and a bill settled with more
                    than one method. */}
                <button
                  type="button"
                  title={t('payAllWith', { method: label })}
                  onClick={() => allocateRemainingTo(idx)}
                  className={`w-44 shrink-0 rounded-s-xl border-2 px-3 flex items-center justify-center gap-2 text-base font-semibold transition-colors ${active ? 'bg-brand text-white border-brand' : 'bg-white text-gray-800 border-gray-300 hover:border-brand hover:bg-brand/5 hover:text-brand active:bg-brand/10'}`}
                >
                  {Icon && <Icon size={18} />}
                  <span className="truncate">{label}</span>
                </button>
                <div className="flex flex-1 items-center border-2 border-s-0 border-gray-300 rounded-e-xl bg-white focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent">
                  <span className="ps-3 text-gray-400 text-xs">{inputCurrencyLabel}</span>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => updatePaymentAmount(idx, e.target.value)}
                    placeholder="0.00"
                    className="min-w-0 flex-1 px-2 py-2 text-end text-sm font-semibold outline-none rounded-e-xl"
                    step={inputCurrencyStep}
                    min="0"
                  />
                </div>
              </div>;
            })}
          </div>

          {/* Change Returned */}
          {hasCash && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between border-2 transition-all duration-200 ${
              change > 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  change > 0 ? 'bg-emerald-100' : 'bg-gray-200'
                }`}>
                  {change > 0
                    ? <CheckCircle2 size={15} className="text-emerald-600" />
                    : <ArrowLeftRight size={13} className="text-gray-400" />
                  }
                </div>
                <span className={`text-sm font-semibold ${
                  change > 0 ? 'text-emerald-800' : 'text-gray-400'
                }`}>
                  {t('changeReturned')}
                </span>
              </div>
              <span className={`text-xl font-bold tabular-nums ${
                change > 0 ? 'text-emerald-600' : 'text-gray-300'
              }`}>
                {currencyFmt(change)}
              </span>
            </div>
          )}

          {/* Loyalty Wallet Section */}
          {loyaltySettings?.loyalty_enabled && effectiveCustomerId && walletBalance !== null && (
            <div className="space-y-1">
              <div className="flex h-14">
                <button type="button" disabled={walletBalance <= 0} onClick={() => {
                  const allocatedElsewhere = payments.reduce((sum, payment) => sum + toStoredUnit(parseFloat(payment.amount) || 0), 0);
                  const maxWalletStored = Math.floor(walletBalance / LOYALTY_REDEMPTION_RATE);
                  const dueStored = Math.min(maxWalletStored, Math.max(0, remaining - allocatedElsewhere));
                  const dueDisplay = toDisplayUnit(dueStored);
                  setWalletAmount(dueDisplay > 0 ? String(dueDisplay) : '');
                }} className={`w-36 shrink-0 rounded-s-xl border px-3 flex items-center gap-2 text-sm font-semibold ${walletAmt > 0 ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-800 border-purple-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200'}`}>
                  <Wallet size={15} /><span className="truncate">{t('loyaltyWallet')}</span>
                </button>
                <div className="flex flex-1 items-center border border-s-0 border-purple-200 rounded-e-xl bg-white focus-within:ring-2 focus-within:ring-purple-400">
                  <span className="ps-3 text-gray-400 text-xs">{inputCurrencyLabel}</span>
                  <input
                    type="number"
                    value={walletAmount}
                    onChange={(e) => {
                      const v = e.target.value;
                      const maxWalletCurrencyStored = Math.floor(walletBalance / (LOYALTY_REDEMPTION_RATE));
                      const maxDisplay = toDisplayUnit(Math.min(maxWalletCurrencyStored, remaining));
                      const clamped = parseFloat(v) > maxDisplay ? String(maxDisplay) : v;
                      setWalletAmount(clamped);
                    }}
                    placeholder="0.00"
                    disabled={walletBalance <= 0}
                    className="min-w-0 flex-1 px-2 py-2 text-end text-sm font-semibold outline-none rounded-e-xl disabled:bg-gray-50"
                    step={inputCurrencyStep}
                    min="0"
                    max={toDisplayUnit(Math.min(Math.floor(walletBalance / (LOYALTY_REDEMPTION_RATE)), remaining))}
                  />
                </div>
              </div>
              <p className="px-1 text-[11px] text-gray-400 text-end">{walletBalance > 0 ? t('pointsApproxValue', { count: fmtNum(walletBalance), value: currencyFmt(Math.floor(walletBalance / LOYALTY_REDEMPTION_RATE)) }) : t('noBalance')}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 border-t border-gray-100 pt-3 space-y-2">
          {justPaid ? (
            <>
              {cartCustomer?.phone && (
                isWhatsAppReady ? (
                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={sendingWa}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    size="lg"
                  >
                    <Send size={16} className="me-2" />
                    {sendingWa ? t('processingPayment') : t('sendViaWhatsApp')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleShareWhatsApp}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Send size={16} className="me-2" />
                    {tCommon('shareViaWhatsApp')}
                  </Button>
                )
              )}
              <Button onClick={onPaid} variant="outline" className="w-full" size="lg">
                {tCommon('done')}
              </Button>
            </>
          ) : (
            <Button onClick={handlePay} disabled={processing || totalPayment < remaining - 0.01} className="w-full" size="lg">
              {processing ? t('processingPayment') : `${t('pay')} ${currencyFmt(totalPayment)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
