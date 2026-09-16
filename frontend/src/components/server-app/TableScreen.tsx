'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, ClipboardList, Plus, Send, Users } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Category, Order, OrderItem, Product, Table } from '@/lib/types';
import { menuAwareRowOrder, menuGroupsOfOrder, type MenuGroupState } from '@/lib/fixed-menu';
import { serviceRunOf } from '@/lib/service-runs';
import { isPendingKot, pendingDishCount } from '@/lib/kot';
import { ITEM_STATUS_TONE, TABLE_STATUS_TONE, type Tone } from '@/lib/status-styles';
import { TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n/enums';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionBar } from '@/components/ui/action-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Ltr } from '@/components/layout/Ltr';
import FixedMenuPicker from '@/components/pos/FixedMenuPicker';
import ServiceRunPicker from '@/components/pos/ServiceRunPicker';
import { parseDbTimestamp } from '@/lib/utils';

const OFF_THE_CHECK = ['cancelled', 'voided', 'void_adjustment'];

/** Minutes since a timestamp, or null when there isn't one to measure from. */
function minutesSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const parsed = parseDbTimestamp(timestamp);
  if (isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
}

interface Props {
  table: Table;
  /** The open order on the table, rows included; null when it is free. */
  order: Order | null;
  products: Product[];
  categories: Category[];
  kotPrintingEnabled: boolean;
  busy: boolean;
  onBack: () => void;
  onAddItems: () => void;
  onChangeGuests: (count: number) => Promise<void>;
  onChangeServiceRun: (itemId: number, run: number) => Promise<void>;
  /** What the course holds afterwards; resolves false when the check refused it. */
  onFillCourse: (groupId: string, courseId: string, productIds: string[]) => Promise<boolean>;
  onSendToKitchen: () => Promise<void>;
}

/**
 * The table, read back from its order — a screen of its own, not a drawer.
 *
 * What the floor does from here is what it can do standing at the table:
 * see what has been ordered and what the kitchen has done with it, correct
 * the covers, move a dish to another wave, fill in the course of a menu the
 * party left open, add more, send the round. Money is not here: the check is
 * printed and settled at the till, on the central PC.
 *
 * It used to be a bottom drawer with no close button, torn down whenever the
 * menu window opened over it because both sat on the same layer. A page has
 * a back arrow, and the window (a `Modal`, one layer up) simply opens on top.
 */
