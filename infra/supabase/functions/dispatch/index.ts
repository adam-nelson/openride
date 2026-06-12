// deno-lint-ignore-file no-explicit-any
// HTTP entrypoint for the dispatch engine. Invoked by the cron/timeout backstop
// and for manual re-triggering. The booking and decline functions call
// runDispatch() inline instead of crossing the network.
//
// verify_jwt is false (see config.toml) so internal/cron callers don't need a
// user token; Kong still requires the project apikey. Harden with a shared
// secret before exposing beyond local/trusted callers.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { handleCors, error, json } from '../_shared/cors.ts';
import { runDispatch } from '../_shared/dispatch.ts';

interface Body {
  trip_id: string;
}

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return error('Server misconfigured', 500);

  try {
    const body = (await req.json()) as Body;
    if (!body?.trip_id) return error('trip_id is required');

    const serviceClient = createClient(url, service, { auth: { persistSession: false } });
    const result = await runDispatch(serviceClient, body.trip_id);
    return json(result);
  } catch (e) {
    return error((e as Error).message, 500, 'unexpected');
  }
});
