import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './generated';

export type OpenrideDatabase = Database;
export type OpenrideClient = SupabaseClient<Database>;

export interface ClientOptions {
  url: string;
  anonKey?: string;
  serviceRoleKey?: string;
  accessToken?: string;
}

/**
 * Browser/mobile client — uses the anon key and the user's JWT (if signed in).
 * RLS is in force.
 */
export function createBrowserClient(opts: ClientOptions): OpenrideClient {
  if (!opts.anonKey) throw new Error('createBrowserClient requires anonKey');
  return createClient<Database>(opts.url, opts.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: opts.accessToken
      ? { headers: { Authorization: `Bearer ${opts.accessToken}` } }
      : undefined,
  });
}

/**
 * Server-side client with service-role key. RLS is bypassed — callers are
 * responsible for enforcing authorisation in code.
 */
export function createServiceClient(opts: ClientOptions): OpenrideClient {
  if (!opts.serviceRoleKey) throw new Error('createServiceClient requires serviceRoleKey');
  return createClient<Database>(opts.url, opts.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export * from './query';
export type { Database } from './generated';
