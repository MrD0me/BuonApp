'use client';

import { useTranslations } from 'use-intl';
import { Modal, ModalBody, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/layout/Ltr';
import { canPutBack, type AttentionReason, type QueueEntry } from './send-queue';

interface Props {
  entries: QueueEntry[];
  /** Other waiters' tickets on this phone: said, not shown. */
  others: { userName: string; count: number }[];
  reachable: boolean;
  sending: boolean;
  onRetry: (entry: QueueEntry) => void;
  onSendAnyway: (entry: QueueEntry) => void;
  onPutBack: (entry: QueueEntry) => void;
  onDiscard: (entry: QueueEntry) => void;
  onClose: () => void;
}

const REASON_KEYS: Record<AttentionReason, 'reasonRefused' | 'reasonOrderClosed' | 'reasonTableMissing' | 'reasonStock' | 'reasonServerError' | 'reasonConflict' | 'reasonTooOld'> = {
  refused: 'reasonRefused',
  order_closed: 'reasonOrderClosed',
  table_missing: 'reasonTableMissing',
  stock: 'reasonStock',
  server_error: 'reasonServerError',
  conflict: 'reasonConflict',
  too_old: 'reasonTooOld',
};

const timeOf = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * The tickets that have not reached the PC yet, each with where it stands
 * and what the waiter can do about it.
 *
 * A ticket waiting for the connection needs nothing — it goes by itself — and
 * offers to try now. One the PC refused, or one past the half hour, waits for
 * the waiter: try again, send it anyway, put its dishes back in the ticket to
 * change them, or delete it. «Rimetti in comanda» is only there when the PC
 * provably has none of it (`canPutBack`); after a send that got no answer the
 * dishes may already be on the check, and the delete warns of that too.
 */
export function QueueSheet({ entries, others, reachable, sending, onRetry, onSendAnyway, onPutBack, onDiscard, onClose }: Props) {
  const t = useTranslations('serverApp');
  const tCommon = useTranslations('common');

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="md">
      <ModalHeader closeLabel={tCommon('close')}>
        <ModalTitle>{t('queueTitle')}</ModalTitle>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-3">
        {entries.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('queueEmpty')}</p>}
        {entries.map((entry) => {
          const dishes = entry.lines.reduce((sum, line) => sum + line.quantity, 0) || entry.request.body.items.length;
          const state = entry.attention
            ? t(REASON_KEYS[entry.attention.reason])
            : entry.retryAt !== undefined
              ? t('stateRetrying')
              : reachable && sending ? t('sendingStatus') : t('stateWaiting');
          return (
            <section key={entry.id} aria-label={entry.tableName} className="rounded-xl border border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="min-w-0 truncate text-base font-bold text-foreground">{entry.tableName}</h3>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t('queueLineCount', { count: dishes, time: timeOf.format(entry.createdAt) })}
                </span>
              </div>
              <p className={`mt-0.5 text-sm ${entry.attention ? 'font-semibold text-pending' : 'text-muted-foreground'}`}>{state}</p>
              {entry.lines.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {entry.lines.map((line) => (
                    <li key={line.id} className="truncate"><Ltr>{line.quantity}×</Ltr> {line.product.name}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.attention?.reason === 'too_old' ? (
                  <Button type="button" size="touch" onClick={() => onSendAnyway(entry)}>{t('sendAnyway')}</Button>
                ) : (
                  <Button type="button" size="touch" variant={entry.attention ? 'default' : 'outline'} onClick={() => onRetry(entry)}>{t('retry')}</Button>
                )}
                {canPutBack(entry) && (
                  <Button type="button" size="touch" variant="outline" onClick={() => onPutBack(entry)}>{t('putBack')}</Button>
                )}
                <Button type="button" size="touch" variant="ghost" className="text-destructive" onClick={() => onDiscard(entry)}>{t('discardEntry')}</Button>
              </div>
            </section>
          );
        })}
        {others.map((other) => (
          <p key={other.userName} className="text-sm font-semibold text-pending">
            {t('othersWaiting', { count: other.count, name: other.userName })}
          </p>
        ))}
      </ModalBody>
    </Modal>
  );
}
