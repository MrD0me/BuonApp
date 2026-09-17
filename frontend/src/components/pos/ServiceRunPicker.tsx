'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { SERVICE_RUNS } from '@/lib/service-runs';
import { Modal, ModalBody, ModalDescription, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Ltr } from '@/components/layout/Ltr';

/**
 * Which wave of the meal one row goes out in.
 *
 * One chip that says the current wave — "2ª uscita" — and opens the 1–9 grid
 * when tapped. A dish already has its wave from its category, so most rows
 * never need touching; three chips per row said the same thing three times
 * and turned the check into a wall of buttons. It used to be a native select
 * before that: one tap, but a 20 px one, and on the touch monitor the
 * platform picker covered the row it was about.
 *
 * Props in, callback out, no API client — the same contract as the add-on
 * and fixed-menu windows, so it mounts in the cart, in the order panel and
 * on the handheld unchanged.
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
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);

  const pick = (run: number) => {
    onChange(run);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={t('serviceRun')}
        title={sent ? t('serviceRunAlreadySent') : t('serviceRun')}
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
        className={`inline-flex h-10 shrink-0 items-center gap-1 rounded-lg ps-3 pe-2 text-sm font-semibold transition select-none active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${
          sent ? 'bg-muted text-muted-foreground' : 'bg-brand-light text-brand'
        }`}
      >
        <Ltr>{t('serviceRunLabel', { n: value })}</Ltr>
        <ChevronDown className="size-4 opacity-70" />
      </button>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader closeLabel={tCommon('close')}>
          <ModalTitle>{t('serviceRun')}</ModalTitle>
          {sent && <ModalDescription>{t('serviceRunAlreadySent')}</ModalDescription>}
        </ModalHeader>
        <ModalBody onClick={(event) => event.stopPropagation()}>
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_RUNS.map((run) => (
              <button
                key={run}
                type="button"
                aria-pressed={run === value}
                onClick={() => pick(run)}
                className={`h-touch-lg rounded-xl text-lg font-semibold transition active:scale-95 ${
                  run === value ? 'bg-brand text-white' : 'bg-muted text-foreground'
                }`}
              >
                <Ltr>{t('serviceRunShort', { n: run })}</Ltr>
              </button>
            ))}
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}
