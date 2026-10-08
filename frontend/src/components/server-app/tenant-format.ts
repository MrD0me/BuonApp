import { useAuthStore } from '@/store/auth';
import type { Tenant } from '@/lib/types';

/** What this module writes, and so all it has to compare before writing again. */
const SEEDED_FIELDS = [
  'id', 'business_name', 'slug', 'database_name', 'business_type', 'country', 'currency', 'timezone',
  'plan', 'status', 'currency_display', 'number_digits',
] as const satisfies readonly (keyof Tenant)[];

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
 *
 * The settings are read again every minute, and almost always say the same
 * thing. Writing a new tenant each time woke every price on the screen —
 * every dish row of the menu — for nothing, so it writes only when one of
 * the facts it carries has changed.
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
  if (current && SEEDED_FIELDS.every((field) => current[field] === tenant[field])) return;
  useAuthStore.setState({ currentTenant: tenant });
}
