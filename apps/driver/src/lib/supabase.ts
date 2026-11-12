import { createBrowserClient, type OpenrideClient } from '@openride/db';
import { Platform } from 'react-native';

import { secureStorage } from './secure-storage';
import { resolveSupabaseUrl } from './supabase-url';

// Expo inlines EXPO_PUBLIC_* env vars into the bundle at build time.
// Set them in apps/driver/.env.local (see .env.example), then restart
// the bundler with `expo start --clear` so the new values are picked up.
const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!configuredUrl || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy apps/driver/.env.example to .env.local and restart with `expo start --clear`.',
  );
}

const url = resolveSupabaseUrl(configuredUrl, {
  isDev: __DEV__,
  platform: Platform.OS,
  browserOrigin: (globalThis as typeof globalThis & { location?: { origin: string } }).location?.origin,
});

// SecureStore-backed session storage so the driver stays signed in across
// launches. Passed at construction — GoTrue reads it when the client is built.
export const supabase: OpenrideClient = createBrowserClient({ url, anonKey, storage: secureStorage });
