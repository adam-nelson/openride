// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';
import { runDispatch } from '../_shared/dispatch.ts';

interface Body {
  trip_id: string;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['driver']);
    const body = (await req.json()) as Body;
    if (!body?.trip_id) return error('trip_id is required');

    const { data: offer, error: offerErr } = await ctx.serviceClient
      .from('trip_offers')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('trip_id', body.trip_id)
      .eq('driver_id', ctx.userId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (offerErr) return error(offerErr.message, 500, 'db_error');
    if (!offer) return error('No pending offer to decline', 409, 'offer_gone');

    await audit(ctx, 'trip.offer.declined', 'trip_offers', (offer as any).id, null, {
      reason: body.reason ?? null,
    });

    // Re-offer to the next eligible driver.
    const dispatch = await runDispatch(ctx.serviceClient, body.trip_id).catch((e: Error) => ({
      status: 'error',
      message: e.message,
    }));
    return json({ ok: true, dispatch });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
