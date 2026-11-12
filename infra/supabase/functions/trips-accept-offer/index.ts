// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';
import { driverDocumentsAreCompliant, vehicleDocumentsAreCompliant } from '../_shared/compliance.ts';

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

    const { data: driver, error: driverErr } = await ctx.serviceClient
      .from('driver_profiles')
      .select('status, fatigue_locked_until')
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (driverErr) return error(driverErr.message, 500, 'db_error');
    if (!driver || driver.status !== 'approved') return error('Driver not approved', 403, 'not_approved');
    if (driver.fatigue_locked_until && new Date(driver.fatigue_locked_until) > new Date()) {
      return error('Driver is fatigue-locked', 403, 'fatigue_locked');
    }

    let compliant: boolean;
    try {
      compliant = await driverDocumentsAreCompliant(ctx.serviceClient, ctx.userId);
    } catch (e) {
      return error((e as Error).message, 500, 'compliance_check_failed');
    }
    if (!compliant) return error('Required approved, unexpired driver documents are missing', 403, 'compliance_incomplete');

    const { data: shift, error: shiftErr } = await ctx.serviceClient
      .from('driver_status')
      .select('status, vehicle_id')
      .eq('driver_id', ctx.userId)
      .is('ended_at', null)
      .maybeSingle();
    if (shiftErr) return error(shiftErr.message, 500, 'db_error');
    if (!shift || shift.status !== 'online' || !shift.vehicle_id) {
      return error('An online shift with an assigned vehicle is required to accept offers', 409, 'shift_not_online');
    }
    const { data: vehicle, error: vehicleErr } = await ctx.serviceClient
      .from('vehicles')
      .select('status')
      .eq('id', shift.vehicle_id)
      .maybeSingle();
    if (vehicleErr) return error(vehicleErr.message, 500, 'db_error');
    if (!vehicle || vehicle.status !== 'active') return error('Vehicle not active', 403, 'vehicle_inactive');
    let vehicleCompliant: boolean;
    try {
      vehicleCompliant = await vehicleDocumentsAreCompliant(ctx.serviceClient, shift.vehicle_id);
    } catch (e) {
      return error((e as Error).message, 500, 'compliance_check_failed');
    }
    if (!vehicleCompliant) return error('Required approved, unexpired vehicle documents are missing', 403, 'vehicle_compliance_incomplete');

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
