'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, ClipboardList, Plus, Send, Users } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Order, OrderItem, Product, Table } from '@/lib/types';
import {
  compactOrderRows, courseFillOf, menuAwareRowOrder, menuGroupsOfOrder, selectionOfGroup, type CourseFill, type MenuGroupState,
} from '@/lib/fixed-menu';
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
  kotPrintingEnabled: boolean;
  busy: boolean;
  onBack: () => void;
  onAddItems: () => void;
  onChangeGuests: (count: number) => Promise<void>;
  /** Every row of a line goes: the picker sits under the line, and a line folds the rows that read the same. */
  onChangeServiceRun: (itemIds: number[], run: number) => Promise<void>;
  /** How many menus a menu line feeds. */
  onChangeMenuCount: (groupId: string, quantity: number) => Promise<void>;
  /** What the course holds afterwards; resolves false when the check refused it. */
  onFillCourse: (groupId: string, courseId: string, dishes: CourseFill) => Promise<boolean>;
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
  table, order, products, kotPrintingEnabled, busy,
  onBack, onAddItems, onChangeGuests, onChangeServiceRun, onChangeMenuCount, onFillCourse, onSendToKitchen,
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
  const lines = useMemo(() => compactOrderRows(activeItems), [activeItems]);
  const groups = useMemo(() => menuGroupsOfOrder(activeItems, products), [activeItems, products]);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.group_id, group])), [groups]);
  const pendingCount = pendingDishCount(activeItems);
  const guests = order?.guest_count ?? 1;
  const elapsed = order ? minutesSince(order.created_at) : null;
  const tableTone = TABLE_STATUS_TONE[table.status] ?? 'free';

  const subtitle = order
    ? [t('coversCount', { count: guests }), elapsed !== null ? t('openSince', { minutes: elapsed }) : null].filter(Boolean).join(' · ')
    : tTables('capacitySeats', { count: table.capacity });

  const fillCourse = async (dishes: CourseFill) => {
    if (!menuFill) return;
    setFilling(true);
    try {
      const done = await onFillCourse(menuFill.group.group_id, menuFill.courseId, dishes);
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

  /**
   * One line: a dish, with every row of it that reads the same folded in and
   * counted — "3× Lasagne" inside a menu, "3× Coca-Cola" ordered in two goes.
   * Every line says how many, one included: a plate on its own under a menu
   * showed a blank where the count goes, and the floor was left to read that
   * empty space as a one. The run picker under a line moves the whole line.
   */
  const renderDish = (item: OrderItem, insideMenu: boolean, count = Number(item.quantity) || 1, rows: OrderItem[] = [item]) => {
    const status = statusOf(item);
    return (
      <div key={item.id} className={`flex flex-col gap-2 py-3 ${insideMenu ? '' : 'border-b border-border last:border-0'}`}>
        <div className="flex items-center gap-3">
          <Ltr className="w-8 shrink-0 text-base font-bold text-muted-foreground">{count}×</Ltr>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-foreground">{item.product_name}</p>
            {(item.addons || []).length > 0 && (
              <p className="text-sm text-muted-foreground">{(item.addons || []).map((addon) => `+ ${addon.name}${(addon.quantity || 1) > 1 ? ` ×${addon.quantity}` : ''}`).join(', ')}</p>
            )}
            {item.special_instructions && <p className="text-sm italic text-muted-foreground">{item.special_instructions}</p>}
          </div>
          <StatusBadge tone={status.tone} size="sm">{status.label}</StatusBadge>
        </div>
        {/* Not inside a menu: there the running order is the menu's own, and
            a picker under every plate of it was a column of buttons nobody
            presses. */}
        {kotPrintingEnabled && !insideMenu && (
          <div className="ps-11">
            <ServiceRunPicker
              value={serviceRunOf(item)}
              sent={item.kot_batch != null}
              disabled={busy}
              onChange={(run) => { void onChangeServiceRun(rows.map((row) => row.id), run); }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderDishes = (rows: OrderItem[]) => compactOrderRows(rows).map((line) => renderDish(line.item, true, line.quantity));

  const renderMenu = (packageItem: OrderItem) => {
    const group = groupById.get(String(packageItem.menu_group_id));
    const menus = Math.max(1, Number(packageItem.quantity) || 1);
    return (
      <div key={packageItem.id} className="my-3 rounded-2xl border border-border bg-muted/40 px-3 py-2">
        {/* How many menus the line feeds, changed here for the friend who
            turns up late — below what a course holds, the check says no. */}
        <div className="flex items-center justify-between gap-2 py-1">
          <p className="min-w-0 truncate text-base font-bold text-foreground">
            <Ltr className="text-brand">{menus}×</Ltr> {packageItem.product_name}
          </p>
          <Stepper
            size="sm"
            min={1}
            max={99}
            value={menus}
            disabled={busy}
            onChange={(quantity) => { void onChangeMenuCount(String(packageItem.menu_group_id), quantity); }}
            decreaseLabel={`${tPos('menuOneLess')}: ${packageItem.product_name}`}
            increaseLabel={`${tPos('menuOneMore')}: ${packageItem.product_name}`}
          />
        </div>
        {group ? (
          <>
            {group.slots.map((slot) => (
              <div key={slot.course.id}>
                {renderDishes(slot.filled)}
                {slot.free > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="touch-lg"
                    disabled={busy}
                    onClick={() => setMenuFill({ group, courseId: slot.course.id })}
                    className={`my-1.5 w-full justify-between bg-card ${slot.course.is_required && slot.filled.length < group.menus ? 'border-pending text-pending' : 'border-brand text-brand'}`}
                  >
                    <span className="truncate">
                      {slot.course.label}
                      {' '}<Ltr>{slot.filled.length}/{slot.filled.length + slot.free}</Ltr>
                      {slot.filled.length === 0 && <>: {t('courseToChoose')}</>}
                    </span>
                    <ChevronRight className="rtl-flip" />
                  </Button>
                )}
              </div>
            ))}
            {renderDishes(group.strays)}
          </>
        ) : (
          // The menu product is gone from the catalogue: the dishes still show, unlabelled.
          renderDishes(activeItems.filter((row) => row.menu_group_id === packageItem.menu_group_id && row.menu_role === 'course'))
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
              {lines.map((line) => {
                if (line.item.menu_role === 'package') return renderMenu(line.item);
                if (line.item.menu_role === 'course' && line.item.menu_group_id) return null;
                return renderDish(line.item, false, line.quantity, line.rows);
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
          mode="fill"
          restrictToCourseId={menuFill.courseId}
          initialMenus={menuFill.group.menus}
          // The whole menu as it stands, each portion with its note; onAdd
          // sends back only the course on show.
          initialSelection={selectionOfGroup(menuFill.group)}
          onClose={() => { if (!filling) setMenuFill(null); }}
          onAdd={(_menu, _menus, selection) => {
            void fillCourse(courseFillOf(selection, menuFill.courseId));
          }}
        />
      )}
    </div>
  );
}
