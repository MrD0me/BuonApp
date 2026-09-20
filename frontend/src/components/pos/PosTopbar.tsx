'use client';

import PrinterStatus from './PrinterStatus';
import CustomerSearch from './CustomerSearch';
import { usePosSettingsStore } from '@/store/pos-settings';
import { useTranslations } from 'use-intl';
import { PageToolbar } from '@/components/layout/PageToolbar';

/**
 * The top of the ordering screen: the page's name, the customer search when
 * the house keeps a customer book, and the printer as an icon. The table is
 * not here any more — it heads the ticket, where "change" is next to it.
 */
export default function PosTopbar() {
  const customersEnabled = usePosSettingsStore((s) => s.customersEnabled);
  const tNav = useTranslations('nav');

  return (
    <div className="shrink-0 border-b border-border bg-background px-4 py-2">
      <PageToolbar
        title={tNav('pos')}
        actions={(
          <>
            {/* No customer book on this business → nothing to search. */}
            {customersEnabled && (
              <div className="w-64 max-w-full min-w-0">
                <CustomerSearch variant="topbar" />
              </div>
            )}
            <PrinterStatus compact />
          </>
        )}
      />
    </div>
  );
}
