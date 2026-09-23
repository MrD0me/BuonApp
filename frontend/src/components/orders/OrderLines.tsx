'use client';

import { ChevronRight, Plus } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { OrderItem } from '@/lib/types';
import { compactMenuRows, type MenuGroupState } from '@/lib/fixed-menu';
import { serviceRunOf } from '@/lib/service-runs';
import { isPendingKot } from '@/lib/kot';
import { ITEM_STATUS_TONE, type Tone } from '@/lib/status-styles';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Ltr } from '@/components/layout/Ltr';

interface Props {
  /** Active rows, already in menu-aware order. */
  items: OrderItem[];
  menuGroups: MenuGroupState[];
  /** Whether tapping a row opens its actions. */
  canAct: boolean;
  /** Whether the open courses of a menu may still be filled. */
  canFillCourses: boolean;
  kotEnabled: boolean;
  awaitsPrice: (item: OrderItem) => boolean;
  /** `of` is how many portions the tapped line folds: the sheet acts on one of them. */
  onLineTap: (item: OrderItem, of: number) => void;
  onFillCourse: (group: MenuGroupState, courseId: string) => void;
}

/**
 * The rows of an order, presented like a bill and sized for a finger.
 *
 * A row is one tap: it opens the sheet with everything that can be done to
 * it. The three 16 px icons that used to sit on every row — bin, pencil,
 * void — are gone; a touch monitor could not hit them and a reader could
 * not tell them apart.
 *
 * The portions of a menu that read the same are one line, "3× Lasagne": the
 * check keeps a row per portion, the floor reads a count. A tap on that line
 * acts on one portion of it.
 */
export function OrderLines({
  items, menuGroups, canAct, canFillCourses, kotEnabled, awaitsPrice, onLineTap, onFillCourse,
}: Props) {
  const tOrders = useTranslations('orders');
  const tPos = useTranslations('pos');
  const t = useTranslations('serverApp');
  const fmt = useFormatCurrency();

  const statusOf = (item: OrderItem): { tone: Tone; label: string } => {
    if (isPendingKot(item)) return { tone: 'pending', label: t('toSend') };
    const tone = ITEM_STATUS_TONE[item.status] ?? 'waiting';
    const label = item.status === 'preparing' ? tOrders('itemStatusPreparing')
      : item.status === 'ready' ? tOrders('itemStatusReady')
      : item.status === 'served' ? tOrders('itemStatusServed')
      : item.status === 'voided' ? tOrders('itemStatusVoided')
      : item.status === 'void_adjustment' ? tOrders('itemStatusVoidAdjustment')
      : tOrders('itemStatusWaiting');
    return { tone, label };
  };

  const lines = compactMenuRows(items);
  // The open courses go under the menu they belong to, after its last line —
  // the rows are already grouped by menuAwareRowOrder, and a folded line sits
  // where its first portion was.
  const lastLineOfGroup = new Map<string, number>();
  lines.forEach((line, index) => {
    if (line.item.menu_group_id) lastLineOfGroup.set(String(line.item.menu_group_id), index);
  });

  return (
    <div className="flex flex-col">
      {lines.map((line, index) => {
        const { item } = line;
        const isMenuCourse = item.menu_role === 'course';
        const isPackage = item.menu_role === 'package';
        const status = statusOf(item);
        const struck = item.status === 'voided';
        const group = item.menu_group_id && lastLineOfGroup.get(String(item.menu_group_id)) === index
          ? menuGroups.find((entry) => entry.group_id === item.menu_group_id)
          : undefined;
        const Row = canAct ? 'button' : 'div';
        return (
          <div key={line.rows[0].id} className="border-b border-border last:border-0">
            <Row
              type={canAct ? 'button' : undefined}
              onClick={canAct ? () => onLineTap(item, line.quantity) : undefined}
              className={`flex min-h-touch-lg w-full items-center gap-3 rounded-xl px-2 py-2 text-start ${canAct ? 'transition active:bg-muted' : ''} ${isMenuCourse ? 'ps-6' : ''}`}
            >
              {/* Every line says how many, one included: a single plate of a
                  menu showed a bullet where the count goes, and a list where
                  some lines count and others do not is a list to be read
                  twice. */}
              <Ltr className={`w-8 shrink-0 text-base font-bold ${isPackage ? 'text-foreground' : 'text-muted-foreground'}`}>{line.quantity}×</Ltr>
              <div className="min-w-0 flex-1">
                <p className={`text-base ${isPackage ? 'font-bold' : 'font-medium'} text-foreground ${struck ? 'line-through opacity-60' : ''}`}>
                  {item.product_name}
                  {awaitsPrice(item) && (
                    <StatusBadge tone="pending" size="sm" className="ms-2 align-middle">{tOrders('rowPriceMissing')}</StatusBadge>
                  )}
                </p>
                {item.addons && item.addons.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {item.addons.map((addon) => `+ ${addon.name}${(addon.quantity || 1) > 1 ? ` ×${addon.quantity}` : ''}${addon.price ? ` (${fmt(Number(addon.price) * (addon.quantity || 1))})` : ''}`).join(', ')}
                  </p>
                )}
                {item.special_instructions && (
                  <p className="text-sm italic text-muted-foreground">{item.special_instructions}</p>
                )}
              </div>
              {/* Which wave it goes out in. A menu package is not a dish and
                  never reaches a station, so it has none. */}
              {kotEnabled && !isPackage && (
                <span className="hidden shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground sm:inline-flex">
                  <Ltr>{tPos('serviceRunLabel', { n: serviceRunOf(item) })}</Ltr>
                </span>
              )}
              {!isPackage && <StatusBadge tone={status.tone} size="sm">{status.label}</StatusBadge>}
              {/* A dish inside a menu is paid for by the package: it shows a
                  surcharge or nothing, never a bare 0,00. */}
              <span className="w-20 shrink-0 text-end text-base font-semibold text-foreground">
                <Ltr>{isMenuCourse ? (line.total > 0 ? `+${fmt(line.total)}` : '') : fmt(Number(item.total))}</Ltr>
              </span>
              {canAct && <ChevronRight size={18} className="rtl-flip shrink-0 text-muted-foreground/60" />}
            </Row>

            {/* The courses of this menu with room left, each with how full it
                is: "Secondo 0/8". One tap opens the same window the till uses. */}
            {group && canFillCourses && group.menu && group.slots.some((slot) => slot.free > 0) && (
              <div className="flex flex-wrap gap-2 px-2 pb-3 ps-12">
                {group.slots.filter((slot) => slot.free > 0).map((slot) => (
                  <Button
                    key={slot.course.id}
                    type="button"
                    variant="outline"
                    size="touch"
                    onClick={() => onFillCourse(group, slot.course.id)}
                    className={slot.course.is_required && slot.filled.length < group.menus ? 'border-pending text-pending' : 'border-brand text-brand'}
                  >
                    <Plus />
                    {slot.course.label}
                    <Ltr className="font-normal opacity-80">{slot.filled.length}/{slot.filled.length + slot.free}</Ltr>
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
