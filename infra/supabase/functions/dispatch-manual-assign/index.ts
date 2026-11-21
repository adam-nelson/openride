// deno-lint-ignore-file no-explicit-any
// Dispatcher/admin force-assign: bypass auto-dispatch and put a specific driver
// on a trip. Logged to manual_overrides + audit_logs (reason required).
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';
import { driverDocumentsAreCompliant, vehicleDocumentsAreCompliant } from '../_shared/compliance.ts';

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

    const { data: driver, error: driverErr } = await ctx.serviceClient
      .from('driver_profiles')
      .select('status, fatigue_locked_until, operator_id')
      .eq('user_id', body.driver_id)
      .maybeSingle();
    if (driverErr) return error(driverErr.message, 500, 'db_error');
    if (!driver || driver.status !== 'approved') return error('Driver not approved', 403, 'not_approved');
    if (driver.fatigue_locked_until && new Date(driver.fatigue_locked_until) > new Date()) {
      return error('Driver is fatigue-locked', 403, 'fatigue_locked');
    }

    const { data: tripContext, error: tripContextErr } = await ctx.serviceClient
      .from('trips')
      .select('operator_id')
      .eq('id', body.trip_id)
      .maybeSingle();
    if (tripContextErr) return error(tripContextErr.message, 500, 'db_error');
    if (!tripContext) return error('Trip not found', 404);
    if (driver.operator_id !== tripContext.operator_id) {
      return error('Driver belongs to a different operator', 403, 'operator_mismatch');
    }

    let compliant: boolean;
    try {
      compliant = await driverDocumentsAreCompliant(ctx.serviceClient, body.driver_id);
    } catch (e) {
      return error((e as Error).message, 500, 'compliance_check_failed');
    }
    if (!compliant) return error('Required approved, unexpired driver documents are missing', 403, 'compliance_incomplete');

    const { data: shift, error: shiftErr } = await ctx.serviceClient
      .from('driver_status')
      .select('vehicle_id')
      .eq('driver_id', body.driver_id)
      .is('ended_at', null)
      .maybeSingle();
    if (shiftErr) return error(shiftErr.message, 500, 'db_error');
    let vehicleId = shift?.vehicle_id ?? null;
    if (!vehicleId) {
      const { data: defaultVehicle, error: vehicleErr } = await ctx.serviceClient
        .from('vehicles')
        .select('id')
        .eq('default_driver_id', body.driver_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (vehicleErr) return error(vehicleErr.message, 500, 'db_error');
      vehicleId = defaultVehicle?.id ?? null;
    }
    if (!vehicleId) return error('Driver has no active assigned vehicle', 409, 'vehicle_unavailable');
    const { data: vehicle, error: vehicleErr } = await ctx.serviceClient
      .from('vehicles')
      .select('status, operator_id')
      .eq('id', vehicleId)
      .maybeSingle();
    if (vehicleErr) return error(vehicleErr.message, 500, 'db_error');
    if (!vehicle || vehicle.status !== 'active') return error('Vehicle not active', 403, 'vehicle_inactive');
    if (vehicle.operator_id !== tripContext.operator_id) {
      return error('Vehicle belongs to a different operator', 403, 'operator_mismatch');
    }
    let vehicleCompliant: boolean;
    try {
      vehicleCompliant = await vehicleDocumentsAreCompliant(ctx.serviceClient, vehicleId);
    } catch (e) {
      return error((e as Error).message, 500, 'compliance_check_failed');
    }
    if (!vehicleCompliant) return error('Required approved, unexpired vehicle documents are missing', 403, 'vehicle_compliance_incomplete');

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
