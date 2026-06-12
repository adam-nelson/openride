// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface CallerContext {
  client: ReturnType<typeof createClient>;
  serviceClient: ReturnType<typeof createClient>;
  userId: string;
  role: string;
}

/**
 * Build two clients:
 *   - `client`: scoped to the caller's JWT. Use for any operation that should
 *     pass through RLS as that user.
 *   - `serviceClient`: service-role. Use for orchestrated writes that span
 *     ownership boundaries (e.g. assigning a trip). Caller MUST re-check
 *     authorisation before any privileged write.
 */
export async function requireCaller(req: Request, allowedRoles?: string[]): Promise<CallerContext> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'Missing bearer token');
  }
  const token = authHeader.slice('bearer '.length);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) throw new HttpError(500, 'Server misconfigured');

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const serviceClient = createClient(url, service, { auth: { persistSession: false } });

  const { data: userResult, error: userErr } = await client.auth.getUser();
  if (userErr || !userResult.user) throw new HttpError(401, 'Invalid token');

  const { data: row, error: rowErr } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', userResult.user.id)
    .maybeSingle();
  if (rowErr) throw new HttpError(500, rowErr.message);
  const role = (row as { role?: string } | null)?.role ?? 'rider';

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new HttpError(403, `Role '${role}' not permitted`);
  }

  return { client, serviceClient, userId: userResult.user.id, role };
}

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
  }
}

export async function audit(
  ctx: { serviceClient: any; userId: string; role: string },
  action: string,
  targetTable: string,
  targetId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await ctx.serviceClient.from('audit_logs').insert({
    actor_id: ctx.userId,
    actor_role: ctx.role,
    action,
    target_table: targetTable,
    target_id: targetId,
    before,
    after,
  });
}
