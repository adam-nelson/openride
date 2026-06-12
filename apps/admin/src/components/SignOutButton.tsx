'use client';

import { getSupabaseBrowser } from '@/lib/supabase-browser';

export function SignOutButton() {
  async function onClick() {
    await getSupabaseBrowser().auth.signOut();
    window.location.href = '/login';
  }
  return (
    <button
      onClick={onClick}
      className="text-sm text-red-600 hover:underline"
      type="button"
    >
      Sign out
    </button>
  );
}
