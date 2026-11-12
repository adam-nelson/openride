import { describe, expect, it } from 'vitest';

import { resolveSupabaseUrl } from './supabase-url';

describe('resolveSupabaseUrl', () => {
  it('uses the same-origin proxy only for development web builds', () => {
    expect(
      resolveSupabaseUrl('https://private-backend.example', {
        isDev: true,
        platform: 'web',
        browserOrigin: 'https://driver-preview.example',
      }),
    ).toBe('https://driver-preview.example/supabase');
  });

  it('keeps native and production builds on the configured Supabase URL', () => {
    const configuredUrl = 'https://project.supabase.co';
    expect(resolveSupabaseUrl(configuredUrl, { isDev: true, platform: 'ios' })).toBe(configuredUrl);
    expect(
      resolveSupabaseUrl(configuredUrl, {
        isDev: false,
        platform: 'web',
        browserOrigin: 'https://driver.example',
      }),
    ).toBe(configuredUrl);
  });
});
