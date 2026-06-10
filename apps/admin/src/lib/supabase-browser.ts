'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@openride/db/types';

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }
  return createBrowserClient<Database>(url, anonKey);
}
