'use client';

import { useSyncServerLanguage } from '@/lib/i18n';
import { ServerAppShell } from '@/components/server-app/ServerAppShell';

/**
 * The tableside handheld, served on its own port by main/server-app.ts.
 *
 * The page itself only inherits the tenant language from `/api/server-app/info`
 * — the way the standalone KDS does from `/api/kds/info` — and hands over to
 * the shell, which owns the session, the data and the two screens.
 */
export default function ServerStandalonePage() {
  useSyncServerLanguage('/api/server-app/info');
  return <ServerAppShell />;
}
