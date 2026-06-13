import { getSupabaseServer } from '@/lib/supabase-server';

export default async function VehiclesPage() {
  const supabase = await getSupabaseServer();
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, rego, make, model, year, vehicle_type, status')
    .order('status', { ascending: true });

  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Vehicles</h1>
      <table className="min-w-full bg-white border rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-sm text-left">
          <tr>
            <th className="px-4 py-2">Rego</th>
            <th className="px-4 py-2">Make / Model</th>
            <th className="px-4 py-2">Year</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {(vehicles ?? []).map((v: Record<string, unknown>) => (
            <tr key={String(v.id)} className="border-t">
              <td className="px-4 py-2">{String(v.rego)}</td>
              <td className="px-4 py-2">{String(v.make)} {String(v.model)}</td>
              <td className="px-4 py-2">{String(v.year)}</td>
              <td className="px-4 py-2">{String(v.vehicle_type)}</td>
              <td className="px-4 py-2">{String(v.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
