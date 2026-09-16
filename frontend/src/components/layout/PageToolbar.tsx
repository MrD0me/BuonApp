'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * The page header of the dashboard: the sidebar toggle, the title, the
 * actions. The toggle used to be a "Collapse" row in the sidebar itself and
 * a bare bar that only existed below `md`; here it is one 44 px button with
 * the same accessible name on every page and every width.
 */
export function PageToolbar({ title, subtitle, actions, className }: Props) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={className}
      leading={<SidebarTrigger className="size-touch text-muted-foreground [&_svg]:size-5" aria-label="Open navigation" />}
    />
  );
}
