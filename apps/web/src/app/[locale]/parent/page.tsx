import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, requireRole } from '@/lib/api';
import type { Child, Plans, Subscription, Trip } from '@/lib/types';
import { AddChildForm } from './add-child-form';
import { AwaitActivation } from './await-activation';
import { PlanPicker } from './plan-picker';

/** "My subscription": everything is fetched on the server in parallel; only the forms ship JS. */
export default async function ParentPage({ params, searchParams }: PageProps<'/[locale]/parent'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole('PARENT');

  const { checkout } = await searchParams;
  const [subs, children, trips, plans, t, te, format] = await Promise.all([
    apiFetch<Subscription[]>('/subscriptions/mine'),
    apiFetch<Child[]>('/children/mine'),
    apiFetch<Trip[]>('/trips'),
    apiFetch<Plans>('/plans'),
    getTranslations('parent'),
    getTranslations('enums'),
    getFormatter(),
  ]);
  const money = (cents: number, currency = 'EUR') => format.number(cents / 100, { style: 'currency', currency: currency.toUpperCase() });
  const hasPending = subs.some((s) => s.status === 'PENDING');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {checkout === 'success' && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {t('checkoutSuccess')}
        </p>
      )}
      {checkout === 'canceled' && (
        <p role="status" className="rounded-xl bg-stone-100 p-4 text-sm text-stone-700">
          {t('checkoutCanceled')}
        </p>
      )}
      {checkout === 'success' && hasPending && <AwaitActivation />}

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">{t('mine.title')}</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-stone-500">{t('mine.empty')}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">
                    {te(`period.${s.period}`)} · {s.trip?.name} ({s.trip && te(`direction.${s.trip.direction}`)})
                  </div>
                  <div className="text-sm text-stone-500">
                    {t('mine.children', { count: s.childrenCount })} · {money(s.amountCents, s.currency)}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-stone-500">
                  {s.status === 'ACTIVE' && s.currentPeriodEnd
                    ? t('mine.validUntil', { date: format.dateTime(new Date(s.currentPeriodEnd), { dateStyle: 'long' }) })
                    : s.status === 'PENDING'
                      ? t('mine.awaiting')
                      : null}
                  <StatusBadge status={s.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-5">
        <section className="card p-5 md:col-span-2">
          <h2 className="mb-4 font-semibold">{t('children.title')}</h2>
          {children.length === 0 ? (
            <p className="mb-4 text-sm text-stone-500">{t('children.empty')}</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {children.map((c) => (
                <li key={c.id} className="flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                  <span>{c.name}</span>
                  <span className="text-stone-500">{t('children.gradeN', { grade: c.grade })}</span>
                </li>
              ))}
            </ul>
          )}
          <AddChildForm />
        </section>

        <section className="card p-5 md:col-span-3">
          <h2 className="mb-4 font-semibold">{t('plan.title')}</h2>
          <PlanPicker plans={plans} trips={trips} kids={children} />
        </section>
      </div>
    </div>
  );
}
