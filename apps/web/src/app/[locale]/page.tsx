import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getMe } from '@/lib/api';
import { LoginForm } from './login-form';

/** Login. Signed-in users are sent straight to the page for their role. */
export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getMe();
  if (me) redirect({ href: me.role === 'OPERATOR' ? '/operator' : '/parent', locale });

  const t = await getTranslations('login');
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 py-6 md:grid-cols-2">
      <section>
        <h1 className="text-3xl font-bold leading-tight text-balance md:text-4xl">{t('heading')}</h1>
        <p className="mt-4 text-stone-600">{t('subheading')}</p>
      </section>
      <section className="card p-6">
        <LoginForm demoPassword={process.env.NEXT_PUBLIC_DEMO_PASSWORD} />
      </section>
    </div>
  );
}
