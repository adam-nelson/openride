const LOCAL_SUPABASE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function assertLocalSupabaseUrl(supabaseUrl: string): void {
  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    throw new Error('Supabase integration tests require a valid local SUPABASE_URL.');
  }

  if (url.protocol !== 'http:' || !LOCAL_SUPABASE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('Supabase integration tests refuse non-local SUPABASE_URL values.');
  }
}
