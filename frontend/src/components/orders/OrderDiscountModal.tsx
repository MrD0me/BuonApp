'use client';

import { useState } from 'react';
import { useTranslations } from 'use-intl';
import toast from 'react-hot-toast';
import { Banknote, Equal, Percent } from 'lucide-react';
import api from '@/lib/api';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Ltr } from '@/components/layout/Ltr';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  defaultDiscountType,
  discountForTargetTotal,
  isDiscountTypeAllowed,
  roundingProposals,
  type DiscountMethods,
  type DiscountType,
} from '@/lib/discount-settings';

interface Props {
  order: Order;
  methods: DiscountMethods;
  requiresApproval: boolean;
  onClose: () => void;
  /** The order changed on the server; reload it. */
  onChanged: () => void;
}

const INPUT = 'h-touch w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-brand';
const LABEL = 'mb-1.5 block text-sm font-semibold text-foreground';

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * A discount on the whole check, three ways in.
 *
 * The first is the one a table is usually given: not "ten per cent" but a
 * round figure — "it's 53,40, call it 50". The window offers a couple of such
 * figures ready to tap, and shows the discount they come to, which is what the
 * preconto prints and the till is keyed with. The server works the discount
 * out again against the order as it stands when the request lands, so what is
 * typed here is always the total the table pays.
 */
