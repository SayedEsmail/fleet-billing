'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

const DEMO = { operator: 'operator.demo@example.com', parent: 'parent.demo@example.com' } as const;

/**
 * Client component: Supabase signs in from the browser and writes the session
 * cookie; the server page then reads that cookie and redirects by role.
 */
export function LoginForm({ demoPassword }: { demoPassword?: string }) {
  const t = useTranslations('login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const signIn = (creds: { email: string; password: string }) =>
    startTransition(async () => {
      setError(false);
      const { error } = await createClient().auth.signInWithPassword(creds);
      if (error) {
        setError(true);
        return;
      }
      router.refresh();
    });

  const fillDemo = (who: keyof typeof DEMO) => {
    setEmail(DEMO[who]);
    if (demoPassword) {
      setPassword(demoPassword);
      signIn({ email: DEMO[who], password: demoPassword });
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        signIn({ email, password });
      }}
    >
      <div>
        <label htmlFor="email" className="label">
          {t('email')}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t('password')}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {t('error')}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </button>

      <div className="border-t border-stone-100 pt-4">
        <p className="mb-2 text-xs text-stone-500">{t('tryAs')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-brand" disabled={pending} onClick={() => fillDemo('operator')}>
            {t('operator')}
          </button>
          <button type="button" className="btn-brand" disabled={pending} onClick={() => fillDemo('parent')}>
            {t('parent')}
          </button>
        </div>
      </div>
    </form>
  );
}
