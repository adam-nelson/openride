// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';

type Event = 'en-route' | 'arrived' | 'start' | 'complete' | 'cancel';

interface Body {
  trip_id: string;
  event: Event;
  reason?: string;
}

// Allowed source states + the resulting status for each driver-driven event.
const TRANSITIONS: Record<Event, { from: string[]; to: string }> = {
  'en-route': { from: ['assigned'], to: 'driver_en_route' },
  arrived: { from: ['assigned', 'driver_en_route'], to: 'arrived_at_pickup' },
  start: { from: ['arrived_at_pickup'], to: 'in_progress' },
  complete: { from: ['in_progress'], to: 'completed' },
  cancel: { from: ['assigned', 'driver_en_route', 'arrived_at_pickup'], to: 'cancelled' },
};

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['driver']);
    const body = (await req.json()) as Body;
    const def = body?.event ? TRANSITIONS[body.event] : undefined;
    if (!body?.trip_id || !def) return error('trip_id and a valid event are required');

    const { data: trip, error: loadErr } = await ctx.serviceClient
      .from('trips')
      .select('*')
      .eq('id', body.trip_id)
      .maybeSingle();
    if (loadErr) return error(loadErr.message, 500, 'db_error');
    if (!trip) return error('Trip not found', 404);
    const t = trip as any;

    if (t.driver_id !== ctx.userId) return error('Not your trip', 403, 'forbidden');
    if (!def.from.includes(t.status)) {
      return error(`Cannot ${body.event} from status '${t.status}'`, 409, 'bad_state');
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: def.to };
    if (body.event === 'arrived') patch.arrived_at = now;
    if (body.event === 'start') patch.started_at = now;
    if (body.event === 'complete') {
      patch.completed_at = now;
      patch.final_fare_cents = t.estimated_fare_cents; // MVP: final = locked estimate
    }
    if (body.event === 'cancel') {
      patch.cancelled_at = now;
      patch.cancelled_by = 'driver';
      patch.cancel_reason = body.reason ?? null;
    }

    const { data: updated, error: updErr } = await ctx.serviceClient
      .from('trips')
      .update(patch)
      .eq('id', body.trip_id)
      .eq('driver_id', ctx.userId)
      .in('status', def.from)
      .select('*')
      .maybeSingle();
    if (updErr) return error(updErr.message, 500, 'db_error');
    if (!updated) return error('Trip changed; retry', 409, 'conflict');

    await audit(ctx, `trip.${body.event}`, 'trips', body.trip_id, { status: t.status }, updated);

    return json({ ok: true, trip: updated });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
