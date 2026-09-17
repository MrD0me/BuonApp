'use client';

import { useState, type FormEvent } from 'react';
import { UserRound } from 'lucide-react';
import { useTranslations } from 'use-intl';
import toast from 'react-hot-toast';

interface Props {
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<void>;
}

/** Pairing the phone: an account of the waiter role, and whether to stay in. */
export function ServerLoginForm({ onLogin }: Props) {
  const t = useTranslations('serverApp');
  const tAuth = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onLogin(email, password, rememberMe);
    } catch {
      toast.error(t('signInFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <UserRound size={42} className="mx-auto mb-3 text-brand" />
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('loginSubtitle')}</p>
        </div>
        <div className="space-y-3">
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" dir="ltr" autoComplete="username" placeholder={t('emailPlaceholder')} required className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder={tAuth('password')} required className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="rounded border-gray-300 text-brand focus:ring-brand" />
            {tAuth('rememberMe')}
          </label>
          <button disabled={busy} className="h-11 w-full rounded-lg bg-brand font-semibold text-white disabled:opacity-60">
            {busy ? tAuth('signingIn') : tAuth('signIn')}
          </button>
        </div>
      </form>
    </div>
  );
}
