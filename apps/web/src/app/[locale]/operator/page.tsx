import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireRole } from '@/lib/api';
import type { SubscriptionStatus } from '@/lib/types';
import { FleetSection } from './fleet-section';
import { StatsSection } from './stats-section';
import { SubscriptionsSection } from './subscriptions-section';

const STATUSES: SubscriptionStatus[] = ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELED'];

/**
 * Server Component page. Each section fetches its own data and streams in
 * behind its own Suspense boundary, so the slow query never blocks the fast ones.
 */
export default async function OperatorPage({ params, searchParams }: PageProps<'/[locale]/operator'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole('OPERATOR');

  const raw = (await searchParams).status;
  const status = STATUSES.find((s) => s === raw);
  const t = await getTranslations('operator');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Suspense fallback={<Skeleton className="h-64" />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-80" />}>
        <FleetSection />
      </Suspense>

      <Suspense key={status ?? 'all'} fallback={<Skeleton className="h-96" />}>
        <SubscriptionsSection status={status} statuses={STATUSES} />
      </Suspense>
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`card animate-pulse bg-stone-100 ${className}`} />;
}
