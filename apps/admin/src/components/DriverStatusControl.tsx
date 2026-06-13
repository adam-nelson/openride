'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getSupabaseBrowser } from '@/lib/supabase-browser';

export function DriverStatusControl({ driverId, status }: { driverId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: 'approved' | 'suspended'): Promise<void> {
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowser()
        .from('driver_profiles')
        .update({ status: next })
        .eq('user_id', driverId);
      if (error) throw error;
      router.refresh();
    } catch (e) {
      alert(`Could not update: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      {status !== 'approved' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setStatus('approved')}
          className="bg-green-600 text-white text-sm rounded px-3 py-1.5 disabled:opacity-60"
        >
          Approve
        </button>
      ) : null}
      {status !== 'suspended' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setStatus('suspended')}
          className="bg-red-600 text-white text-sm rounded px-3 py-1.5 disabled:opacity-60"
        >
          Suspend
        </button>
      ) : null}
    </div>
  );
}
