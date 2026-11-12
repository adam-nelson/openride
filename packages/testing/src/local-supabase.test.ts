import { describe, expect, it } from 'vitest';

import { assertLocalSupabaseUrl } from './local-supabase';

describe('assertLocalSupabaseUrl', () => {
  it.each(['http://localhost:54321', 'http://127.0.0.1:54321', 'http://[::1]:54321'])(
    'accepts local URL %s',
    (url) => expect(() => assertLocalSupabaseUrl(url)).not.toThrow(),
  );

  it.each(['https://project.supabase.co', 'http://192.168.1.20:54321', 'not-a-url'])(
    'rejects non-local or invalid URL %s',
    (url) => expect(() => assertLocalSupabaseUrl(url)).toThrow(/refuse|require a valid local/),
  );
});
