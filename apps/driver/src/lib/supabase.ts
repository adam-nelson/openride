import { createBrowserClient, type OpenrideClient } from '@openride/db';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const url = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined;

if (!url || !anonKey) {
  throw new Error('Missing supabaseUrl / supabaseAnonKey in app.json extra.');
}

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase: OpenrideClient = createBrowserClient({ url, anonKey });

// @ts-expect-error -- override storage at runtime; Supabase JS supports it.
supabase.auth.storage = secureStorage;
