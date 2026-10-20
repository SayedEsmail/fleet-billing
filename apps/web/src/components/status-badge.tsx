import { useTranslations } from 'next-intl';
import type { SubscriptionStatus } from '@/lib/types';

const STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  EXPIRED: 'bg-stone-100 text-stone-600 ring-stone-500/20',
  CANCELED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const t = useTranslations('enums.status');
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}>
      {t(status)}
    </span>
  );
}
