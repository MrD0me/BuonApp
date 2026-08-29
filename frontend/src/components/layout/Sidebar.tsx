'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  ClipboardList,
  CalendarClock,
  CalendarCheck,
  Package,
  Grid3X3,
  Users,
  UserCog,
  Settings,
  LogOut,
  PanelLeft,
  ChefHat,
  UserCircle,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations, type AppConfig } from 'use-intl';
import { useAuthStore } from '@/store/auth';
import { usePosSettingsStore } from '@/store/pos-settings';
import { getLandingPage } from '@/components/layout/AuthGuard';
import api from '@/lib/api';
import { useConfirm } from '@/hooks/use-confirm';
import { ORDER_TYPES_SETTING_KEY, parseOrderTypes } from '@/lib/order-types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

// Leaf keys of the `nav` message namespace (use-intl resolves leaf keys
// within the namespace scope, so no dotted keys).
type NavKey = keyof AppConfig['Messages']['nav'];

interface NavItem {
  href: string;
  labelKey: NavKey;
  icon: LucideIcon;
  roles: string[];
  businessTypes: string[] | null;
}

// null = show for all business types
const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/pos', labelKey: 'pos', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier'], businessTypes: null },
  { href: '/orders', labelKey: 'orders', icon: ClipboardList, roles: ['owner', 'manager', 'cashier'], businessTypes: null },
  { href: '/service-days', labelKey: 'serviceDays', icon: CalendarClock, roles: ['owner', 'manager'], businessTypes: null },
  { href: '/whatsapp', labelKey: 'whatsapp', icon: MessageCircle, roles: ['owner', 'manager', 'cashier'], businessTypes: null },
  { href: '/products', labelKey: 'products', icon: Package, roles: ['owner', 'manager'], businessTypes: null },
  { href: '/tables', labelKey: 'tables', icon: Grid3X3, roles: ['owner', 'manager'], businessTypes: ['restaurant'] },
  { href: '/reservations', labelKey: 'reservations', icon: CalendarCheck, roles: ['owner', 'manager'], businessTypes: ['restaurant'] },
  { href: '/settings?tab=kds', labelKey: 'kds', icon: ChefHat, roles: ['owner', 'manager'], businessTypes: ['restaurant'] },
  { href: '/customers', labelKey: 'customers', icon: Users, roles: ['owner', 'manager'], businessTypes: null },
  { href: '/staff', labelKey: 'staff', icon: UserCog, roles: ['owner', 'manager'], businessTypes: null },
  { href: '/settings', labelKey: 'settings', icon: Settings, roles: ['owner', 'manager'], businessTypes: null },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, currentTenant, logout } = useAuthStore();
  const { tablesRequired, kdsEnabled, whatsappEnabled, customersEnabled, setTablesRequired, setKdsEnabled, setWhatsappEnabled, setCustomersEnabled, setOrderTypes } = usePosSettingsStore();
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { confirm, ConfirmDialog } = useConfirm();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  const role = currentTenant?.role || 'cashier';
  const businessType = currentTenant?.business_type || 'restaurant';
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.href === '/tables' && !tablesRequired) return false;
    // KDS disabled → hide the nav entry entirely (issue #133).
    if (item.href === '/settings?tab=kds' && !kdsEnabled) return false;
    // WhatsApp integration not enabled on this tenant → hide the nav entry.
    if (item.href === '/whatsapp' && !whatsappEnabled) return false;
    // No customer book on this business → the page has nothing to show.
    if (item.href === '/customers' && !customersEnabled) return false;
    return item.roles.includes(role)
      && (item.businessTypes === null || item.businessTypes.includes(businessType));
  });
  const homeHref = getLandingPage();

  useEffect(() => {
    if (!currentTenant) return;
    api.get('/settings/business')
      .then((res) => {
        setTablesRequired(typeof res.data.tables_required === 'boolean' ? res.data.tables_required : true);
      })
      .catch(() => { });
    api.get('/settings/kds_enabled')
      .then((res) => setKdsEnabled(res.data.setting?.value !== 'false'))
      .catch(() => { });
    api.get('/settings/customers_enabled')
      .then((res) => setCustomersEnabled(res.data.setting?.value !== 'false'))
      .catch(() => { });
    // Which order types the POS may offer. Read here, like the other
    // business-level flags, so every screen that renders after login already
    // knows what this tenant takes.
    api.get(`/settings/${ORDER_TYPES_SETTING_KEY}`)
      .then((res) => setOrderTypes(parseOrderTypes(res.data.setting?.value)))
      .catch(() => { });
    // Sync the WhatsApp enabled flag from the backend so the sidebar shows
    // the nav entry only when the integration is actually enabled on this
    // tenant. The WhatsApp page also writes the store on enable/disable so
    // the sidebar updates without a refetch when the user toggles.
    api.get('/whatsapp/status')
      .then((res) => setWhatsappEnabled(!!res.data?.enabled))
      .catch(() => { });
  }, [currentTenant, setTablesRequired, setKdsEnabled, setWhatsappEnabled, setCustomersEnabled, setOrderTypes]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homeHref}>
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
                  {(currentTenant?.business_name || tCommon('brandName')).charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 leading-none">
                  <span className="font-semibold truncate">{currentTenant?.business_name || tCommon('brandName')}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const [hrefPath, hrefQuery] = item.href.split('?');
                const isActive = !hrefQuery && (pathname === hrefPath || pathname?.startsWith(hrefPath + '/'));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.labelKey)}>
                      <Link href={item.href} onClick={closeMobile}>
                        <item.icon className="size-4 shrink-0" />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} tooltip={t('toggleSidebar')}>
              <PanelLeft />
              <span>{t('collapse')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {/* Identity label, not a button — nothing to click through to, so it
                deliberately skips SidebarMenuButton's interactive/hover styling. */}
            <div
              title={user?.name || user?.email || t('user')}
              className="flex w-full items-center gap-2 rounded-md p-2 text-start text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0"
            >
              <UserCircle />
              <span className="truncate">{user?.name || user?.email || t('user')}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={async () => { if (await confirm(t('confirmLogout'))) logout(); }} tooltip={t('logoutTooltip')}>
              <LogOut />
              <span>{t('logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      {ConfirmDialog}
    </Sidebar>
  );
}
