/**
 * Resolve Supabase connection settings.
 *
 * The anon key is public by design (RLS is what protects data), so the
 * canonical source is the NEXT_PUBLIC_* pair — readable in both Server and
 * Client Components. We fall back to the non-public names so a single
 * SUPABASE_URL / SUPABASE_ANON_KEY in the environment also works server-side.
 *
 * NOTE: Next.js reads env files from THIS app's directory (apps/admin/.env.local),
 * not the repo root. See apps/admin/.env.example.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
        'in apps/admin/.env.local (copy apps/admin/.env.example). ' +
        'Run `pnpm db:start` and `pnpm db:status` to get the local values.',
    );
  }
  return { url, anonKey };
}
