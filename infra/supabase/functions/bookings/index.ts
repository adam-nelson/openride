// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';

interface Body {
  type: 'now' | 'scheduled';
  pickup: { lat: number; lng: number };
  pickup_label: string;
  dropoff: { lat: number; lng: number };
  dropoff_label: string;
  vehicle_type: string;
  passenger_count?: number;
  scheduled_pickup_at?: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req);
    const body = (await req.json()) as Body;

    if (!body?.type || !body?.pickup || !body?.dropoff) {
      return error('type, pickup and dropoff are required');
    }
    if (body.type === 'scheduled' && !body.scheduled_pickup_at) {
      return error('scheduled_pickup_at is required for scheduled bookings');
    }

    const pickup = `SRID=4326;POINT(${body.pickup.lng} ${body.pickup.lat})`;
    const dropoff = `SRID=4326;POINT(${body.dropoff.lng} ${body.dropoff.lat})`;

    const { data: booking, error: bookingErr } = await ctx.serviceClient
      .from('bookings')
      .insert({
        rider_id: ctx.userId,
        type: body.type,
        pickup_label: body.pickup_label,
        pickup_point: pickup,
        dropoff_label: body.dropoff_label,
        dropoff_point: dropoff,
        vehicle_type_requested: body.vehicle_type,
        passenger_count: body.passenger_count ?? 1,
        scheduled_pickup_at: body.scheduled_pickup_at,
        notes: body.notes,
        status: 'pending',
      })
      .select('*')
      .single();
    if (bookingErr) return error(bookingErr.message, 500, 'db_error');
    const b = booking as any;

    const tripStatus = body.type === 'scheduled' ? 'scheduled' : 'requested';
    const { data: trip, error: tripErr } = await ctx.serviceClient
      .from('trips')
      .insert({
        booking_id: b.id,
        rider_id: ctx.userId,
        status: tripStatus,
        pickup_point: pickup,
        dropoff_point: dropoff,
        pickup_address: body.pickup_label,
        dropoff_address: body.dropoff_label,
      })
      .select('*')
      .single();
    if (tripErr) return error(tripErr.message, 500, 'db_error');
    const t = trip as any;

    await audit(ctx, 'bookings.created', 'bookings', b.id, null, b);

    // Phase 4: trigger dispatch.assign(trip.id). Not in Sprint 1.

    return json({ booking_id: b.id, trip_id: t.id });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
