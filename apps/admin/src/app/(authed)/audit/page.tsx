import { getSupabaseServer } from '@/lib/supabase-server';

interface AuditRow {
  id: number;
  actor_role: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const supabase = await getSupabaseServer();

  let query = supabase
    .from('audit_logs')
    .select('id, actor_role, action, target_table, target_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (action) query = query.ilike('action', `%${action}%`);

  const { data, error } = await query;
  if (error) return <p className="text-red-600">{error.message}</p>;
  const rows = (data as AuditRow[]) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Audit log</h1>
      <form className="mb-4">
        <input
          name="action"
          defaultValue={action ?? ''}
          placeholder="Filter by action (e.g. trip., dispatch.)"
          className="border rounded px-3 py-1.5 text-sm w-80"
        />
      </form>
      <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-2">When</th>
            <th className="px-4 py-2">Actor</th>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Target</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                {new Date(r.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-2">{r.actor_role ?? 'system'}</td>
              <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
              <td className="px-4 py-2 text-gray-500">
                {r.target_table}
                {r.target_id ? ` ${r.target_id.slice(0, 8)}` : ''}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                No audit entries.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
