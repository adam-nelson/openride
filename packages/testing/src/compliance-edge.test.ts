import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fixtures } from './fixtures';
import { assertLocalSupabaseUrl } from './local-supabase';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_DRIVER = fixtures.users.drivers[0];
const OTHER_DRIVERS = fixtures.users.drivers.slice(1);
const TEST_VEHICLE = fixtures.vehicles[0];
const TEST_RIDER = fixtures.users.riders[0];
const TEST_PATH = 'edge-compliance-tests/';
const POINT = 'SRID=4326;POINT(151.179 -33.898)';

interface EdgeError {
  error?: { code?: string; message?: string };
}

interface DispatchBody {
  status?: string;
  driver_id?: string;
}

let service: SupabaseClient | null = null;
let driverToken: string | null = null;
let adminToken: string | null = null;
let edgeAvailable = false;
let driverSnapshot: Record<string, unknown> | null = null;
let otherDriverSnapshots: { user_id: string; status: string }[] = [];
let documentSnapshots: Record<string, unknown>[] = [];
let originalLocation: Record<string, unknown> | null = null;
let locationWasPresent = false;
let testVehicleOriginalStatus: string | null = null;
let shiftId: string | null = null;
let createdBookingIds: string[] = [];
let createdTripIds: string[] = [];
let setupStarted = false;

async function jsonRequest(url: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const response = await fetch(url, init);
  return { status: response.status, body: await response.json() };
}

