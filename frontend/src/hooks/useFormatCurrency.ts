import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { formatCurrencyForTenant } from '@/lib/countries';

/**
 * The house's price formatter.
 *
 * The same function comes back for as long as the currency and its display
 * preferences stay the same, so a row that takes it as a prop, or lists it
 * among a memo's inputs, is not drawn again only because its parent was.
 */
export function useFormatCurrency() {
  const tenant = useAuthStore((s) => s.currentTenant);
  const country = tenant?.country;
  const currency = tenant?.currency ?? 'INR';
  const currencyDisplay = tenant?.currency_display;
  const digits = tenant?.number_digits;
  return useCallback(
    (n: number) => formatCurrencyForTenant(n, country, currency, { currencyDisplay, digits }),
    [country, currency, currencyDisplay, digits],
  );
}
