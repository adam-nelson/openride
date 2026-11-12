// RLS security suite. Authenticates as each demo role against a running local
// Supabase and asserts the isolation guarantees. Skips entirely when the stack
// is unreachable so `pnpm test` stays green without infra; CI boots Supabase
// and runs it for real.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fixtures } from './fixtures';
import { assertLocalSupabaseUrl } from './local-supabase';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const PASSWORD = 'demo-password-change-me';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPLIANCE_DRIVER = fixtures.users.drivers[2];
const OTHER_DRIVER = fixtures.users.drivers[1];
const COMPLIANCE_TEST_PATH = 'compliance-security-tests/';
const COMPLIANCE_TEST_VEHICLE = fixtures.vehicles[2];

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
let serviceClient: SupabaseClient | null = null;
beforeAll(async () => {
  assertLocalSupabaseUrl(URL);
  try {
    const res = await fetch(`${URL}/auth/v1/health`, { signal: AbortSignal.timeout(3000) });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    console.warn(`[rls] Supabase not reachable at ${URL} — skipping RLS suite.`);
    return;
  }
  if (SERVICE_ROLE) {
    serviceClient = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } });
    await cleanupComplianceDocuments();
  }
});

afterAll(async () => {
  await cleanupComplianceDocuments();
});

async function cleanupComplianceDocuments(): Promise<void> {
  if (!serviceClient) return;
  const [driverCleanup, vehicleCleanup] = await Promise.all([
    serviceClient
    .from('driver_documents')
    .delete()
    .eq('driver_id', COMPLIANCE_DRIVER.id)
    .like('storage_path', `${COMPLIANCE_TEST_PATH}%`),
    serviceClient
    .from('vehicle_documents')
    .delete()
    .eq('vehicle_id', COMPLIANCE_TEST_VEHICLE.id)
    .like('storage_path', `${COMPLIANCE_TEST_PATH}%`),
  ]);
  if (driverCleanup.error) throw driverCleanup.error;
  if (vehicleCleanup.error) throw vehicleCleanup.error;
}

function skipIfSupabaseUnavailable(skip: (reason?: string) => void): void {
  if (!reachable) skip('Supabase integration environment is unavailable');
}

function skipIfComplianceSetupUnavailable(skip: (reason?: string) => void): void {
  skipIfSupabaseUnavailable(skip);
  if (!serviceClient) skip('SUPABASE_SERVICE_ROLE_KEY is required for isolated compliance integration tests');
}