async function postFunction(
  name: string,
  body: object,
  accessToken?: string,
): Promise<{ status: number; body: any }> {
  return jsonRequest(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function createRequestedTrip(label: string): Promise<string> {
  const client = service!;
  const bookingId = randomUUID();
  const tripId = randomUUID();
  const booking = await client.from('bookings').insert({
    id: bookingId,
    operator_id: fixtures.operator.id,
    rider_id: TEST_RIDER.id,
    type: 'now',
    pickup_label: `Compliance test ${label}`,
    pickup_point: POINT,
    dropoff_label: `Compliance destination ${label}`,
    dropoff_point: POINT,
    vehicle_type_requested: 'sedan',
    status: 'active',
  });
  if (booking.error) throw booking.error;
  createdBookingIds.push(bookingId);

  const trip = await client.from('trips').insert({
    id: tripId,
    booking_id: bookingId,
    operator_id: fixtures.operator.id,
    rider_id: TEST_RIDER.id,
    status: 'requested',
    pickup_point: POINT,
    dropoff_point: POINT,
    pickup_address: `Compliance test ${label}`,
    dropoff_address: `Compliance destination ${label}`,
    estimated_fare_cents: 4500,
  });
  if (trip.error) throw trip.error;
  createdTripIds.push(tripId);
  return tripId;
}

async function addRequiredApprovedDriverDocuments(): Promise<void> {
  const client = service!;
  const { data: operator, error: operatorError } = await client
    .from('operators')
    .select('country, state')
    .eq('id', fixtures.operator.id)
    .single();
  if (operatorError) throw operatorError;

  let query = client
    .from('compliance_rules')
    .select('doc_type, state')
    .eq('operator_id', fixtures.operator.id)
    .eq('country', operator.country)
    .eq('applies_to', 'driver')
    .eq('is_required', true);
  query = operator.state ? query.or(`state.is.null,state.eq.${operator.state}`) : query.is('state', null);
  const { data: rules, error: rulesError } = await query;
  if (rulesError) throw rulesError;
  const requiredTypes = [...new Set((rules ?? []).map((rule) => rule.doc_type))];
  if (requiredTypes.length === 0) throw new Error('No configured driver compliance rules for the test operator');

  const documents = requiredTypes.map((docType) => ({
    driver_id: TEST_DRIVER.id,
    operator_id: fixtures.operator.id,
    doc_type: docType as never,
    storage_path: `${TEST_PATH}${docType}`,
    status: 'approved' as const,
    reviewer_id: fixtures.users.admin.id,
    expires_on: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }));
  const { error } = await client.from('driver_documents').insert(documents as never);
  if (error) throw error;
}

async function cleanup(): Promise<void> {
  if (!service || !setupStarted) return;
  const cleanupErrors: string[] = [];
  const recordError = (name: string, error: { message: string } | null) => {
    if (error) cleanupErrors.push(`${name}: ${error.message}`);
  };
  if (createdTripIds.length > 0) {
    const offers = await service.from('trip_offers').delete().in('trip_id', createdTripIds);
    recordError('delete test offers', offers.error);
    const trips = await service.from('trips').delete().in('id', createdTripIds);
    recordError('delete test trips', trips.error);
  }
  if (createdBookingIds.length > 0) {
    const bookings = await service.from('bookings').delete().in('id', createdBookingIds);
    recordError('delete test bookings', bookings.error);
  }
  if (shiftId) {
    const shift = await service.from('driver_status').delete().eq('id', shiftId);
    recordError('delete test shift', shift.error);
  }
  if (locationWasPresent && originalLocation) {
    const location = await service.from('driver_location_latest').upsert(originalLocation as never);
    recordError('restore driver location', location.error);
  } else {
    const location = await service.from('driver_location_latest').delete().eq('driver_id', TEST_DRIVER.id);
    recordError('delete test driver location', location.error);
  }
  const testDocuments = await service
    .from('driver_documents')
    .delete()
    .eq('driver_id', TEST_DRIVER.id)
    .like('storage_path', `${TEST_PATH}%`);
  recordError('delete test driver documents', testDocuments.error);
  if (documentSnapshots.length > 0) {
    const documents = await service.from('driver_documents').insert(documentSnapshots as never);
    recordError('restore driver documents', documents.error);
  }
  if (driverSnapshot) {
    const driver = await service
      .from('driver_profiles')
      .update({ status: driverSnapshot.status, fatigue_locked_until: driverSnapshot.fatigue_locked_until })
      .eq('user_id', TEST_DRIVER.id);
    recordError('restore driver profile', driver.error);
  }
  if (testVehicleOriginalStatus !== null) {
    const vehicle = await service.from('vehicles').update({ status: testVehicleOriginalStatus }).eq('id', fixtures.vehicles[2].id);
    recordError('restore test vehicle status', vehicle.error);
  }
  for (const profile of otherDriverSnapshots) {
    const driver = await service.from('driver_profiles').update({ status: profile.status }).eq('user_id', profile.user_id);
    recordError(`restore driver ${profile.user_id}`, driver.error);
  }
  if (cleanupErrors.length > 0) throw new Error(`Fixture restoration failed: ${cleanupErrors.join('; ')}`);
}

beforeAll(async () => {
  assertLocalSupabaseUrl(SUPABASE_URL);
  if (!SERVICE_ROLE_KEY) return;
  service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    const [health, edge] = await Promise.all([
      fetch(`${SUPABASE_URL}/auth/v1/health`),
      fetch(`${FUNCTIONS_URL}/driver-online`, { method: 'GET', headers: { apikey: ANON_KEY } }),
    ]);
    if (!health.ok || ![401, 405].includes(edge.status)) return;

    const driverAuth = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const driverLogin = await driverAuth.auth.verifyOtp({ phone: TEST_DRIVER.phone, token: '123456', type: 'sms' });
    if (driverLogin.error || !driverLogin.data.session) return;
    driverToken = driverLogin.data.session.access_token;

    const adminAuth = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const adminLogin = await adminAuth.auth.signInWithPassword({
      email: fixtures.users.admin.email,
      password: 'demo-password-change-me',
    });
    if (adminLogin.error || !adminLogin.data.session) return;
    adminToken = adminLogin.data.session.access_token;

    const openShift = await service
      .from('driver_status')
      .select('id')
      .eq('driver_id', TEST_DRIVER.id)
      .is('ended_at', null)
      .maybeSingle();
    if (openShift.error || openShift.data) return;

    const { data: driverProfile } = await service
      .from('driver_profiles')
      .select('status, fatigue_locked_until')
      .eq('user_id', TEST_DRIVER.id)
      .single();
    if (!driverProfile) return;
    driverSnapshot = driverProfile;
    const { data: testVehicle } = await service
      .from('vehicles')
      .select('status')
      .eq('id', fixtures.vehicles[2].id)
      .single();
    if (!testVehicle) return;
    testVehicleOriginalStatus = testVehicle.status;

    const { data: others } = await service
      .from('driver_profiles')
      .select('user_id, status')
      .in('user_id', OTHER_DRIVERS.map((driver) => driver.id));
    otherDriverSnapshots = (others ?? []) as typeof otherDriverSnapshots;

    const { data: docs, error: docsError } = await service
      .from('driver_documents')
      .select('*')
      .eq('driver_id', TEST_DRIVER.id);
    if (docsError) return;
    documentSnapshots = (docs ?? []) as Record<string, unknown>[];

    const { data: location } = await service
      .from('driver_location_latest')
      .select('*')
      .eq('driver_id', TEST_DRIVER.id)
      .maybeSingle();
    originalLocation = location as Record<string, unknown> | null;
    locationWasPresent = Boolean(location);
    edgeAvailable = true;
  } catch {
    edgeAvailable = false;
  }
});

afterAll(cleanup);

function skipUnavailable(skip: (reason?: string) => void): void {
  if (!SERVICE_ROLE_KEY) skip('SUPABASE_SERVICE_ROLE_KEY is required for isolated Edge Function tests');
  if (!edgeAvailable || !service || !driverToken || !adminToken) skip('Local Edge Functions or seeded auth are unavailable');
}

describe('server-side driver compliance authorization', () => {
  it('enforces compliance in online, offer acceptance, dispatch, and manual assignment paths', async ({ skip }) => {
    skipUnavailable(skip);
    setupStarted = true;

    const client = service!;
    const { error: otherDriversError } = await client
      .from('driver_profiles')
      .update({ status: 'suspended' })
      .in('user_id', OTHER_DRIVERS.map((driver) => driver.id));
    expect(otherDriversError).toBeNull();
    const { error: driverError } = await client
      .from('driver_profiles')
      .update({ status: 'approved', fatigue_locked_until: null })
      .eq('user_id', TEST_DRIVER.id);
    expect(driverError).toBeNull();
    await client.from('driver_documents').delete().eq('driver_id', TEST_DRIVER.id);

    const { data: openShift, error: shiftError } = await client
      .from('driver_status')
      .insert({
        driver_id: TEST_DRIVER.id,
        operator_id: fixtures.operator.id,
        vehicle_id: TEST_VEHICLE.id,
        status: 'online',
      })
      .select('id')
      .single();
    expect(shiftError).toBeNull();
    shiftId = openShift!.id;

    const { error: locationError } = await client.from('driver_location_latest').upsert({
      driver_id: TEST_DRIVER.id,
      operator_id: fixtures.operator.id,
      point: POINT,
      recorded_at: new Date().toISOString(),
    });
    expect(locationError).toBeNull();

    const missingOnline = await postFunction('driver-online', { vehicle_id: TEST_VEHICLE.id }, driverToken!);
    expect(missingOnline.status).toBe(403);
    expect((missingOnline.body as EdgeError).error?.code).toBe('compliance_incomplete');

    const acceptTripId = await createRequestedTrip('accept-missing-docs');
    const { error: offerError } = await client.from('trip_offers').insert({
      trip_id: acceptTripId,
      driver_id: TEST_DRIVER.id,
      operator_id: fixtures.operator.id,
      responds_by: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      status: 'pending',
    });
    expect(offerError).toBeNull();
    const missingAcceptance = await postFunction('trips-accept-offer', { trip_id: acceptTripId }, driverToken!);
    expect(missingAcceptance.status).toBe(403);
    expect((missingAcceptance.body as EdgeError).error?.code).toBe('compliance_incomplete');
    const offerAfterDeniedAccept = await client.from('trip_offers').select('status').eq('trip_id', acceptTripId).single();
    expect(offerAfterDeniedAccept.data?.status).toBe('pending');

    const manualTripId = await createRequestedTrip('manual-missing-docs');
    const missingManualAssign = await postFunction(
      'dispatch-manual-assign',
      { trip_id: manualTripId, driver_id: TEST_DRIVER.id, reason: 'compliance integration test' },
      adminToken!,
    );
    expect(missingManualAssign.status).toBe(403);
    expect((missingManualAssign.body as EdgeError).error?.code).toBe('compliance_incomplete');

    const missingDispatchTripId = await createRequestedTrip('dispatch-missing-docs');
    const missingDispatch = await postFunction('dispatch', { trip_id: missingDispatchTripId });
    expect(missingDispatch.status).toBe(200);
    expect((missingDispatch.body as DispatchBody).status).toBe('manual');

    await addRequiredApprovedDriverDocuments();
    await client
      .from('driver_profiles')
      .update({ fatigue_locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
      .eq('user_id', TEST_DRIVER.id);
    const lockedOnline = await postFunction('driver-online', { vehicle_id: TEST_VEHICLE.id }, driverToken!);
    expect(lockedOnline.status).toBe(403);
    expect((lockedOnline.body as EdgeError).error?.code).toBe('fatigue_locked');
    await client.from('driver_profiles').update({ fatigue_locked_until: null }).eq('user_id', TEST_DRIVER.id);

    await client.from('vehicles').update({ status: 'active' }).eq('id', fixtures.vehicles[2].id);
    const invalidVehicle = await postFunction('driver-online', {
      vehicle_id: fixtures.vehicles[2].id,
    }, driverToken!);
    expect(invalidVehicle.status).toBe(403);
    expect((invalidVehicle.body as EdgeError).error?.code).toBe('vehicle_compliance_incomplete');

    const validDispatchTripId = await createRequestedTrip('dispatch-valid-docs');
    const validDispatch = await postFunction('dispatch', { trip_id: validDispatchTripId });
    expect(validDispatch.status).toBe(200);
    expect((validDispatch.body as DispatchBody).status).toBe('offered');
    expect((validDispatch.body as DispatchBody).driver_id).toBe(TEST_DRIVER.id);

    const profileGuardTripId = await createRequestedTrip('accept-offline-shift');
    await client.from('driver_status').update({ ended_at: new Date().toISOString() }).eq('id', shiftId!);
    const validDocsButOffline = await postFunction(
      'trips-accept-offer',
      { trip_id: profileGuardTripId },
      driverToken!,
    );
    expect(validDocsButOffline.status).toBe(409);
    expect((validDocsButOffline.body as EdgeError).error?.code).toBe('shift_not_online');
  });
});
