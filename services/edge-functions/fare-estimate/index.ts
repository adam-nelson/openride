// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, requireCaller } from '../_shared/auth.ts';

interface Body {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  vehicle_type: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req);
    const body = (await req.json()) as Body;

    if (!body?.pickup || !body?.dropoff || !body?.vehicle_type) {
      return error('pickup, dropoff and vehicle_type are required');
    }

    const { data: rule, error: ruleErr } = await ctx.serviceClient
      .from('fare_rules')
      .select('*')
      .eq('vehicle_type', body.vehicle_type)
      .eq('is_active', true)
      .maybeSingle();
    if (ruleErr) return error(ruleErr.message, 500, 'db_error');
    if (!rule) return error(`No active fare rule for ${body.vehicle_type}`, 404);

    const distance_m = haversineM(body.pickup, body.dropoff);
    const duration_s = Math.round(distance_m / 11); // ~40km/h average

    const distanceKm = distance_m / 1000;
    const durationMin = duration_s / 60;
    const r = rule as any;

    const subtotal = Math.max(
      r.minimum_cents,
      r.base_cents + r.booking_fee_cents
        + Math.round(distanceKm * r.per_km_cents)
        + Math.round(durationMin * r.per_min_cents),
    );

    const expires_at = new Date(Date.now() + 60_000).toISOString();
    const { data: estimate, error: estErr } = await ctx.serviceClient
      .from('fare_estimates')
      .insert({
        rider_id: ctx.userId,
        pickup_point: `SRID=4326;POINT(${body.pickup.lng} ${body.pickup.lat})`,
        dropoff_point: `SRID=4326;POINT(${body.dropoff.lng} ${body.dropoff.lat})`,
        vehicle_type: body.vehicle_type,
        distance_m,
        duration_s,
        subtotal_cents: subtotal,
        surcharges_cents: 0,
        total_cents: subtotal,
        fare_rule_id: r.id,
        expires_at,
      })
      .select('id')
      .single();
    if (estErr) return error(estErr.message, 500, 'db_error');

    return json({
      estimate_id: (estimate as any).id,
      distance_m,
      duration_s,
      subtotal_cents: subtotal,
      surcharges_cents: 0,
      total_cents: subtotal,
      expires_at,
    });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}
