'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getSupabaseBrowser } from '@/lib/supabase-browser';

const NEXT: Record<string, { label: string; status: string }[]> = {
  open: [
    { label: 'Triage', status: 'triaged' },
    { label: 'Resolve', status: 'resolved' },
  ],
  triaged: [
    { label: 'Under review', status: 'under_review' },
    { label: 'Resolve', status: 'resolved' },
  ],
  under_review: [{ label: 'Resolve', status: 'resolved' }],
  resolved: [{ label: 'Close', status: 'closed' }],
};

export function IncidentResolve({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const actions = NEXT[status] ?? [];

  async function setStatus(next: string): Promise<void> {
    const patch: Record<string, unknown> = { status: next };
    if (next === 'resolved') {
      const notes = window.prompt('Resolution notes (optional):') ?? '';
      patch.resolution_notes = notes;
      patch.resolved_at = new Date().toISOString();
      const { data } = await getSupabaseBrowser().auth.getUser();
      patch.resolved_by = data.user?.id ?? null;
    }
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowser()
        .from('incident_reports')
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
      router.refresh();
    } catch (e) {
      alert(`Update failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (actions.length === 0) return null;
  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <button
          key={a.status}
          type="button"
          disabled={busy}
          onClick={() => setStatus(a.status)}
          className="text-xs border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
