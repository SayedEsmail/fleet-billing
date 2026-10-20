import { getFormatter, getTranslations } from 'next-intl/server';
import { StatusBadge } from '@/components/status-badge';
import { Link } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api';
import type { Subscription, SubscriptionStatus } from '@/lib/types';

/** Filtering is a plain link (?status=…), so it works without client JS and is shareable. */
export async function SubscriptionsSection({
  status,
  statuses,
}: {
  status?: SubscriptionStatus;
  statuses: SubscriptionStatus[];
}) {
  const [subs, t, te, format] = await Promise.all([
    apiFetch<Subscription[]>(`/subscriptions${status ? `?status=${status}` : ''}`),
    getTranslations('operator.subscriptions'),
    getTranslations('enums'),
    getFormatter(),
  ]);

  const tabs: { key: SubscriptionStatus | undefined; label: string }[] = [
    { key: undefined, label: t('all') },
    ...statuses.map((s) => ({ key: s, label: te(`status.${s}`) })),
  ];
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4">
        <h2 className="font-semibold">{t('title')}</h2>
        <nav className="flex flex-wrap gap-1" aria-label={t('status')}>
          {tabs.map((tab) => (
            <Link
              key={tab.key ?? 'all'}
              href={{ pathname: '/operator', query: tab.key ? { status: tab.key } : {} }}
              scroll={false}
              aria-current={tab.key === status ? 'page' : undefined}
              className={`rounded-full px-3 py-1 text-xs ${
                tab.key === status ? 'bg-ink text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50">
            <tr>
              <th className="th">{t('parent')}</th>
              <th className="th">{t('trip')}</th>
              <th className="th">{t('plan')}</th>
              <th className="th">{t('children')}</th>
              <th className="th">{t('amount')}</th>
              <th className="th">{t('status')}</th>
              <th className="th">{t('period')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="td">
                  <div className="font-medium">{s.parent?.fullName}</div>
                  <div className="text-xs text-stone-400" dir="ltr">
                    {s.parent?.email}
                  </div>
                </td>
                <td className="td">
                  {s.trip?.name} · {s.trip && te(`direction.${s.trip.direction}`)}
                </td>
                <td className="td">{te(`period.${s.period}`)}</td>
                <td className="td">{format.number(s.childrenCount)}</td>
                <td className="td">{format.number(s.amountCents / 100, { style: 'currency', currency: s.currency.toUpperCase() })}</td>
                <td className="td">
                  <StatusBadge status={s.status} />
                </td>
                <td className="td text-xs text-stone-500">
                  {s.currentPeriodStart && s.currentPeriodEnd ? `${date(s.currentPeriodStart)} – ${date(s.currentPeriodEnd)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subs.length === 0 && <p className="p-6 text-center text-sm text-stone-500">{t('empty')}</p>}
      </div>
    </section>
  );
}
