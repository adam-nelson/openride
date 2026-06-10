import { getSupabaseServer } from '@/lib/supabase-server';

export default async function DriversPage() {
  const supabase = getSupabaseServer();
  const { data: drivers, error } = await supabase
    .from('driver_profiles')
    .select('user_id, status, licence_number, authority_expiry, users(display_name, phone)')
    .order('status', { ascending: true });

  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Drivers</h1>
      <table className="min-w-full bg-white border rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-sm text-left">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Authority expiry</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {(drivers ?? []).map((d: Record<string, unknown>) => {
            const u = d.users as { display_name?: string; phone?: string } | null;
            return (
              <tr key={String(d.user_id)} className="border-t">
                <td className="px-4 py-2">{u?.display_name ?? '—'}</td>
                <td className="px-4 py-2">{u?.phone ?? '—'}</td>
                <td className="px-4 py-2">{String(d.status)}</td>
                <td className="px-4 py-2">{String(d.authority_expiry ?? '—')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
