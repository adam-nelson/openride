// deno-lint-ignore-file no-explicit-any
// Start adding a card on file. Returns a Stripe Checkout (mode=setup) URL the
// rider opens in a browser — works in Expo Go (no native Stripe SDK needed).
// On completion, the stripe-webhook stores the default payment method.
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, requireCaller } from '../_shared/auth.ts';
import { getStripe, stripeConfigured } from '../_shared/stripe.ts';

interface Body {
  return_url?: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['rider']);
    if (!stripeConfigured()) {
      return error('Payments are not configured on this server yet.', 503, 'stripe_unconfigured');
    }
    const body = (await req.json().catch(() => ({}))) as Body;
    const stripe = getStripe();

    // Find or create the rider's Stripe customer.
    const { data: profile } = await ctx.serviceClient
      .from('rider_profiles')
      .select('stripe_customer_id')
      .eq('user_id', ctx.userId)
      .maybeSingle();

    let customerId = (profile as any)?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const { data: user } = await ctx.serviceClient
        .from('users')
        .select('email, display_name')
        .eq('id', ctx.userId)
        .maybeSingle();
      const customer = await stripe.customers.create({
        email: (user as any)?.email ?? undefined,
        name: (user as any)?.display_name ?? undefined,
        metadata: { openride_user_id: ctx.userId },
      });
      customerId = customer.id;
      await ctx.serviceClient
        .from('rider_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', ctx.userId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: body.return_url ?? 'openride-rider://card-added',
      cancel_url: body.return_url ?? 'openride-rider://card-cancelled',
      metadata: { openride_user_id: ctx.userId },
    });

    return json({ url: session.url });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
