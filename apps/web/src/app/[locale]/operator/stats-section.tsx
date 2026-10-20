import { getFormatter, getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api';
import type { Stats } from '@/lib/types';

/** Aggregates are computed by the API; this component only renders them (no client JS). */
export async function StatsSection() {
  const [stats, t, td, format] = await Promise.all([
    apiFetch<Stats>('/stats'),
    getTranslations('operator.stats'),
    getTranslations('enums.direction'),
    getFormatter(),
  ]);

  const cards = [
    { label: t('mrr'), value: format.number(stats.mrrCents / 100, { style: 'currency', currency: 'EUR' }) },
    { label: t('active'), value: format.number(stats.subscriptions.active) },
    { label: t('pending'), value: format.number(stats.subscriptions.pending) },
    { label: t('riders'), value: format.number(stats.ridersActive) },
    { label: t('buses'), value: format.number(stats.activeBuses) },
  ];

  return (
    <section className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <dt className="text-xs text-stone-500">{c.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{c.value}</dd>
          </div>
        ))}
      </dl>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t('utilization')}</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {stats.tripUtilization.map((trip) => {
            const pct = Math.min(100, Math.round(trip.utilization * 100));
            return (
              <li key={trip.tripId}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span>
                    {trip.name} · {td(trip.direction)} <span className="ltr-nums text-stone-400">{trip.departureTime}</span>
                  </span>
                  <span className="text-stone-500">{t('seats', { taken: trip.seatsTaken, capacity: trip.capacity })}</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-stone-100"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={trip.name}
                >
                  <div
                    className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 60 ? 'bg-brand-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
