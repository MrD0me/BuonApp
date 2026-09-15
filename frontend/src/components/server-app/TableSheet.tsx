'use client';

import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, Circle, Flame, Minus, Plus, Send, Users } from 'lucide-react';
import { useTranslations, type AppConfig } from 'use-intl';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import type { Category, Order, OrderItem, Product, Table } from '@/lib/types';
import { menuAwareRowOrder, menuGroupsOfOrder, type MenuGroupState } from '@/lib/fixed-menu';
import { serviceRunOf } from '@/lib/service-runs';
import { isPendingKot, pendingKotItems } from '@/lib/kot';
import { Ltr } from '@/components/layout/Ltr';
import FixedMenuPicker from '@/components/pos/FixedMenuPicker';
import ServiceRunPicker from '@/components/pos/ServiceRunPicker';

type ServerAppKey = keyof AppConfig['Messages']['serverApp'];

const OFF_THE_CHECK = ['cancelled', 'voided', 'void_adjustment'];

function itemStatusIcon(status: string, t: (key: ServerAppKey) => string) {
  if (status === 'preparing') return <Flame size={15} className="shrink-0 text-orange-500" aria-label={t('statusPreparing')} />;
  if (status === 'ready') return <Bell size={15} className="shrink-0 text-emerald-600" aria-label={t('statusReady')} />;
  if (status === 'served') return <CheckCircle2 size={15} className="shrink-0 text-blue-600" aria-label={t('statusServed')} />;
  return <Circle size={15} className="shrink-0 text-gray-400" aria-label={t('statusWaiting')} />;
}

interface Props {
  open: boolean;
  table: Table | null;
  /** The open order on the table, rows included; null when it is free. */
  order: Order | null;
  products: Product[];
  categories: Category[];
  kotPrintingEnabled: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItems: () => void;
  onChangeGuests: (count: number) => Promise<void>;
  onChangeServiceRun: (itemId: number, run: number) => Promise<void>;
  /** What the course holds afterwards; resolves false when the check refused it. */
  onFillCourse: (groupId: string, courseId: string, productIds: string[]) => Promise<boolean>;
  onSendToKitchen: () => Promise<void>;
}

/**
 * The table, read back from its order.
 *
 * What the floor does from here is what it can do standing at the table:
 * see what has been ordered and what the kitchen has done with it, correct
 * the covers, move a dish to another wave, fill in the course of a menu the
 * party left open, add more, send the round. Money is not here: the check is
 * printed and settled at the till, on the central PC.
 */
