import 'server-only';
import { cache } from 'react';
import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from './supabase/server';
import type { Me, Role } from './types';

/** Server-side base URL: inside docker compose this is the service name, not localhost. */
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Access token from the session cookie. The API verifies it, so the web app doesn't have to. */
const accessToken = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : (body?.message ?? res.statusText);
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** The signed-in user's profile, or null. Deduplicated per request. */
export const getMe = cache(async (): Promise<Me | null> => {
  if (!(await accessToken())) return null;
  try {
    return await apiFetch<Me>('/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
});

/** Page guard: sends anonymous users to login and wrong-role users to their own page. */
export async function requireRole(role: Role): Promise<Me> {
  const [me, locale] = await Promise.all([getMe(), getLocale()]);
  if (!me) redirect({ href: '/', locale });
  if (me!.role !== role) redirect({ href: me!.role === 'OPERATOR' ? '/operator' : '/parent', locale });
  return me!;
}
