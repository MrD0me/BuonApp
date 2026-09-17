import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { KdsHtmlLang } from '@/components/kds/KdsHtmlLang';

export const metadata: Metadata = {
  title: 'BuonApp Server App',
  description: 'Tableside ordering for BuonApp',
  // Its own manifest: added to a phone's home screen, the handheld must open
  // on the floor, not on the till's Ordina screen the root manifest points at.
  manifest: '/server-app.webmanifest',
};

/**
 * Same values as the root, plus `viewportFit: cover`: the page draws under
 * the phone's notch and home indicator, and the sticky header and the action
 * bar pad themselves with the safe-area insets.
 */
export const viewport: Viewport = {
  themeColor: '#3248FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
    <div className="min-h-dvh bg-background">
      <KdsHtmlLang />
      {children}
    </div>
  );
}
