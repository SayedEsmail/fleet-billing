import { createBrowserClient } from '@supabase/ssr';
import { supabaseKey, supabaseUrl } from './env';

/** Browser Supabase client; stores the session in cookies so the server can read it. */
export const createClient = () => createBrowserClient(supabaseUrl(), supabaseKey());
