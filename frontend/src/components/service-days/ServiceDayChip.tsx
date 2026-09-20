'use client';

import { useState } from 'react';
import { AlertTriangle, Lock, Sunrise } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-badge';
import { Ltr } from '@/components/layout/Ltr';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useCurrentServiceDay } from '@/hooks/useCurrentServiceDay';
import { useDateTimeFormatters } from '@/components/service-days/day-formatters';
import { CloseDayModal } from '@/components/service-days/CloseDayModal';

interface Props {
  /** Sala shows the day but does not end it: closing lives where the day is worked. */
  readOnly?: boolean;
  /** Orders, covers and takings beside the chip. */
  showStats?: boolean;
  /** Fired after the day is opened or closed: the page around it goes stale. */
  onChanged?: () => void;
}

/**
 * The service day in progress, in one line of the page header: a green dot,
 * "open since 16:02", its figures, and the button that ends it. Nothing for a
 * role that cannot manage days.
 */
export function ServiceDayChip({ readOnly = false, showStats = false, onChanged }: Props) {
  const t = useTranslations('serviceDays');
  const formatCurrency = useFormatCurrency();
  const fmt = useDateTimeFormatters();
  const { canManageDays, loading, day, summary, blockers, blockedCount, reload, open, opening } = useCurrentServiceDay();
  const [closing, setClosing] = useState(false);

  if (!canManageDays || loading) return null;

  if (!day) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-touch items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground">
          <Sunrise size={16} />
          {t('noOpenDay')}
        </span>
        {!readOnly && (
          <Button size="touch" onClick={() => { void open().then((ok) => { if (ok) onChanged?.(); }); }} disabled={opening}>
            {t('openDay')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {showStats && summary && (
          <div className="hidden items-center gap-3 text-sm md:flex">
            <span className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">{t('orders')}</span>
              <Ltr className="font-bold">{String(summary.orders.total)}</Ltr>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">{t('covers')}</span>
              <Ltr className="font-bold">{String(summary.covers)}</Ltr>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">{t('takings')}</span>
              <Ltr className="font-bold">{formatCurrency(summary.takings.total)}</Ltr>
            </span>
          </div>
        )}
        <span
          className="flex h-touch items-center gap-2 rounded-full border border-border bg-card px-4 text-sm"
          title={`${fmt.day(day.business_date)} · ${t('openedAt', { date: fmt.dateTime(day.opened_at) })}`}
        >
          <StatusDot tone="free" />
          <span className="font-semibold">{t('currentDay')}</span>
          <span className="hidden text-muted-foreground xl:inline">{t('openSinceTime', { time: fmt.time(day.opened_at) })}</span>
          {blockedCount > 0 && (
            <span className="flex items-center gap-1 text-pending" title={t('blockersCount', { count: blockedCount })}>
              <AlertTriangle size={15} />
              <Ltr>{String(blockedCount)}</Ltr>
            </span>
          )}
        </span>
        {!readOnly && (
          <Button size="touch" variant="outline" onClick={() => setClosing(true)}>
            <Lock /> {t('closeDay')}
          </Button>
        )}
      </div>

      {closing && (
        <CloseDayModal
          day={day}
          blockers={blockers}
          onClose={() => setClosing(false)}
          onClosed={() => {
            setClosing(false);
            reload();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
