import { useAuthStore } from '@/store/auth';
import type { Tenant } from '@/lib/types';

/**
 * Tells the shared windows what currency this house counts in.
 *
 * AddonModal, FixedMenuPicker and AttachToMenuModal format prices through
 * `useFormatCurrency`, which reads the tenant off the desktop auth store and
 * falls back to rupees when there is none. The handheld never logs into that
 * store — it has a session of its own — so this is the one place it writes
 * to it, and it writes nothing but the formatting facts: currency, country
 * and the two display preferences. No token, no user, no request ever leaves
 * through the desktop client because of this.
 */
export function seedTenantFormat(settings: Record<string, string>, fallbackCountry?: string | null): void {
  const current = useAuthStore.getState().currentTenant;
  const tenant = {
    ...(current || {}),
    id: current?.id ?? 0,
    business_name: settings.business_name || current?.business_name || 'BuonApp',
    slug: current?.slug ?? 'local',
    database_name: current?.database_name ?? '',
    business_type: 'restaurant',
    country: settings.country || fallbackCountry || current?.country || 'IT',
    currency: settings.currency || current?.currency || 'EUR',
    timezone: settings.timezone || current?.timezone || 'Europe/Rome',
    plan: current?.plan ?? 'local',
    status: current?.status ?? 'active',
    currency_display: settings.currency_display || current?.currency_display,
    number_digits: settings.number_digits || current?.number_digits,
  } as Tenant;
  useAuthStore.setState({ currentTenant: tenant });
}