export function OrderDiscountModal({ order, methods, requiresApproval, onClose, onChanged }: Props) {
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();

  const [type, setType] = useState<DiscountType>(defaultDiscountType(methods));
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  const subtotal = Number(order.subtotal) || 0;
  const coverCharge = Number(order.cover_charge || 0);
  // A discount only ever comes off the food: the cover and any other charge
  // go on after it, so they are the floor a new total cannot go under.
  const charges = round2(coverCharge + Number(order.delivery_charge || 0) + Number(order.packaging_charge || 0));
  const fullTotal = round2(subtotal + charges);
  const proposals = roundingProposals(fullTotal, charges);
  const hasDiscount = Number(order.discount_amount) > 0;

  const parsed = value.trim() === '' ? NaN : Number(value.replace(',', '.'));
  let discount = 0;
  let problem: string | null = null;
  if (Number.isFinite(parsed)) {
    if (type === 'total') {
      if (parsed < charges) problem = tOrders('discountTotalBelowCharges', { min: fmt(charges) });
      else if (parsed >= fullTotal) problem = tOrders('discountTotalNotBelow');
      else discount = discountForTargetTotal(fullTotal, parsed);
    } else if (type === 'percentage') {
      if (parsed > 0 && parsed <= 100) discount = round2(subtotal * parsed / 100);
    } else if (parsed > 0) {
      discount = round2(Math.min(parsed, subtotal));
    }
  }
  const newTotal = round2(Math.max(0, subtotal - discount) + charges);
  const canApply = discount > 0 && !saving && (!requiresApproval || pin !== '');

  const chooseType = (next: DiscountType) => {
    setType(next);
    setValue('');
  };

  const send = async (body: Record<string, unknown>, success: string) => {
    setSaving(true);
    try {
      await api.patch(`/orders/${order.id}/discount`, body);
      toast.success(success);
      onChanged();
      onClose();
    } catch {
      toast.error(tOrders('discountFailed'));
    } finally {
      setSaving(false);
    }
  };

  const apply = () => {
    if (!canApply || !isDiscountTypeAllowed(methods, type)) return;
    const common = {
      discount_type: type,
      discount_reason: reason || undefined,
      override_pin: requiresApproval ? pin : undefined,
    };
    void send(
      type === 'total' ? { ...common, target_total: parsed } : { ...common, discount_value: parsed },
      tOrders('discountApplied'),
    );
  };

  // No PIN: taking a discount off gives nothing away.
  const remove = () => void send({ discount_value: 0 }, tOrders('discountRemoved'));

  const typeButtons: { type: DiscountType; label: string; icon: typeof Percent }[] = [
    { type: 'total', label: tOrders('discountMethodTotal'), icon: Equal },
    { type: 'percentage', label: tCommon('percentage'), icon: Percent },
    { type: 'amount', label: tCommon('amount'), icon: Banknote },
  ];
  const shownTypes = typeButtons.filter((button) => isDiscountTypeAllowed(methods, button.type));

  const valueLabel = type === 'total'
    ? tOrders('discountTargetLabel')
    : type === 'percentage' ? tOrders('discountPercentageLabel') : tOrders('discountAmountLabel');

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="sm">
      <ModalHeader closeLabel={tCommon('close')}>
        <ModalTitle>{tOrders('applyDiscountTitle', { number: order.order_number })}</ModalTitle>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-3">
        {shownTypes.length > 1 && (
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {shownTypes.map(({ type: buttonType, label, icon: Icon }) => (
              <button
                key={buttonType}
                type="button"
                aria-pressed={type === buttonType}
                onClick={() => chooseType(buttonType)}
                className={`flex h-touch flex-1 items-center justify-center gap-2 rounded-lg text-base font-semibold transition ${
                  type === buttonType ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        )}

        {type === 'total' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tOrders('discountCurrentTotal')}</span>
              <Ltr className="font-semibold text-foreground">{fmt(fullTotal)}</Ltr>
            </div>
            {proposals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {proposals.map((proposal) => (
                  <Button
                    key={proposal}
                    type="button"
                    variant={Number.isFinite(parsed) && round2(parsed) === proposal ? 'default' : 'outline'}
                    size="touch"
                    className="flex-1"
                    onClick={() => setValue(String(proposal))}
                  >
                    <Ltr>{fmt(proposal)}</Ltr>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="discountValue" className={LABEL}>{valueLabel}</label>
          <input
            id="discountValue"
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
            placeholder={type === 'percentage' ? '0' : '0,00'}
            className={`${INPUT} text-lg font-semibold`}
            dir="ltr"
          />
          {problem && <p className="mt-1.5 text-sm text-destructive">{problem}</p>}
        </div>

        <div>
          <label htmlFor="discountReason" className={LABEL}>{tCommon('reasonOptional')}</label>
          <input
            id="discountReason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tOrders('discountReason')}
            className={INPUT}
          />
        </div>

        {/* What the preconto will say */}
        <div className="flex flex-col gap-1.5 rounded-xl bg-muted p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{tCommon('subtotal')}</span>
            <Ltr className="text-foreground">{fmt(subtotal)}</Ltr>
          </div>
          <div className="flex justify-between text-sm text-table-held">
            <span>
              {tCommon('discount')}
              {type === 'percentage' && discount > 0 && (
                <span className="ms-1 text-muted-foreground">{tOrders('percentOnSubtotal', { value: parsed })}</span>
              )}
            </span>
            <Ltr>-{fmt(discount)}</Ltr>
          </div>
          {coverCharge > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tOrders('coverCharge')}</span>
              <Ltr className="text-foreground">{fmt(coverCharge)}</Ltr>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold text-foreground">
            <span>{tOrders('newTotal')}</span>
            <Ltr>{fmt(newTotal)}</Ltr>
          </div>
        </div>

        {requiresApproval && discount > 0 && (
          <div>
            <label htmlFor="discountPin" className={LABEL}>{tOrders('managerPinLabel')}</label>
            <input
              id="discountPin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={tOrders('managerPin')}
              maxLength={6}
              className={INPUT}
              dir="ltr"
            />
          </div>
        )}
      </ModalBody>
      {/* Closing is the X, Escape or a tap outside, as for the row price: the
          footer keeps its room for taking a discount off. */}
      <ModalFooter className="flex-row justify-end">
        {hasDiscount && (
          <Button type="button" variant="ghost" size="touch" onClick={remove} disabled={saving} className="me-auto text-destructive">
            {tOrders('removeDiscount')}
          </Button>
        )}
        <Button type="button" size="touch" onClick={apply} disabled={!canApply}>
          <Percent />
          {tOrders('applyDiscount')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
