import { redirect } from 'next/navigation';

import { getSupabaseServer } from '@/lib/supabase-server';

export default async function Page() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  redirect('/dashboard');
}
