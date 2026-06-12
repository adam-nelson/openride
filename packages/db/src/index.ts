import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './generated';

export type OpenrideDatabase = Database;
export type OpenrideClient = SupabaseClient<Database>;

/** Minimal storage contract Supabase Auth uses to persist the session. */
export interface AuthStorage {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

export interface ClientOptions {
  url: string;
  anonKey?: string;
  serviceRoleKey?: string;
  accessToken?: string;
  /**
   * Session storage adapter. On web, leave undefined to use the default
   * (localStorage). On React Native, pass a SecureStore/AsyncStorage adapter —
   * it MUST be set here at construction; assigning it afterwards is a no-op
   * because GoTrueClient reads storage when it is created.
   */
  storage?: AuthStorage;
}

/**
 * Browser/mobile client — uses the anon key and the user's JWT (if signed in).
 * RLS is in force.
 */
export function createBrowserClient(opts: ClientOptions): OpenrideClient {
  if (!opts.anonKey) throw new Error('createBrowserClient requires anonKey');
  return createClient<Database>(opts.url, opts.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // RN has no URL to parse a session out of; only relevant on web OAuth.
      detectSessionInUrl: opts.storage ? false : undefined,
      ...(opts.storage ? { storage: opts.storage } : {}),
    },
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
