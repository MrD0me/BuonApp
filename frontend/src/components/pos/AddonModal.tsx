'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Product, Addon, AddonGroup } from '@/lib/types';

/**
 * A dish's options: its add-ons, a note for the kitchen, how many.
 *
 * A sheet from the bottom on the handheld and a card on the PC (that is the
 * Modal's doing). Every option is a row a finger can hit — tapping the row
 * picks it — and quantities are steppers, not 24 px icons.
 *
 * Props in, callback out, no API client — mountable on the handheld unchanged.
 */
interface Props {
  product: Product;
  currency: string;
  onAdd: (product: Product, quantity: number, addons: Addon[], specialInstructions: string) => void;
  onClose: () => void;
  initialQuantity?: number;
  initialAddons?: Addon[];
  initialInstructions?: string;
  mode?: 'add' | 'edit';
}

function groupInitialAddons(addons: Addon[]): Record<string | number, Addon[]> {
  const grouped: Record<string | number, Addon[]> = {};
  for (const addon of addons) {
    const groupId = addon.addon_group_id;
    if (groupId == null) continue;
    grouped[groupId] = [...(grouped[groupId] || []), addon];
  }
  return grouped;
}

const ROW_ON = 'border-brand bg-brand-light text-brand';
const ROW_OFF = 'border-border bg-card text-foreground';

