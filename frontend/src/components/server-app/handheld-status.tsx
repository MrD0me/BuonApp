'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useTranslations } from 'use-intl';

/** What every screen's header says about the PC and the send queue. */
export interface HandheldStatus {
  /** The PC answers. */
  reachable: boolean;
  /** This waiter's tickets waiting to go, by themselves. */
  waiting: number;
  /** This waiter's tickets waiting for the waiter to decide. */
  attention: number;
  /** A round of sending is under way. */
  sending: boolean;
  /** Opens the list of waiting tickets. */
  openQueue: () => void;
}

const HandheldStatusContext = createContext<HandheldStatus | null>(null);

export const HandheldStatusProvider = HandheldStatusContext.Provider;

function hasNews(status: HandheldStatus | null): status is HandheldStatus {
  return !!status && (!status.reachable || status.attention > 0 || status.waiting > 0);
}

/**
 * The background of a screen's header: amber while the PC is out of reach or
 * a ticket needs the waiter, plain otherwise.
 *
 * The news goes into the header the screen already has — its colour and its
 * second line — and never into a banner of its own. A banner that appeared
 * pushed the whole screen down by its height, and a tap aimed at a dish
 * landed on the one above it: the very thing this phone was being fixed for.
 */
export function useHeaderTone(): string {
  const status = useContext(HandheldStatusContext);
  return status && (!status.reachable || status.attention > 0) ? 'bg-pending-soft' : 'bg-background';
}

/**
 * The header's second line. When the PC is out of reach, or tickets wait,
 * it says so in place of what it usually says, and a tap opens the list.
 * Same line, same height: nothing below it moves.
 */
export function HeaderSubtitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  const status = useContext(HandheldStatusContext);
  const t = useTranslations('serverApp');
  if (!hasNews(status)) return <p className={`truncate text-sm ${className}`}>{children}</p>;
  const parts: string[] = [];
  if (!status.reachable) parts.push(t('offlineStatus'));
  if (status.attention > 0) parts.push(t('attentionStatus', { count: status.attention }));
  if (status.waiting > 0) parts.push(status.reachable && status.sending ? t('sendingStatus') : t('waitingStatus', { count: status.waiting }));
  return (
    <button
      type="button"
      onClick={status.openQueue}
      aria-label={`${parts.join(' · ')}. ${t('openQueue')}`}
      className="block max-w-full truncate text-start text-sm font-semibold text-pending"
    >
      {parts.join(' · ')}
    </button>
  );
}
