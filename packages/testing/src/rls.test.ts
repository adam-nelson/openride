// RLS security suite. Authenticates as each demo role against a running local
// Supabase and asserts the isolation guarantees. Skips entirely when the stack
// is unreachable so `pnpm test` stays green without infra; CI boots Supabase
// and runs it for real.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

import { fixtures } from './fixtures';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const PASSWORD = 'demo-password-change-me';

// Seeded trips (see infra/supabase/seed.sql): one belongs to Rita, one to Roman.
const RITA_TRIP = '55555555-5555-5555-5555-555555555501';
const ROMAN_TRIP = '55555555-5555-5555-5555-555555555502';

function anonClient(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

async function signInEmail(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

async function signInPhone(phone: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.verifyOtp({ phone, token: '123456', type: 'sms' });
  if (error) throw error;
  return c;
}

let reachable = false;
beforeAll(async () => {
  try {
    const res = await fetch(`${URL}/auth/v1/health`, { signal: AbortSignal.timeout(3000) });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    console.warn(`[rls] Supabase not reachable at ${URL} — skipping RLS suite.`);
  }
});

describe('RLS isolation', () => {
  it('anon cannot read trips', async () => {
    if (!reachable) return;
    const { data } = await anonClient().from('trips').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('a rider sees only their own trips', async () => {
    if (!reachable) return;
    const rita = await signInPhone(fixtures.users.riders[0].phone);
    const { data } = await rita.from('trips').select('id');
    const ids = (data ?? []).map((r) => r.id as string);
    expect(ids).toContain(RITA_TRIP);
    expect(ids).not.toContain(ROMAN_TRIP);
  });

  it('a rider cannot directly insert a trip (must go through the edge fn)', async () => {
    if (!reachable) return;
    const rita = await signInPhone(fixtures.users.riders[0].phone);
    const { data: me } = await rita.auth.getUser();
    const { error } = await rita.from('trips').insert({
      booking_id: '00000000-0000-0000-0000-000000000000',
      rider_id: me.user!.id,
      status: 'requested',
      pickup_point: 'SRID=4326;POINT(151 -33)',
      dropoff_point: 'SRID=4326;POINT(151 -33)',
      pickup_address: 'x',
      dropoff_address: 'y',
    } as never);
    expect(error).not.toBeNull();
  });

  it('a rider cannot escalate their own role', async () => {
    if (!reachable) return;
    const rita = await signInPhone(fixtures.users.riders[0].phone);
    const { data: me } = await rita.auth.getUser();
    await rita.from('users').update({ role: 'admin' } as never).eq('id', me.user!.id);
    // Re-read: role must be unchanged.
    const { data } = await rita.from('users').select('role').eq('id', me.user!.id).maybeSingle();
    expect((data as { role?: string } | null)?.role).toBe('rider');
  });

  it('a driver cannot read audit logs; an admin can', async () => {
    if (!reachable) return;
    const drew = await signInPhone(fixtures.users.drivers[0].phone);
    const { data: asDriver } = await drew.from('audit_logs').select('id').limit(1);
    expect(asDriver ?? []).toHaveLength(0);

    const admin = await signInEmail(fixtures.users.admin.email);
    const { error: adminErr } = await admin.from('audit_logs').select('id').limit(1);
    expect(adminErr).toBeNull();
  });

  it('staff (dispatcher) can read all trips', async () => {
    if (!reachable) return;
    const disp = await signInEmail(fixtures.users.dispatcher.email);
    const { data } = await disp.from('trips').select('id');
    const ids = (data ?? []).map((r) => r.id as string);
    expect(ids).toContain(RITA_TRIP);
    expect(ids).toContain(ROMAN_TRIP);
  });

  it('a driver cannot read another driver profile', async () => {
    if (!reachable) return;
    const drew = await signInPhone(fixtures.users.drivers[0].phone);
    const { data } = await drew
      .from('driver_profiles')
      .select('user_id')
      .eq('user_id', fixtures.users.drivers[1].id);
    expect(data ?? []).toHaveLength(0);
  });
});
