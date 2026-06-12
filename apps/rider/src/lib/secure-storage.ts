import type { AuthStorage } from '@openride/db';
import * as SecureStore from 'expo-secure-store';

// SecureStore rejects values over ~2KB, and a Supabase session (JWT + refresh
// token + user) can exceed that. We chunk large values across multiple keys and
// store a small manifest (the chunk count) under the original key.
const MAX = 2000;

export const secureStorage: AuthStorage = {
  async getItem(key) {
    const head = await SecureStore.getItemAsync(key);
    if (head === null) return null;
    if (!head.startsWith('__chunks__:')) return head;
    const count = parseInt(head.slice('__chunks__:'.length), 10);
    let value = '';
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null; // corrupt — treat as missing
      value += part;
    }
    return value;
  },

  async setItem(key, value) {
    if (value.length <= MAX) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const count = Math.ceil(value.length / MAX);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * MAX, (i + 1) * MAX));
    }
    await SecureStore.setItemAsync(key, `__chunks__:${count}`);
  },

  async removeItem(key) {
    const head = await SecureStore.getItemAsync(key);
    if (head?.startsWith('__chunks__:')) {
      const count = parseInt(head.slice('__chunks__:'.length), 10);
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};
