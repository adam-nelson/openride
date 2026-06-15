// deno-lint-ignore-file no-explicit-any
import { handleCors, error, json } from '../_shared/cors.ts';
import { HttpError, audit, requireCaller } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ctx = await requireCaller(req, ['driver']);

    // Close any open shift for this driver.
    const { data: closed, error: closeErr } = await ctx.serviceClient
      .from('driver_status')
      .update({ status: 'offline', ended_at: new Date().toISOString() })
      .eq('driver_id', ctx.userId)
      .is('ended_at', null)
      .select('id')
      .maybeSingle();
    if (closeErr) return error(closeErr.message, 500, 'db_error');

    if (closed) {
      await audit(ctx, 'driver.offline', 'driver_status', (closed as any).id, null, null);
    }

    // Close the open fatigue session (unless a lockout already ended it).
    await ctx.serviceClient
      .from('fatigue_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('driver_id', ctx.userId)
      .is('ended_at', null);

    return json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status, e.code);
    return error((e as Error).message, 500, 'unexpected');
  }
});
