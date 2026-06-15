import { IncidentResolve } from '@/components/IncidentResolve';
import { getSupabaseServer } from '@/lib/supabase-server';

interface IncidentRow {
  id: string;
  category: string;
  severity: string;
  status: string;
  description: string;
  occurred_at: string;
  trip_id: string | null;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-200 text-red-900',
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-700',
  info: 'bg-gray-100 text-gray-700',
};

export default async function IncidentsPage() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('incident_reports')
    .select('id, category, severity, status, description, occurred_at, trip_id')
    .not('status', 'in', '(resolved,closed)')
    .order('severity', { ascending: false })
    .order('occurred_at', { ascending: false });

  if (error) return <p className="text-red-600">{error.message}</p>;
  const rows = (data as IncidentRow[]) ?? [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4">Incidents</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No open incidents. 🎉</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_STYLE[r.severity] ?? ''}`}>
                    {r.severity}
                  </span>
                  <span className="ml-2 text-sm font-medium">{r.category.replace(/_/g, ' ')}</span>
                  <span className="ml-2 text-xs text-gray-500">{r.status}</span>
                  <p className="text-sm mt-1">{r.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.occurred_at).toLocaleString()}
                    {r.trip_id ? ` · trip ${r.trip_id.slice(0, 8)}` : ''}
                  </p>
                </div>
                <IncidentResolve id={r.id} status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
