'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/layout/AuthGuard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import StatusBar from '@/components/layout/StatusBar';
import GlobalNotifications from '@/components/layout/GlobalNotifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPos = pathname === '/pos' || pathname === '/kds';
  const isSettings = pathname === '/settings';

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-hidden flex flex-col">
          {/* The sidebar toggle lives in every page's header (PageToolbar),
              at every width, so there is no separate bar for it any more. */}
          {!isPos && <GlobalNotifications />}
          <div className={isPos
            ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
            : isSettings
            ? 'flex-1 min-h-0 p-4 overflow-auto md:overflow-hidden min-w-0'
            : 'flex-1 p-4 overflow-auto min-w-0'
          }>
            {children}
          </div>
          <StatusBar />
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
