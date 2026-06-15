import { formatMoney } from '@openride/ui';

import { RefundButton } from '@/components/RefundButton';
import { getSupabaseServer } from '@/lib/supabase-server';

interface PaymentRow {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  trip_id: string;
}

const REFUNDABLE = new Set(['captured', 'partially_refunded']);

export default async function PaymentsPage() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount_cents, currency, status, created_at, trip_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return <p className="text-red-600">{error.message}</p>;
  const rows = (data as PaymentRow[]) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Payments</h1>
      <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-2">When</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Trip</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                {new Date(p.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-2">{formatMoney(p.amount_cents, p.currency)}</td>
              <td className="px-4 py-2">{p.status}</td>
              <td className="px-4 py-2 text-gray-500">{p.trip_id.slice(0, 8)}</td>
              <td className="px-4 py-2 text-right">
                {REFUNDABLE.has(p.status) ? <RefundButton paymentId={p.id} /> : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                No payments yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
