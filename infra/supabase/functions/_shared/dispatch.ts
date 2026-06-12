// deno-lint-ignore-file no-explicit-any
//
// Core dispatch step. Called inline by bookings (on a new 'now' trip) and by
// trips-decline-offer (to advance to the next driver), and over HTTP by the
// dispatch function (cron / manual re-trigger).
//
// One invocation makes at most ONE offer: it clears any expired pending offer
// for the trip, then offers the single nearest eligible driver who has not yet
// been offered this trip. When no candidate remains, the trip is flagged for
// manual dispatch. Advancing through the candidate list happens across
// invocations (decline / timeout re-trigger), which keeps each call cheap and
// avoids holding a worker open for the whole offer loop.

const OFFER_TTL_MS = 15_000;

export interface DispatchResult {
  status: 'offered' | 'manual' | 'pending_exists' | 'skip' | 'error';
  driver_id?: string;
  message?: string;
}

export async function runDispatch(service: any, tripId: string): Promise<DispatchResult> {
  const nowIso = new Date().toISOString();

  // Clear expired pending offers so the unique-pending constraint is free and
  // the timed-out driver is excluded from re-ranking.
  await service
    .from('trip_offers')
    .update({ status: 'timed_out', responded_at: nowIso })
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .lt('responds_by', nowIso);

  const { data: trip, error: tripErr } = await service
    .from('trips')
    .select('id, status')
    .eq('id', tripId)
    .maybeSingle();
  if (tripErr) return { status: 'error', message: tripErr.message };
  if (!trip || trip.status !== 'requested') return { status: 'skip' };

  // Don't double-offer: a live pending offer means we're already waiting.
  const { data: live } = await service
    .from('trip_offers')
    .select('id')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .gt('responds_by', nowIso)
    .maybeSingle();
  if (live) return { status: 'pending_exists' };

  const { data: candidates, error: candErr } = await service.rpc('dispatch_candidates', {
    p_trip_id: tripId,
  });
  if (candErr) return { status: 'error', message: candErr.message };

  if (!candidates || candidates.length === 0) {
    await service
      .from('trips')
      .update({ status: 'requires_manual_dispatch' })
      .eq('id', tripId)
      .eq('status', 'requested');
    return { status: 'manual' };
  }

  const top = candidates[0];
  const { error: offerErr } = await service.from('trip_offers').insert({
    trip_id: tripId,
    driver_id: top.driver_id,
    responds_by: new Date(Date.now() + OFFER_TTL_MS).toISOString(),
    status: 'pending',
    pickup_eta_s: top.pickup_eta_s,
    distance_to_pickup_m: Math.round(top.distance_m),
  });
  if (offerErr) return { status: 'error', message: offerErr.message };

  return { status: 'offered', driver_id: top.driver_id };
}
