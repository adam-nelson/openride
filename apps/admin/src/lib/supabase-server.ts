import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@openride/db/types';

import { getSupabaseEnv } from './env';

/**
 * Server-side Supabase client bound to the request's cookies.
 *
 * Async because Next 15+ made `cookies()` return a Promise. Uses the
 * getAll/setAll cookie interface required by @supabase/ssr >= 0.6.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component during render — middleware/route
          // handlers refresh the session instead. Safe to ignore here.
        }
      },
    },
  });
}
