import { createBrowserClient, type OpenrideClient } from '@openride/db';

import { secureStorage } from './secure-storage';

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

// SecureStore-backed session storage so the rider stays signed in across
// launches. Passed at construction — GoTrue reads it when the client is built.
export const supabase: OpenrideClient = createBrowserClient({ url, anonKey, storage: secureStorage });
