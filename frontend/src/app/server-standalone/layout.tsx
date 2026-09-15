import type { Metadata } from 'next';
import '../globals.css';
import { KdsHtmlLang } from '@/components/kds/KdsHtmlLang';

export const metadata: Metadata = {
  title: 'BuonApp Server App',
  description: 'Tableside ordering for BuonApp',
};

/**
 * Same shape as the standalone KDS layout: a plain container under the root
 * layout, which already carries the i18n provider and the toaster. The
 * previous version rendered a second <html><body> pair and a second toaster
 * inside the root's own.
 */
export default function ServerStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <KdsHtmlLang />
      {children}
    </div>
  );
}
