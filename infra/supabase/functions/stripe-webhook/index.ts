// deno-lint-ignore-file no-explicit-any
// Stripe webhook receiver. Verifies the signature, then reconciles our tables
// with Stripe events. verify_jwt is false (Stripe can't send a Supabase JWT);
// the Stripe-Signature header is the auth.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { handleCors, error, json } from '../_shared/cors.ts';
import { getStripe, stripeConfigured, stripeCryptoProvider } from '../_shared/stripe.ts';

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeConfigured() || !secret) {
    return error('Stripe not configured', 503, 'stripe_unconfigured');
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return error('Missing stripe-signature', 400);

  const body = await req.text();
  const stripe = getStripe();

  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, stripeCryptoProvider);
  } catch (e) {
    return error(`Signature verification failed: ${(e as Error).message}`, 400, 'bad_signature');
  }

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Setup-mode checkout: store the default payment method on the rider.
        const session = event.data.object;
        const userId = session.metadata?.openride_user_id;
        const setupIntentId = session.setup_intent;
        if (userId && setupIntentId) {
          const si = await stripe.setupIntents.retrieve(setupIntentId as string);
          const pm = si.payment_method as string | null;
          if (pm) {
            await service
              .from('rider_profiles')
              .update({ default_payment_method_id: pm })
              .eq('user_id', userId);
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const tripId = pi.metadata?.openride_trip_id;
        await service
          .from('payments')
          .update({ status: 'captured', stripe_charge_id: pi.latest_charge, captured_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', pi.id);
        if (tripId) await service.from('trips').update({ payment_status: 'paid' }).eq('id', tripId);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const tripId = pi.metadata?.openride_trip_id;
        await service
          .from('payments')
          .update({
            status: 'failed',
            failure_code: pi.last_payment_error?.code ?? null,
            failure_message: pi.last_payment_error?.message ?? null,
          })
          .eq('stripe_payment_intent_id', pi.id);
        if (tripId) await service.from('trips').update({ payment_status: 'failed' }).eq('id', tripId);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        await service
          .from('payments')
          .update({ status: 'refunded', refunded_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', charge.payment_intent);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    return error(`Handler error: ${(e as Error).message}`, 500, 'handler_error');
  }

  return json({ received: true });
});
