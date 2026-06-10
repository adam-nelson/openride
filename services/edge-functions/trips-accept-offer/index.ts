// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';

interface Body {
  trip_id: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['driver']);
    const body = (await req.json()) as Body;
    if (!body?.trip_id) return error('trip_id is required');

    // Concurrency-safe accept: only succeeds if the offer is still pending and
    // the trip hasn't already been assigned.
    const { data: offer, error: offerErr } = await ctx.serviceClient
      .from('trip_offers')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('trip_id', body.trip_id)
      .eq('driver_id', ctx.userId)
      .eq('status', 'pending')
      .gt('responds_by', new Date().toISOString())
      .select('*')
      .maybeSingle();
    if (offerErr) return error(offerErr.message, 500, 'db_error');
    if (!offer) return error('Offer no longer available', 409, 'offer_gone');

    const { data: trip, error: tripErr } = await ctx.serviceClient
      .from('trips')
      .update({
        driver_id: ctx.userId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      })
      .eq('id', body.trip_id)
      .eq('status', 'requested')
      .select('*')
      .maybeSingle();
    if (tripErr) return error(tripErr.message, 500, 'db_error');
    if (!trip) {
      // Roll back the offer
      await ctx.serviceClient
        .from('trip_offers')
        .update({ status: 'cancelled' })
        .eq('id', (offer as any).id);
      return error('Trip no longer requested', 409, 'trip_gone');
    }

    await audit(ctx, 'trip.assigned', 'trips', (trip as any).id, null, trip);

    return json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