export function TableScreen({
  table, order, products, categories, kotPrintingEnabled, busy,
  onBack, onAddItems, onChangeGuests, onChangeServiceRun, onFillCourse, onSendToKitchen,
}: Props) {
  const t = useTranslations('serverApp');
  const tPos = useTranslations('pos');
  const tTables = useTranslations('tables');
  const [menuFill, setMenuFill] = useState<{ group: MenuGroupState; courseId: string } | null>(null);
  const [filling, setFilling] = useState(false);

  const activeItems = useMemo(
    () => menuAwareRowOrder((order?.items || []).filter((item) => !OFF_THE_CHECK.includes(String(item.status)))),
    [order],
  );
  const groups = useMemo(() => menuGroupsOfOrder(activeItems, products), [activeItems, products]);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.group_id, group])), [groups]);
  const pendingCount = pendingDishCount(activeItems);
  const guests = order?.guest_count ?? 1;
  const elapsed = order ? minutesSince(order.created_at) : null;
  const tableTone = TABLE_STATUS_TONE[table.status] ?? 'free';

  const subtitle = order
    ? [t('coversCount', { count: guests }), elapsed !== null ? t('openSince', { minutes: elapsed }) : null].filter(Boolean).join(' · ')
    : tTables('capacitySeats', { count: table.capacity });

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

  /** What the kitchen has done with a dish, as a pill: "to send" first, then its status. */
  const statusOf = (item: OrderItem): { tone: Tone; label: string } => {
    if (isPendingKot(item)) return { tone: 'pending', label: t('toSend') };
    const tone = ITEM_STATUS_TONE[item.status] ?? 'waiting';
    const label = item.status === 'preparing' ? t('statusPreparing')
      : item.status === 'ready' ? t('statusReady')
      : item.status === 'served' ? t('statusServed')
      : t('statusWaiting');
    return { tone, label };
  };

  const renderDish = (item: OrderItem, insideMenu: boolean) => {
    const status = statusOf(item);
    return (
      <div key={item.id} className={`flex flex-col gap-2 py-3 ${insideMenu ? '' : 'border-b border-border last:border-0'}`}>
        <div className="flex items-center gap-3">
          {insideMenu
            ? <span className="w-8 shrink-0" aria-hidden="true" />
            : <Ltr className="w-8 shrink-0 text-base font-bold text-muted-foreground">{item.quantity}×</Ltr>}
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-foreground">{item.product_name}</p>
            {(item.addons || []).length > 0 && (
              <p className="text-sm text-muted-foreground">{(item.addons || []).map((addon) => `+ ${addon.name}${(addon.quantity || 1) > 1 ? ` ×${addon.quantity}` : ''}`).join(', ')}</p>
            )}
            {item.special_instructions && <p className="text-sm italic text-muted-foreground">{item.special_instructions}</p>}
          </div>
          <StatusBadge tone={status.tone} size="sm">{status.label}</StatusBadge>
        </div>
        {kotPrintingEnabled && (
          <div className="ps-11">
            <ServiceRunPicker
              value={serviceRunOf(item)}
              sent={item.kot_batch != null}
              disabled={busy}
              onChange={(run) => { void onChangeServiceRun(item.id, run); }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderMenu = (packageItem: OrderItem) => {
    const group = groupById.get(String(packageItem.menu_group_id));
    return (
      <div key={packageItem.id} className="my-3 rounded-2xl border border-border bg-muted/40 px-3 py-2">
        <p className="py-1 text-base font-bold text-foreground">{packageItem.product_name}</p>
        {group ? (
          <>
            {group.slots.map((slot) => (
              <div key={slot.course.id}>
                {slot.filled.map((row) => renderDish(row, true))}
                {slot.free > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="touch-lg"
                    disabled={busy}
                    onClick={() => setMenuFill({ group, courseId: slot.course.id })}
                    className={`my-1.5 w-full justify-between bg-card ${slot.course.is_required && slot.filled.length === 0 ? 'border-pending text-pending' : 'border-brand text-brand'}`}
                  >
                    <span className="truncate">{slot.course.label}: {t('courseToChoose')}</span>
                    <ChevronRight className="rtl-flip" />
                  </Button>
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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-2">
          <Button type="button" variant="ghost" size="icon-touch" onClick={onBack} aria-label={t('backToFloor')}>
            <ArrowLeft className="rtl-flip size-6" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-tight font-bold">{table.name}</h1>
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <StatusBadge tone={tableTone} className="me-2">{tTables(TABLE_STATUS_LABEL_KEYS[table.status])}</StatusBadge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        {order ? (
          <>
            <div className="flex items-center justify-between border-b border-border py-3">
              <span className="flex items-center gap-2 text-base font-semibold"><Users size={20} />{tPos('pax')}</span>
              <Stepper
                size="lg"
                min={1}
                max={99}
                value={guests}
                disabled={busy}
                onChange={(count) => { void onChangeGuests(count); }}
                decreaseLabel={tPos('decreasePax')}
                increaseLabel={tPos('increasePax')}
              />
            </div>
            {order.special_instructions && (
              <p className="mt-3 rounded-xl bg-table-reserved-soft px-3 py-2 text-sm text-table-reserved">{order.special_instructions}</p>
            )}
            <div className="flex items-center justify-between pt-4 pb-1">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('dishes')}</h2>
              <span className="text-sm text-muted-foreground">#<Ltr>{order.order_number}</Ltr></span>
            </div>
            <div>
              {activeItems.map((item) => {
                if (item.menu_role === 'package') return renderMenu(item);
                if (item.menu_role === 'course' && item.menu_group_id) return null;
                return renderDish(item, false);
              })}
            </div>
          </>
        ) : (
          <EmptyState
            className="py-16"
            icon={<ClipboardList />}
            title={t('noOpenOrder')}
            hint={t('noOpenOrderHint')}
          />
        )}
      </main>

      <ActionBar className="flex-col items-stretch">
        {order && pendingCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="touch-xl"
            disabled={busy}
            onClick={() => { void onSendToKitchen(); }}
            className="w-full border-brand text-brand"
          >
            <Send />
            {tPos('sendToKitchen', { count: pendingCount })}
          </Button>
        )}
        <Button
          type="button"
          size="touch-xl"
          disabled={busy}
          onClick={onAddItems}
          className="w-full bg-brand text-white hover:bg-brand-hover"
        >
          <Plus />
          {order ? t('addItems') : tTables('takeOrder')}
        </Button>
      </ActionBar>

      {/* Filling in a course of a menu already on the check: the same window
          the till uses, told to show one course. It opens over this page. */}
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
    </div>
  );
}
