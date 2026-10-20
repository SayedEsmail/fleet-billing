import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { supabaseKey, supabaseUrl } from './lib/supabase/env';

const intl = createIntlMiddleware(routing);

/**
 * 1. next-intl picks/redirects the locale prefix.
 * 2. Supabase refreshes an expiring session and writes the new cookies onto that same response.
 * Role checks live in the pages (they need the API), not here.
 */
export default async function proxy(request: NextRequest) {
  const response = intl(request);

  const supabase = createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  // Skip the network round-trip entirely for anonymous visitors.
  if (request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) {
    await supabase.auth.getClaims();
  }

  return response;
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
