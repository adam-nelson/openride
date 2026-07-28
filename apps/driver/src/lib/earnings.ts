import { supabase } from './supabase';

export interface CompletedTripEarning {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  final_fare_cents: number | null;
  estimated_fare_cents: number | null;
  completed_at: string | null;
}

export interface TodayEarnings {
  cents: number;
  trips: CompletedTripEarning[];
}

function startOfLocalDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Today's completed-trip gross fares for the driver (AUD cents). */
export async function fetchTodayEarnings(driverId: string): Promise<TodayEarnings> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      'id, pickup_address, dropoff_address, final_fare_cents, estimated_fare_cents, completed_at',
    )
    .eq('driver_id', driverId)
    .eq('status', 'completed')
    .gte('completed_at', startOfLocalDayIso())
    .order('completed_at', { ascending: false });

  if (error) throw error;

  const trips = (data as CompletedTripEarning[]) ?? [];
  const cents = trips.reduce(
    (sum, t) => sum + (t.final_fare_cents ?? t.estimated_fare_cents ?? 0),
    0,
  );
  return { cents, trips };
}
