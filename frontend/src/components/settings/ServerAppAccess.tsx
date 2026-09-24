'use client';

import { useCallback, useEffect, useState } from 'react';
import { QrCode, RefreshCw } from 'lucide-react';
import { useTranslations } from 'use-intl';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Ltr } from '@/components/layout/Ltr';

interface ServerAppInfo {
  mdns_url: string;
  ip_url: string;
  qr_url: string;
  qr_data_url: string | null;
  ips_data?: { ip: string; url: string; qr_data: string | null }[];
}

type Status = 'loading' | 'ready' | 'off' | 'failed';

/**
 * Where a waiter's phone finds the handheld: a QR code and the address for
 * each network this PC is on, and the `buonapp.local` name Apple devices
 * resolve. The code is only the address — getting in still takes the waiter's
 * own email and password.
 *
 * Two places show it: the Palmari window the sidebar opens, for everyone who
 * works the till, and the tableside ordering tab in Settings. It asks for the
 * addresses as it mounts, so both open straight onto the codes; Settings used
 * to wait for a "load" button first.
 */
export function ServerAppAccess() {
  const t = useTranslations('settings');
  const [info, setInfo] = useState<ServerAppInfo | null>(null);
  // Starts as loading rather than being set inside the mount effect, which
  // always asks.
  const [status, setStatus] = useState<Status>('loading');

  const load = useCallback(() => {
    api.get('/server-app-info')
      .then((res) => {
        setInfo(res.data);
        setStatus('ready');
      })
      .catch((error) => {
        // The owner's off switch answers 404 (main/routes/server-app-info.ts):
        // nothing is broken, there is just nothing to pair with.
        setStatus(error?.response?.status === 404 ? 'off' : 'failed');
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const reload = () => {
    setStatus('loading');
    load();
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'off') {
    return <p className="text-sm text-gray-400 italic">{t('serverAppPairingHiddenHint')}</p>;
  }

  if (status === 'failed' || !info) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-gray-500">{t('serverAppInfoFetchFailed')}</p>
        <button onClick={reload}
          className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90 font-medium">
          {t('retry')}
        </button>
      </div>
    );
  }

  const ips = info.ips_data ?? [];
  return (
    <div className="flex flex-col gap-6 w-full">
      {ips.length > 0 ? (
        <>
          {/* One network is the usual PC: its card takes the whole row
              instead of half of it beside an empty column. */}
          <div className={cn('grid grid-cols-1 gap-4 w-full', ips.length > 1 && 'sm:grid-cols-2')}>
            {ips.map((ipInfo, idx) => (
              <div key={idx} className="flex flex-col items-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {ipInfo.ip.startsWith('100.') ? t('vpnMeshNetwork') : t('localNetwork')}
                </p>
                {ipInfo.qr_data ? (
                  <img src={ipInfo.qr_data} alt={`QR Code for ${ipInfo.ip}`} className="w-40 h-40 rounded-lg mb-3 bg-white p-2 border border-gray-100" />
                ) : (
                  <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <QrCode size={40} className="text-gray-400" />
                  </div>
                )}
                <Ltr as="a" href={ipInfo.url} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-brand hover:underline break-all text-center">
                  {ipInfo.url}
                </Ltr>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">{t('appleDevices')}</p>
            <Ltr as="a" href={info.mdns_url} target="_blank" rel="noopener noreferrer" className="block font-mono text-sm text-blue-600 break-all hover:underline">
              {info.mdns_url}
            </Ltr>
            <p className="text-xs text-blue-600 mt-2">{t('appleDevicesHint')}</p>
          </div>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="shrink-0">
            {info.qr_data_url ? (
              <img src={info.qr_data_url} alt={t('serverAppQrAlt')} className="w-48 h-48 rounded-xl border border-gray-200" />
            ) : (
              <div className="w-48 h-48 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400">
                <QrCode size={48} />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('directIp')}</p>
              <Ltr as="a" href={info.ip_url} target="_blank" rel="noopener noreferrer" className="block font-mono text-sm text-brand break-all hover:underline">
                {info.ip_url}
              </Ltr>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('mdnsAlwaysStable')}</p>
              <Ltr as="a" href={info.mdns_url} target="_blank" rel="noopener noreferrer" className="block font-mono text-sm text-gray-700 break-all hover:underline">
                {info.mdns_url}
              </Ltr>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end border-t border-gray-200 pt-4">
        <button onClick={reload}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <RefreshCw size={14} />
          {t('refreshUrls')}
        </button>
      </div>
    </div>
  );
}