export function TableSheet({
  open, table, order, products, categories, kotPrintingEnabled, busy,
  onOpenChange, onAddItems, onChangeGuests, onChangeServiceRun, onFillCourse, onSendToKitchen,
}: Props) {
  const t = useTranslations('serverApp');
  const tPos = useTranslations('pos');
  const tCommon = useTranslations('common');
  const [menuFill, setMenuFill] = useState<{ group: MenuGroupState; courseId: string } | null>(null);
  const [filling, setFilling] = useState(false);

  const activeItems = useMemo(
    () => menuAwareRowOrder((order?.items || []).filter((item) => !OFF_THE_CHECK.includes(String(item.status)))),
    [order],
  );
  const groups = useMemo(() => menuGroupsOfOrder(activeItems, products), [activeItems, products]);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.group_id, group])), [groups]);
  // Dishes, not the priced menu line: the package row is stamped with the
  // round too, but nobody cooks it and the waiter is counting plates.
  const pendingCount = pendingKotItems(activeItems).filter((item) => item.menu_role !== 'package').length;
  const guests = order?.guest_count ?? 1;

  const fillCourse = async (productIds: string[]) => {
    if (!menuFill) return;
    setFilling(true);
    try {
      const done = await onFillCourse(menuFill.group.group_id, menuFill.courseId, productIds);
      if (done) setMenuFill(null);
    } finally {
      setFilling(false);
    }
  };

  const renderDish = (item: OrderItem, indented: boolean) => (
    <div key={item.id} className={`flex items-start gap-2 py-1.5 text-sm ${indented ? 'ps-5' : ''}`}>
      {itemStatusIcon(item.status, t)}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate">
            {!indented && <><Ltr>{item.quantity}</Ltr> × </>}{item.product_name}
          </span>
          {isPendingKot(item) && (
            <span className="size-2 shrink-0 rounded-full bg-orange-500" aria-label={t('pendingKitchen')} title={t('pendingKitchen')} />
          )}
        </p>
        {(item.addons || []).length > 0 && (
          <p className="text-xs text-gray-500">{(item.addons || []).map((addon) => `+ ${addon.name}${(addon.quantity || 1) > 1 ? ` ×${addon.quantity}` : ''}`).join(', ')}</p>
        )}
        {item.special_instructions && <p className="text-xs italic text-gray-500">{item.special_instructions}</p>}
      </div>
      {kotPrintingEnabled && (
        <ServiceRunPicker
          value={serviceRunOf(item)}
          sent={item.kot_batch != null}
          disabled={busy}
          onChange={(run) => { void onChangeServiceRun(item.id, run); }}
        />
      )}
    </div>
  );

  const renderMenu = (packageItem: OrderItem) => {
    const group = groupById.get(String(packageItem.menu_group_id));
    return (
      <div key={packageItem.id} className="py-1.5">
        <p className="text-sm font-semibold text-gray-900">{packageItem.product_name}</p>
        {group ? (
          <>
            {group.slots.map((slot) => (
              <div key={slot.course.id}>
                {slot.filled.map((row) => renderDish(row, true))}
                {slot.free > 0 && (
                  <div className={`flex items-center gap-2 py-1 ps-5 text-sm ${slot.course.is_required && slot.filled.length === 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                    <span className="min-w-0 flex-1 truncate">{slot.course.label}: {t('courseToChoose')}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setMenuFill({ group, courseId: slot.course.id })}
                      className="shrink-0 rounded-md border border-brand px-2 py-1 text-xs font-semibold text-brand disabled:opacity-50"
                    >
                      {t('completeMenu')}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {group.strays.map((row) => renderDish(row, true))}
          </>
        ) : (
          // The menu product is gone from the catalogue: the dishes still show, unlabelled.
          activeItems.filter((row) => row.menu_group_id === packageItem.menu_group_id && row.menu_role === 'course').map((row) => renderDish(row, true))
        )}
      </div>
    );
  };

  return (
    <>
      {/* The sheet steps aside while the menu window is up: both sit at the
          same layer, and the sheet's portal lands later in the document, so
          without this the window would open behind it. */}
      <Drawer open={open && !menuFill} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader className="text-start">
            <DrawerTitle className="flex items-center justify-between gap-2">
              <span>{table ? t('tableLabel', { name: table.name }) : ''}</span>
              {order && <span className="text-sm font-normal text-gray-500">#<Ltr>{order.order_number}</Ltr></span>}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{t('title')}</DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {order ? (
              <>
                <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-gray-600"><Users size={15} />{tPos('pax')}</span>
                  <span className="flex items-center gap-2">
                    <button type="button" aria-label={tPos('decreasePax')} disabled={busy || guests <= 1} onClick={() => { void onChangeGuests(guests - 1); }} className="flex size-9 items-center justify-center rounded-full bg-gray-100 disabled:opacity-40"><Minus size={14} /></button>
                    <span className="w-8 text-center text-base font-semibold"><Ltr>{guests}</Ltr></span>
                    <button type="button" aria-label={tPos('increasePax')} disabled={busy || guests >= 99} onClick={() => { void onChangeGuests(guests + 1); }} className="flex size-9 items-center justify-center rounded-full bg-gray-100 disabled:opacity-40"><Plus size={14} /></button>
                  </span>
                </div>
                {order.special_instructions && (
                  <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{order.special_instructions}</p>
                )}
                <div className="divide-y divide-gray-100">
                  {activeItems.map((item) => {
                    if (item.menu_role === 'package') return renderMenu(item);
                    if (item.menu_role === 'course' && item.menu_group_id) return null;
                    return renderDish(item, false);
                  })}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">{t('noOpenOrder')}</p>
            )}
          </div>

          <div className="flex gap-2 border-t border-gray-100 p-4">
            {order && pendingCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => { void onSendToKitchen(); }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-brand font-semibold text-brand disabled:opacity-50"
              >
                <Send size={17} />
                {tPos('sendToKitchen', { count: pendingCount })}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onAddItems}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-white disabled:opacity-50"
            >
              <Plus size={17} />
              {t('addItems')}
            </button>
          </div>
          <p className="sr-only">{tCommon('close')}</p>
        </DrawerContent>
      </Drawer>

      {/* Filling in a course of a menu already on the check: the same window
          the till uses, told to show one course. */}
      {menuFill?.group.menu && (
        <FixedMenuPicker
          menu={menuFill.group.menu}
          products={products}
          categories={categories}
          mode="fill"
          restrictToCourseId={menuFill.courseId}
          // The whole menu as it stands, so "still missing" and the price are
          // true; onAdd keeps only the course on show.
          initialSelection={menuFill.group.slots
            .flatMap((slot) => slot.filled.map((row) => ({ course_id: slot.course.id, product_id: String(row.product_id) })))}
          onClose={() => { if (!filling) setMenuFill(null); }}
          onAdd={(_menu, selection) => {
            void fillCourse(selection.filter((choice) => choice.course_id === menuFill.courseId).map((choice) => choice.product_id));
          }}
        />
      )}
    </>
  );
}
