'use client';

import { createClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Browser → API call with the user's Supabase token (used by the interactive client components). */
export async function clientApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await createClient().auth.getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(data.session ? { authorization: `Bearer ${data.session.access_token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : (body?.message ?? res.statusText));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
