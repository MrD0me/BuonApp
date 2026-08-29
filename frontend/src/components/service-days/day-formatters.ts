'use client';

import { useAuthStore } from '@/store/auth';
import { parseDbTimestamp } from '@/lib/utils';

/** Tenant timezone when configured, otherwise whatever this machine is set to. */
export function useTimeZone() {
  const tenant = useAuthStore((s) => s.currentTenant);
  return tenant?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useDateTimeFormatters() {
  const timeZone = useTimeZone();
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return {
    /** `business_date` is a bare calendar date — rendering it through a timezone would shift it. */
    day: (businessDate: string) => {
      const [year, month, date] = businessDate.split('-').map(Number);
      if (!year || !month || !date) return businessDate;
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(Date.UTC(year, month - 1, date)));
    },
    time: (timestamp: string | null) => {
      if (!timestamp) return '—';
      const parsed = parseDbTimestamp(timestamp);
      if (isNaN(parsed.getTime())) return '—';
      return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone }).format(parsed);
    },
    dateTime: (timestamp: string | null) => {
      if (!timestamp) return '—';
      const parsed = parseDbTimestamp(timestamp);
      if (isNaN(parsed.getTime())) return '—';
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone,
      }).format(parsed);
    },
  };
}
