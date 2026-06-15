'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getApi } from '@/lib/api-browser';

export function RefundButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refund(): Promise<void> {
    const reason = window.prompt('Reason for refund (min 5 chars):');
    if (!reason || reason.trim().length < 5) return;
    setBusy(true);
    try {
      await getApi().refundPayment(paymentId, reason.trim());
      router.refresh();
    } catch (e) {
      alert(`Refund failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={refund}
      disabled={busy}
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      {busy ? 'Refunding…' : 'Refund'}
    </button>
  );
}
