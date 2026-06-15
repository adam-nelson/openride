// deno-lint-ignore-file no-explicit-any
//
// Capture payment for a completed trip. Off-session charge against the rider's
// saved card. Stripe is loaded lazily so the trip-lifecycle function stays
// light, and the whole step no-ops gracefully when Stripe isn't configured (so
// trip completion still works in keyless local dev — payment stays 'pending').

export interface CaptureResult {
  status: 'captured' | 'requires_action' | 'failed' | 'skipped';
  reason?: string;
}

export async function captureForTrip(service: any, tripId: string): Promise<CaptureResult> {
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return { status: 'skipped', reason: 'stripe_unconfigured' };

  const { data: trip } = await service
    .from('trips')
    .select('id, rider_id, driver_id, final_fare_cents, payment_status, operator_id')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return { status: 'skipped', reason: 'trip_not_found' };
  if (trip.payment_status === 'paid') return { status: 'captured', reason: 'already_paid' };
  if (!trip.final_fare_cents || trip.final_fare_cents <= 0) {
    return { status: 'skipped', reason: 'no_fare' };
  }

  const { data: rider } = await service
    .from('rider_profiles')
    .select('stripe_customer_id, default_payment_method_id')
    .eq('user_id', trip.rider_id)
    .maybeSingle();
  if (!rider?.stripe_customer_id || !rider?.default_payment_method_id) {
    return { status: 'skipped', reason: 'no_card_on_file' };
  }

  const { getStripe } = await import('./stripe.ts');
  const stripe = getStripe();

  // Idempotency keyed on the trip so retries don't double-charge.
  const intent = await stripe.paymentIntents.create(
    {
      amount: trip.final_fare_cents,
      currency: 'aud',
      customer: rider.stripe_customer_id,
      payment_method: rider.default_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: { openride_trip_id: tripId },
    },
    { idempotencyKey: `trip-${tripId}` },
  ).catch((e: any) => ({ __error: e }));

  if ((intent as any).__error) {
    const err = (intent as any).__error;
    await upsertPayment(service, trip, {
      stripe_payment_intent_id: err?.raw?.payment_intent?.id ?? null,
      status: 'failed',
      failure_code: err?.code ?? null,
      failure_message: err?.message ?? 'charge failed',
    });
    await service.from('trips').update({ payment_status: 'failed' }).eq('id', tripId);
    return { status: 'failed', reason: err?.message };
  }

  const pi = intent as any;
  const captured = pi.status === 'succeeded';
  await upsertPayment(service, trip, {
    stripe_payment_intent_id: pi.id,
    stripe_charge_id: pi.latest_charge ?? null,
    status: captured ? 'captured' : 'requires_action',
    captured_at: captured ? new Date().toISOString() : null,
  });
  await service
    .from('trips')
    .update({ payment_status: captured ? 'paid' : 'authorised' })
    .eq('id', tripId);

  return { status: captured ? 'captured' : 'requires_action' };
}

async function upsertPayment(service: any, trip: any, fields: Record<string, unknown>): Promise<void> {
  await service.from('payments').upsert(
    {
      trip_id: trip.id,
      rider_id: trip.rider_id,
      driver_id: trip.driver_id,
      operator_id: trip.operator_id,
      amount_cents: trip.final_fare_cents,
      currency: 'AUD',
      ...fields,
    },
    { onConflict: 'trip_id' },
  );
}
