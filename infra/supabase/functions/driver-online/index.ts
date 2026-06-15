// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, operatorOf, requireCaller } from '../_shared/auth.ts';

interface Body {
  vehicle_id: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['driver']);
    const body = (await req.json()) as Body;
    if (!body?.vehicle_id) return error('vehicle_id is required');

    const { data: driver, error: dErr } = await ctx.serviceClient
      .from('driver_profiles')
      .select('user_id, status, fatigue_locked_until')
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (dErr) return error(dErr.message, 500, 'db_error');
    if (!driver) return error('Driver profile not found', 404);
    const d = driver as any;
    if (d.status !== 'approved') return error('Driver not approved', 403, 'not_approved');
    if (d.fatigue_locked_until && new Date(d.fatigue_locked_until) > new Date()) {
      return error('Driver is fatigue-locked', 403, 'fatigue_locked');
    }

    const { data: vehicle, error: vErr } = await ctx.serviceClient
      .from('vehicles')
      .select('id, status')
      .eq('id', body.vehicle_id)
      .maybeSingle();
    if (vErr) return error(vErr.message, 500, 'db_error');
    if (!vehicle || (vehicle as any).status !== 'active') {
      return error('Vehicle not active', 400, 'vehicle_inactive');
    }

    // Close any open shift first (idempotent)
    await ctx.serviceClient
      .from('driver_status')
      .update({ ended_at: new Date().toISOString() })
      .eq('driver_id', ctx.userId)
      .is('ended_at', null);

    const operatorId = await operatorOf(ctx.serviceClient, ctx.userId);
    const { data: shift, error: sErr } = await ctx.serviceClient
      .from('driver_status')
      .insert({
        driver_id: ctx.userId,
        operator_id: operatorId,
        status: 'online',
        vehicle_id: body.vehicle_id,
      })
      .select('*')
      .single();
    if (sErr) return error(sErr.message, 500, 'db_error');

    await audit(ctx, 'driver.online', 'driver_status', (shift as any).id, null, shift);

    // Open a fatigue session for the shift if none is open. Drive time
    // accumulates here on trip completion; lockout is enforced by trigger.
    const { data: openSession } = await ctx.serviceClient
      .from('fatigue_sessions')
      .select('id')
      .eq('driver_id', ctx.userId)
      .is('ended_at', null)
      .maybeSingle();
    if (!openSession) {
      await ctx.serviceClient
        .from('fatigue_sessions')
        .insert({ driver_id: ctx.userId, operator_id: operatorId });
    }

    return json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
