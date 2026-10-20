'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

/**
 * After Stripe redirects back, the webhook may land a moment later.
 * Re-render the server page a few times until the subscription turns active.
 */
export function AwaitActivation() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      if (++tries > 10) clearInterval(id);
      router.refresh();
    }, 2000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
