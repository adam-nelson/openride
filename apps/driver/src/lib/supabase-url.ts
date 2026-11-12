export function resolveSupabaseUrl(
  configuredUrl: string,
  options: { isDev: boolean; platform: string; browserOrigin?: string },
): string {
  if (options.isDev && options.platform === 'web' && options.browserOrigin) {
    return new URL('/supabase', options.browserOrigin).toString();
  }
  return configuredUrl;
}