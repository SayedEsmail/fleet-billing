'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';

/** Client component: needs the current path and query to link to the same page in the other language. */
export function LocaleSwitch({ label }: { label: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const query = Object.fromEntries(useSearchParams());
  const other = locale === 'ar' ? 'en' : 'ar';

  return (
    <Link href={{ pathname, query }} locale={other} className="btn-ghost" hrefLang={other}>
      {label}
    </Link>
  );
}
