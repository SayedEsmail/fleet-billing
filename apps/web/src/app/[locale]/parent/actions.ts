'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { ApiError, apiFetch } from '@/lib/api';

export interface CheckoutState {
  error?: string;
}

/**
 * The app's one Server Action. It runs on the server with the session cookie,
 * asks the API for a Stripe Checkout session, then redirects the browser to
 * Stripe. Works without client JS (plain form post) and never exposes the
 * Stripe secret or the amount calculation to the browser.
 */
export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const childIds = formData.getAll('childIds').map(String);
  if (childIds.length === 0) return { error: 'pickChild' };

  let url: string;
  try {
    ({ url } = await apiFetch<{ url: string }>('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({
        period: formData.get('period'),
        tripId: formData.get('tripId'),
        childIds,
        locale: await getLocale(),
      }),
    }));
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Unexpected error' };
  }
  redirect(url);
}