export default function AddonModal({
  product, onAdd, onClose,
  initialQuantity = 1, initialAddons = [], initialInstructions = '', mode = 'add',
}: Props) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();
  const [selected, setSelected] = useState<Record<string | number, Addon[]>>(() => groupInitialAddons(initialAddons));
  const [quantity, setQuantity] = useState(initialQuantity);
  const [instructions, setInstructions] = useState(initialInstructions);

  const groups = product.addon_groups || [];

  const getGroupTotalQuantity = (groupId: string | number): number => {
    const list = selected[groupId] || [];
    return list.reduce((sum, a) => sum + (a.quantity || 1), 0);
  };

  const updateAddonQuantity = (group: AddonGroup, addon: Addon, delta: number) => {
    const groupId = group.id;
    const currentList = selected[groupId] || [];
    const existingIndex = currentList.findIndex((a) => a.id === addon.id);
    const currentQty = existingIndex >= 0 ? (currentList[existingIndex].quantity || 1) : 0;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      const updatedList = currentList.filter((a) => a.id !== addon.id);
      setSelected({ ...selected, [groupId]: updatedList });
    } else {
      const currentGroupTotal = currentList.reduce((sum, a) => sum + (a.quantity || 1), 0);
      const newGroupTotal = currentGroupTotal + delta;
      const max = group.max_selection || 999;
      if (delta > 0 && newGroupTotal > max) {
        toast.error(t('maxSelectionReached', { count: max }));
        return;
      }

      if (existingIndex >= 0) {
        const updatedList = [...currentList];
        updatedList[existingIndex] = { ...updatedList[existingIndex], quantity: newQty };
        setSelected({ ...selected, [groupId]: updatedList });
      } else {
        setSelected({ ...selected, [groupId]: [...currentList, { ...addon, quantity: newQty }] });
      }
    }
  };

  const toggleAddonCheckbox = (group: AddonGroup, addon: Addon) => {
    const currentList = selected[group.id] || [];
    const exists = currentList.some((a) => a.id === addon.id);
    updateAddonQuantity(group, addon, exists ? -1 : 1);
  };

  const getAddonQuantity = (groupId: string | number, addonId: string | number): number => {
    const list = selected[groupId] || [];
    const item = list.find((a) => a.id === addonId);
    return item ? (item.quantity || 1) : 0;
  };

  const allAddons = Object.values(selected).flat();
  const addonTotal = allAddons.reduce((sum, a) => sum + Number(a.price) * (a.quantity || 1), 0);
  const itemTotal = (Number(product.price) + addonTotal) * quantity;

  const requiredMinOf = (group: AddonGroup) =>
    Boolean(group.is_required) ? Math.max(1, group.min_selection || 1) : (group.min_selection || 0);

  const isValid = groups.every((g) => {
    const count = getGroupTotalQuantity(g.id);
    if (count < requiredMinOf(g)) return false;
    if (g.max_selection && count > g.max_selection) return false;
    return true;
  });

  const handleAdd = () => {
    if (!isValid) return;
    onAdd(product, quantity, allAddons, instructions);
    onClose();
  };

  const priceLabel = (addon: Addon, on: boolean) => (
    <span className={`shrink-0 text-sm ${on ? 'font-semibold' : 'text-muted-foreground'}`}>
      {Number(addon.price) === 0 ? t('freeAddon') : `+${fmt(Number(addon.price))}`}
    </span>
  );

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="md">
      <ModalHeader closeLabel={tCommon('close')}>
        <ModalTitle>{product.name}</ModalTitle>
        <ModalDescription className="text-brand text-base font-semibold">{fmt(Number(product.price))}</ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {groups.map((group) => {
          const count = getGroupTotalQuantity(group.id);
          const activeAddons = (group.addons || []).filter((a) => a.is_active);
          const allowMultiple = Boolean(group.allow_multiple_quantities);
          const requiredMin = requiredMinOf(group);

          return (
            <div key={group.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">{group.name}</h3>
                <span className="flex items-center gap-2 text-xs">
                  {Boolean(group.is_required) && (
                    <span className="font-medium text-table-occupied">{t('required')}</span>
                  )}
                  {group.max_selection ? (() => {
                    const remaining = Math.max(0, group.max_selection - count);
                    return (
                      <span className={`font-semibold ${remaining === 0 ? 'text-table-reserved' : 'text-muted-foreground'}`}>
                        {remaining === 0 ? t('selectionComplete') : t('remainingCount', { count: remaining })}
                      </span>
                    );
                  })() : null}
                </span>
              </div>
              {group.description && <p className="mb-2 text-sm text-muted-foreground">{group.description}</p>}

              <div className="flex flex-col gap-2">
                {activeAddons.map((addon) => {
                  const addonQty = getAddonQuantity(group.id, addon.id);
                  const on = addonQty > 0;

                  if (allowMultiple) {
                    // A quantity per option: the row shows a stepper once
                    // the option is in, and a plus to bring it in.
                    return (
                      <div
                        key={addon.id}
                        className={`flex min-h-touch-lg items-center justify-between gap-3 rounded-xl border px-3 py-1.5 ${on ? ROW_ON : ROW_OFF}`}
                      >
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                          <span className="text-base font-medium">{addon.name}</span>
                          {priceLabel(addon, on)}
                        </span>
                        {on ? (
                          <Stepper
                            size="sm"
                            value={addonQty}
                            onChange={(next) => updateAddonQuantity(group, addon, next - addonQty)}
                            decreaseLabel={t('decreaseQuantity')}
                            increaseLabel={t('increaseQuantity')}
                          />
                        ) : (
                          <button
                            type="button"
                            aria-label={t('increaseQuantity')}
                            onClick={() => updateAddonQuantity(group, addon, 1)}
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground active:scale-95"
                          >
                            <Plus className="size-5" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  // One tap on the row picks it, another clears it.
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleAddonCheckbox(group, addon)}
                      className={`flex min-h-touch-lg w-full items-center justify-between gap-3 rounded-xl border px-3 py-1.5 text-start transition active:scale-[0.99] ${on ? ROW_ON : ROW_OFF}`}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-brand bg-brand text-white' : 'border-input bg-card'}`}
                        >
                          {on && <Check className="size-4" />}
                        </span>
                        <span className="text-base font-medium">{addon.name}</span>
                      </span>
                      {priceLabel(addon, on)}
                    </button>
                  );
                })}
              </div>
              {requiredMin > 0 && count < requiredMin && (
                <p className="mt-1.5 text-sm text-table-occupied">{t('selectAtLeast', { count: requiredMin })}</p>
              )}
            </div>
          );
        })}

        <div>
          <label htmlFor={`addon-note-${product.id}`} className="mb-1.5 block text-base font-semibold text-foreground">
            {t('specialInstructions')}
          </label>
          <input
            id={`addon-note-${product.id}`}
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value.slice(0, 100))}
            placeholder={t('specialInstructionsPlaceholder')}
            maxLength={100}
            className="h-touch w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="mt-1 text-end text-xs text-muted-foreground">{instructions.length}/100</p>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-semibold text-foreground">{t('quantity')}</span>
          <Stepper
            size="md"
            min={1}
            value={quantity}
            onChange={setQuantity}
            decreaseLabel={t('decreaseQuantity')}
            increaseLabel={t('increaseQuantity')}
          />
        </div>
        <Button onClick={handleAdd} disabled={!isValid} className="w-full" size="touch-xl">
          {mode === 'edit'
            ? t('saveItemChanges', { total: fmt(itemTotal) })
            : t('addToCart', { total: fmt(itemTotal) })}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
