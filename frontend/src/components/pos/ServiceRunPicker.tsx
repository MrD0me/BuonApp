'use client';

import { useTranslations } from 'use-intl';
import { SERVICE_RUNS } from '@/lib/service-runs';

/**
 * Which wave of the meal one row goes out in.
 *
 * A native select rather than a popover: on the tablet the floor actually uses
 * it opens the platform picker, it is one tap either way, and it needs no
 * outside-click handling to get right.
 *
 * Props in, callback out, no API client — the same contract as the add-on and
 * fixed-menu windows, so it mounts in the cart, in the order panel, and in the
 * handheld when that gets rewritten.
 */
interface Props {
  value: number;
  onChange: (run: number) => void;
  /** Set once the ticket has printed: the run still moves, the paper does not. */
  sent?: boolean;
  disabled?: boolean;
}

export default function ServiceRunPicker({ value, onChange, sent = false, disabled = false }: Props) {
  const t = useTranslations('pos');

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      onClick={(event) => event.stopPropagation()}
      title={sent ? t('serviceRunAlreadySent') : t('serviceRun')}
      aria-label={t('serviceRun')}
      className={`text-xs rounded-md border px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 ${
        sent
          ? 'border-gray-200 text-gray-400 bg-gray-50'
          : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
      }`}
    >
      {SERVICE_RUNS.map((run) => (
        <option key={run} value={run}>{t('serviceRunShort', { n: run })}</option>
      ))}
    </select>
  );
}
