// deno-lint-ignore-file no-explicit-any
// Admin refund. Refunds a captured payment (full or partial), updates our
// records, and logs a manual_override (reason required).
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';
import { getStripe, stripeConfigured } from '../_shared/stripe.ts';

interface Body {
  payment_id: string;
  reason: string;
  amount_cents?: number;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['admin', 'operator_owner']);
    if (!stripeConfigured()) return error('Payments are not configured', 503, 'stripe_unconfigured');
    const body = (await req.json()) as Body;
    if (!body?.payment_id) return error('payment_id is required');
    if (!body?.reason || body.reason.trim().length < 5) {
      return error('A reason (min 5 chars) is required for a refund');
    }

    const { data: payment } = await ctx.serviceClient
      .from('payments')
      .select('id, trip_id, amount_cents, status, stripe_payment_intent_id, operator_id')
      .eq('id', body.payment_id)
      .maybeSingle();
    if (!payment) return error('Payment not found', 404);
    const p = payment as any;
    if (!p.stripe_payment_intent_id) return error('Payment has no Stripe charge', 409);
    if (!['captured', 'partially_refunded'].includes(p.status)) {
      return error(`Cannot refund a payment in status '${p.status}'`, 409, 'bad_state');
    }

    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: p.stripe_payment_intent_id,
      amount: body.amount_cents,
      metadata: { openride_payment_id: p.id, reason: body.reason.trim() },
    });

    const isPartial = body.amount_cents != null && body.amount_cents < p.amount_cents;
    await ctx.serviceClient
      .from('payments')
      .update({ status: isPartial ? 'partially_refunded' : 'refunded', refunded_at: new Date().toISOString() })
      .eq('id', p.id);
    if (!isPartial && p.trip_id) {
      await ctx.serviceClient.from('trips').update({ payment_status: 'refunded' }).eq('id', p.trip_id);
    }

    await ctx.serviceClient.from('manual_overrides').insert({
      actor_id: ctx.userId,
      operator_id: p.operator_id,
      override_kind: 'payment.refund',
      target_table: 'payments',
      target_id: p.id,
      reason: body.reason.trim(),
      details: { amount_cents: body.amount_cents ?? p.amount_cents },
    });
    await audit(ctx, 'payment.refunded', 'payments', p.id, payment, null);

    return json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
