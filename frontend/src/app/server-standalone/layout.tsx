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
 * A handheld whose browser predates the stack the app is built with used to
 * land on a blank white page and say nothing: the bundle dies on a syntax it
 * cannot parse, and Tailwind v4 wraps its stylesheet in `@layer`, so the only
 * thing the export prerenders — a spinner — is left unstyled and invisible.
 *
 * Deliberately ES5: this runs on the engines that choke on the app itself, so
 * not a line of it may use anything they cannot parse. It probes each engine
 * by proxy rather than by trying the syntax out — the Server App's CSP has no
 * `'unsafe-eval'`, so a `new Function` probe would throw on every browser and
 * hide a working app behind this notice. `String.replaceAll` shipped in the
 * same release as the logical assignment the bundle is full of (Chrome 85),
 * and `oklch()` in the one Tailwind v4 needs (Chrome 111). Failing either
 * means nothing will ever paint, so the page says so instead, and points at
 * /browser-check.html for the full report.
 */
const LEGACY_BROWSER_NOTICE = `
(function () {
  var jsOk = typeof String.prototype.replaceAll === 'function';
  var cssOk = !!(window.CSS && CSS.supports && CSS.supports('color', 'oklch(0.5 0.1 200)'));
  if (jsOk && cssOk) return;

  var version = /Chrom(?:e|ium)\\/([0-9]+)/.exec(navigator.userAgent);
  function show() {
    document.body.innerHTML =
      '<div style="font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111;background:#fff;line-height:1.5">' +
      '<h1 style="font-size:19px;margin:0 0 12px">This device is too old for BuonApp</h1>' +
      '<p style="margin:0 0 12px">Its browser' + (version ? ' (Chrome ' + version[1] + ')' : '') +
      ' cannot run the ordering screen. Chrome or Android WebView 111 or newer is required.</p>' +
      '<p style="margin:0"><a href="/browser-check.html" style="color:#3248FF">Open the full browser check</a></p>' +
      '</div>';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
}());
`;

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
      <script dangerouslySetInnerHTML={{ __html: LEGACY_BROWSER_NOTICE }} />
      <KdsHtmlLang />
      {children}
    </div>
  );
}
