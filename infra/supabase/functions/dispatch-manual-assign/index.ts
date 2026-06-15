// deno-lint-ignore-file no-explicit-any
// Dispatcher/admin force-assign: bypass auto-dispatch and put a specific driver
// on a trip. Logged to manual_overrides + audit_logs (reason required).
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';

interface Body {
  trip_id: string;
  driver_id: string;
  reason: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['dispatcher', 'admin', 'operator_owner']);
    const body = (await req.json()) as Body;
    if (!body?.trip_id || !body?.driver_id) return error('trip_id and driver_id are required');
    if (!body?.reason || body.reason.trim().length < 5) {
      return error('A reason (min 5 chars) is required for a manual override');
    }

    // Only assign trips that are still awaiting a driver.
    const { data: trip, error: tripErr } = await ctx.serviceClient
      .from('trips')
      .update({ driver_id: body.driver_id, status: 'assigned', assigned_at: new Date().toISOString() })
      .eq('id', body.trip_id)
      .in('status', ['requested', 'requires_manual_dispatch'])
      .select('*')
      .maybeSingle();
    if (tripErr) return error(tripErr.message, 500, 'db_error');
    if (!trip) return error('Trip is not awaiting assignment', 409, 'bad_state');

    // Retire any outstanding offers for this trip.
    await ctx.serviceClient
      .from('trip_offers')
      .update({ status: 'cancelled' })
      .eq('trip_id', body.trip_id)
      .eq('status', 'pending');

    await ctx.serviceClient.from('manual_overrides').insert({
      actor_id: ctx.userId,
      operator_id: (trip as any).operator_id,
      override_kind: 'dispatch.manual_assign',
      target_table: 'trips',
      target_id: body.trip_id,
      reason: body.reason.trim(),
      details: { driver_id: body.driver_id },
    });
    await audit(ctx, 'dispatch.manual_assign', 'trips', body.trip_id, null, trip);

    return json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
