// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, operatorOf, requireCaller } from '../_shared/auth.ts';
import { computeFareCents, estimateDurationS, haversineM } from '../_shared/fare.ts';

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
    const duration_s = estimateDurationS(distance_m);
    const total = computeFareCents(rule as any, distance_m, duration_s);

    const expires_at = new Date(Date.now() + 60_000).toISOString();
    const { data: estimate, error: estErr } = await ctx.serviceClient
      .from('fare_estimates')
      .insert({
        rider_id: ctx.userId,
        operator_id: await operatorOf(ctx.serviceClient, ctx.userId),
        pickup_point: `SRID=4326;POINT(${body.pickup.lng} ${body.pickup.lat})`,
        dropoff_point: `SRID=4326;POINT(${body.dropoff.lng} ${body.dropoff.lat})`,
        vehicle_type: body.vehicle_type,
        distance_m,
        duration_s,
        subtotal_cents: total,
        surcharges_cents: 0,
        total_cents: total,
        fare_rule_id: (rule as any).id,
        expires_at,
      })
      .select('id')
      .single();
    if (estErr) return error(estErr.message, 500, 'db_error');

    return json({
      estimate_id: (estimate as any).id,
      distance_m,
      duration_s,
      subtotal_cents: total,
      surcharges_cents: 0,
      total_cents: total,
      expires_at,
    });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
