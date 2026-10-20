import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getMe } from '@/lib/api';
import { LocaleSwitch } from './locale-switch';
import { SignOutButton } from './sign-out-button';

export async function SiteHeader() {
  const [t, me] = await Promise.all([getTranslations('common'), getMe().catch(() => null)]);

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-400 text-lg">
            🚌
          </span>
          {t('appName')}
        </Link>
        <div className="flex items-center gap-1">
          {me && <span className="hidden text-sm text-stone-500 sm:inline">{me.email}</span>}
          <Suspense>
            <LocaleSwitch label={t('switchLanguage')} />
          </Suspense>
          {me && <SignOutButton label={t('signOut')} />}
        </div>
      </div>
    </header>
  );
}
