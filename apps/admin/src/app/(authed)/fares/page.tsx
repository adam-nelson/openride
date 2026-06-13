import { FareRulesEditor, type FareRule } from '@/components/FareRulesEditor';
import { getSupabaseServer } from '@/lib/supabase-server';

export default async function FaresPage() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('fare_rules')
    .select('id, name, vehicle_type, base_cents, per_km_cents, per_min_cents, minimum_cents, is_active')
    .order('vehicle_type')
    .order('is_active', { ascending: false });

  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">Fare rules</h1>
      <p className="text-sm text-gray-500 mb-6">
        Rates are per vehicle type. Exactly one rule can be active per type.
      </p>
      <FareRulesEditor initial={(data as FareRule[]) ?? []} />
    </div>
  );
}
