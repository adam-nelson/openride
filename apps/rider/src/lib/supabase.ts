import { createBrowserClient, type OpenrideClient } from '@openride/db';
import * as SecureStore from 'expo-secure-store';

// Expo inlines EXPO_PUBLIC_* env vars into the bundle at build time.
// Set them in apps/rider/.env.local (see .env.example), then restart
// the bundler with `expo start --clear` so the new values are picked up.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy apps/rider/.env.example to .env.local and restart with `expo start --clear`.',
  );
}

// SecureStore-backed auth storage so the rider stays signed in across launches.
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase: OpenrideClient = createBrowserClient({ url, anonKey });

// @ts-expect-error -- override storage at runtime; Supabase JS supports it.
supabase.auth.storage = secureStorage;