describe('RLS isolation', () => {
  it('anon cannot read trips', async ({ skip }) => {
    skipIfSupabaseUnavailable(skip);
    const { data } = await anonClient().from('trips').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('a rider sees only their own trips', async ({ skip }) => {
    skipIfSupabaseUnavailable(skip);
    const rita = await signInPhone(fixtures.users.riders[0].phone);
    const { data } = await rita.from('trips').select('id');
    const ids = (data ?? []).map((r) => r.id as string);
    expect(ids).toContain(RITA_TRIP);
    expect(ids).not.toContain(ROMAN_TRIP);
  });

  it('a rider cannot directly insert a trip (must go through the edge fn)', async ({ skip }) => {
    skipIfSupabaseUnavailable(skip);
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

  it('a rider cannot escalate their own role', async ({ skip }) => {
    skipIfSupabaseUnavailable(skip);
    const rita = await signInPhone(fixtures.users.riders[0].phone);
    const { data: me } = await rita.auth.getUser();
    await rita.from('users').update({ role: 'admin' } as never).eq('id', me.user!.id);
    // Re-read: role must be unchanged.
    const { data } = await rita.from('users').select('role').eq('id', me.user!.id).maybeSingle();
    expect((data as { role?: string } | null)?.role).toBe('rider');
  });

  it('a driver cannot read audit logs; an admin can', async ({ skip }) => {
    skipIfSupabaseUnavailable(skip);
    const drew = await signInPhone(fixtures.users.drivers[0].phone);
    const { data: asDriver } = await drew.from('audit_logs').select('id').limit(1);
    expect(asDriver ?? []).toHaveLength(0);

    const admin = await signInEmail(fixtures.users.admin.email);
    const { error: adminErr } = await admin.from('audit_logs').select('id').limit(1);
    expect(adminErr).toBeNull();
  });

  it('staff (dispatcher) can read all trips', async ({ skip }) => {
    skipIfSupabaseUnavailable(skip);
    const disp = await signInEmail(fixtures.users.dispatcher.email);
    const { data } = await disp.from('trips').select('id');
    const ids = (data ?? []).map((r) => r.id as string);
    expect(ids).toContain(RITA_TRIP);
    expect(ids).toContain(ROMAN_TRIP);
  });

  it('a driver cannot read another driver profile', async ({ skip }) => {
    skipIfSupabaseUnavailable(skip);
    const drew = await signInPhone(fixtures.users.drivers[0].phone);
    const { data } = await drew
      .from('driver_profiles')
      .select('user_id')
      .eq('user_id', fixtures.users.drivers[1].id);
    expect(data ?? []).toHaveLength(0);
  });
});

describe('driver document security', () => {
  it('blocks self-approval through direct INSERT and UPDATE', async ({ skip }) => {
    skipIfComplianceSetupUnavailable(skip);
    const driver = await signInPhone(COMPLIANCE_DRIVER.phone);

    const directInsert = await driver.from('driver_documents').insert({
      driver_id: COMPLIANCE_DRIVER.id,
      doc_type: 'other',
      storage_path: `${COMPLIANCE_TEST_PATH}direct-approved`,
      status: 'approved',
    } as never).select('id');
    expect(directInsert.error !== null || (directInsert.data ?? []).length === 0).toBe(true);

    const directPendingInsert = await driver.from('driver_documents').insert({
      driver_id: COMPLIANCE_DRIVER.id,
      doc_type: 'other',
      storage_path: `${COMPLIANCE_TEST_PATH}direct-pending`,
      status: 'pending',
    } as never).select('id');
    expect(directPendingInsert.error !== null || (directPendingInsert.data ?? []).length === 0).toBe(true);

    const submission = await driver.rpc('submit_driver_document', {
      p_doc_type: 'other',
      p_storage_path: `${COMPLIANCE_TEST_PATH}pending-self-approval`,
      p_issued_on: null,
      p_expires_on: null,
    });
    expect(submission.error).toBeNull();
    const documentId = submission.data as string;

    const directUpdate = await driver
      .from('driver_documents')
      .update({ status: 'approved', reviewer_id: fixtures.users.admin.id, review_notes: 'forged' })
      .eq('id', documentId)
      .select('id');
    expect(directUpdate.error !== null || (directUpdate.data ?? []).length === 0).toBe(true);

    const directRenewal = await driver
      .from('driver_documents')
      .update({ status: 'pending', expires_on: '2027-01-01' })
      .eq('id', documentId)
      .select('id');
    expect(directRenewal.error !== null || (directRenewal.data ?? []).length === 0).toBe(true);

    const stillPending = await driver.from('driver_documents').select('status, reviewer_id').eq('id', documentId).single();
    expect(stillPending.data).toEqual({ status: 'pending', reviewer_id: null });

    const selfReview = await driver.rpc('review_driver_document', {
      p_document_id: documentId,
      p_status: 'approved',
      p_review_notes: null,
    });
    expect(selfReview.error).not.toBeNull();

    const admin = await signInEmail(fixtures.users.admin.email);
    const { data: reviewer } = await admin.auth.getUser();
    const approved = await admin.rpc('review_driver_document', {
      p_document_id: documentId,
      p_status: 'approved',
      p_review_notes: 'Reviewed for RLS test',
    });
    expect(approved.error).toBeNull();
    const reviewed = await admin
      .from('driver_documents')
      .select('status, reviewer_id')
      .eq('id', documentId)
      .single();
    expect(reviewed.data).toEqual({ status: 'approved', reviewer_id: reviewer.user!.id });
  });

  it('does not allow a driver to modify another driver\'s document', async ({ skip }) => {
    skipIfComplianceSetupUnavailable(skip);
    const admin = await signInEmail(fixtures.users.admin.email);
    const { data: otherDocument, error: lookupError } = await admin
      .from('driver_documents')
      .select('id, status')
      .eq('driver_id', OTHER_DRIVER.id)
      .limit(1)
      .single();
    expect(lookupError).toBeNull();
    expect(otherDocument).not.toBeNull();

    const driver = await signInPhone(COMPLIANCE_DRIVER.phone);
    const attemptedUpdate = await driver
      .from('driver_documents')
      .update({ status: 'rejected' })
      .eq('id', otherDocument!.id)
      .select('id');
    expect(attemptedUpdate.error !== null || (attemptedUpdate.data ?? []).length === 0).toBe(true);

    const unchanged = await admin.from('driver_documents').select('status').eq('id', otherDocument!.id).single();
    expect(unchanged.data?.status).toBe(otherDocument!.status);
  });

  it('keeps submissions and renewals pending until an authorized reviewer acts', async ({ skip }) => {
    skipIfComplianceSetupUnavailable(skip);
    const driver = await signInPhone(COMPLIANCE_DRIVER.phone);
    const first = await driver.rpc('submit_driver_document', {
      p_doc_type: 'other',
      p_storage_path: `${COMPLIANCE_TEST_PATH}renewal-first`,
      p_issued_on: null,
      p_expires_on: null,
    });
    const renewal = await driver.rpc('submit_driver_document', {
      p_doc_type: 'other',
      p_storage_path: `${COMPLIANCE_TEST_PATH}renewal-second`,
      p_issued_on: null,
      p_expires_on: null,
    });
    expect(first.error).toBeNull();
    expect(renewal.error).toBeNull();
    expect(renewal.data).toBe(first.data);

    const pending = await driver
      .from('driver_documents')
      .select('status, reviewer_id, review_notes, created_at')
      .eq('id', first.data as string)
      .single();
    expect(pending.data).toMatchObject({ status: 'pending', reviewer_id: null, review_notes: null });
    expect(pending.data?.created_at).toBeTruthy();

    const forgedTimestamp = await driver
      .from('driver_documents')
      .update({ created_at: '2000-01-01T00:00:00.000Z', status: 'pending' })
      .eq('id', first.data as string)
      .select('created_at')
      .maybeSingle();
    expect(forgedTimestamp.error !== null || forgedTimestamp.data === null).toBe(true);
    const unchangedTimestamp = await driver
      .from('driver_documents')
      .select('created_at')
      .eq('id', first.data as string)
      .single();
    expect(unchangedTimestamp.data?.created_at).toBe(pending.data?.created_at);
  });

  it('preserves the operator-admin review path used by the admin app', async ({ skip }) => {
    skipIfComplianceSetupUnavailable(skip);
    const driver = await signInPhone(COMPLIANCE_DRIVER.phone);
    const { data: documentId, error: submissionError } = await driver.rpc('submit_driver_document', {
      p_doc_type: 'medical_cert',
      p_storage_path: `${COMPLIANCE_TEST_PATH}admin-screen-review`,
      p_issued_on: null,
      p_expires_on: null,
    });
    expect(submissionError).toBeNull();

    const admin = await signInEmail(fixtures.users.admin.email);
    const { data: reviewer } = await admin.auth.getUser();
    const { data: updated, error: reviewError } = await admin
      .from('driver_documents')
      .update({ status: 'approved', reviewer_id: reviewer.user!.id, review_notes: null })
      .eq('id', documentId as string)
      .select('status, reviewer_id')
      .single();
    expect(reviewError).toBeNull();
    expect(updated).toEqual({ status: 'approved', reviewer_id: reviewer.user!.id });
  });

  it('blocks missing, pending, rejected, and expired requirements and accepts complete current documents', async ({ skip }) => {
    skipIfComplianceSetupUnavailable(skip);
    const driver = await signInPhone(COMPLIANCE_DRIVER.phone);
    const admin = await signInEmail(fixtures.users.admin.email);
    const { data: operator } = await driver
      .from('operators')
      .select('country, state')
      .eq('id', fixtures.operator.id)
      .single();
    expect(operator).not.toBeNull();

    let rulesQuery = driver
      .from('compliance_rules')
      .select('doc_type, state')
      .eq('operator_id', fixtures.operator.id)
      .eq('country', operator!.country)
      .eq('applies_to', 'driver')
      .eq('is_required', true);
    rulesQuery = operator!.state ? rulesQuery.or(`state.is.null,state.eq.${operator!.state}`) : rulesQuery.is('state', null);
    const { data: rules, error: rulesError } = await rulesQuery;
    expect(rulesError).toBeNull();
    const requiredTypes = [...new Set((rules ?? []).map((rule) => rule.doc_type))];
    if (requiredTypes.length === 0) skip();

    const compliance = async () => driver.rpc('driver_documents_compliant', { p_driver_id: COMPLIANCE_DRIVER.id });
    expect((await compliance()).data).toBe(false);

    const expiresSoon = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const pastExpiry = '2000-01-01';
    const submit = async (docType: string, suffix: string, expiresOn: string) => {
      const { data, error } = await driver.rpc('submit_driver_document', {
        p_doc_type: docType as never,
        p_storage_path: `${COMPLIANCE_TEST_PATH}${suffix}`,
        p_issued_on: null,
        p_expires_on: expiresOn,
      });
      expect(error).toBeNull();
      return data as string;
    };
    const review = async (documentId: string, status: 'approved' | 'rejected') => {
      const { error } = await admin.rpc('review_driver_document', {
        p_document_id: documentId,
        p_status: status,
        p_review_notes: 'Compliance test review',
      });
      expect(error).toBeNull();
    };

    const firstType = requiredTypes[0];
    const pendingId = await submit(firstType, 'required-pending', expiresSoon);
    expect((await compliance()).data).toBe(false);
    await review(pendingId, 'rejected');
    expect((await compliance()).data).toBe(false);

    const currentId = await submit(firstType, 'required-current', expiresSoon);
    await review(currentId, 'approved');
    expect((await compliance()).data).toBe(false);

    const expireCurrent = await serviceClient!
      .from('driver_documents')
      .update({ expires_on: pastExpiry })
      .eq('id', currentId);
    expect(expireCurrent.error).toBeNull();
    expect((await compliance()).data).toBe(false);
    const renewCurrent = await serviceClient!
      .from('driver_documents')
      .update({ expires_on: expiresSoon })
      .eq('id', currentId);
    expect(renewCurrent.error).toBeNull();

    for (const [index, docType] of requiredTypes.slice(1).entries()) {
      const documentId = await submit(docType, `required-${index}`, expiresSoon);
      await review(documentId, 'approved');
    }
    expect((await compliance()).data).toBe(true);
  });

  it('applies the same approval and expiry policy to configured vehicle requirements', async ({ skip }) => {
    skipIfComplianceSetupUnavailable(skip);
    const service = serviceClient!;
    const { data: operator } = await service
      .from('operators')
      .select('country, state')
      .eq('id', fixtures.operator.id)
      .single();
    expect(operator).not.toBeNull();

    let rulesQuery = service
      .from('compliance_rules')
      .select('doc_type, state')
      .eq('operator_id', fixtures.operator.id)
      .eq('country', operator!.country)
      .eq('applies_to', 'vehicle')
      .eq('is_required', true);
    rulesQuery = operator!.state ? rulesQuery.or(`state.is.null,state.eq.${operator!.state}`) : rulesQuery.is('state', null);
    const { data: rules, error: rulesError } = await rulesQuery;
    expect(rulesError).toBeNull();
    const requiredTypes = [...new Set((rules ?? []).map((rule) => rule.doc_type))];
    if (requiredTypes.length === 0) skip();

    const compliance = async () =>
      service.rpc('vehicle_documents_compliant', { p_vehicle_id: COMPLIANCE_TEST_VEHICLE.id });
    expect((await compliance()).data).toBe(false);

    const expiresSoon = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const pastExpiry = '2000-01-01';
    const save = async (docType: string, suffix: string, status: 'pending' | 'rejected' | 'approved', expiresOn: string) => {
      const { error } = await service.from('vehicle_documents').insert({
        vehicle_id: COMPLIANCE_TEST_VEHICLE.id,
        operator_id: fixtures.operator.id,
        doc_type: docType as never,
        storage_path: `${COMPLIANCE_TEST_PATH}${suffix}`,
        status,
        expires_on: expiresOn,
      } as never);
      expect(error).toBeNull();
    };

    const firstType = requiredTypes[0];
    await save(firstType, 'vehicle-pending', 'pending', expiresSoon);
    expect((await compliance()).data).toBe(false);
    await service.from('vehicle_documents').delete().eq('vehicle_id', COMPLIANCE_TEST_VEHICLE.id).like('storage_path', `${COMPLIANCE_TEST_PATH}vehicle-pending`);
    await save(firstType, 'vehicle-rejected', 'rejected', expiresSoon);
    expect((await compliance()).data).toBe(false);
    await service.from('vehicle_documents').delete().eq('vehicle_id', COMPLIANCE_TEST_VEHICLE.id).like('storage_path', `${COMPLIANCE_TEST_PATH}vehicle-rejected`);
    await save(firstType, 'vehicle-expired', 'approved', pastExpiry);
    expect((await compliance()).data).toBe(false);
    await service.from('vehicle_documents').delete().eq('vehicle_id', COMPLIANCE_TEST_VEHICLE.id).like('storage_path', `${COMPLIANCE_TEST_PATH}vehicle-expired`);

    await save(firstType, 'vehicle-current-0', 'approved', expiresSoon);
    for (const [index, docType] of requiredTypes.slice(1).entries()) {
      await save(docType, `vehicle-current-${index + 1}`, 'approved', expiresSoon);
    }
    expect((await compliance()).data).toBe(true);
  });
});
