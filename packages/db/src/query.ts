/**
 * Centralised query helpers. Apps and Edge Functions should call these rather
 * than reaching into PostgREST directly — when we add operator_id in Phase 9,
 * the predicates change here, not in 50 call-sites.
 */

import type { Database } from './generated';
import type { OpenrideClient } from './index';

type VehicleType = Database['public']['Enums']['vehicle_type'];

export async function getUserById(client: OpenrideClient, userId: string) {
  return client.from('users').select('*').eq('id', userId).maybeSingle();
}

export async function getActiveTripForRider(client: OpenrideClient, riderId: string) {
  return client
    .from('trips')
    .select('*')
    .eq('rider_id', riderId)
    .in('status', [
      'requested',
      'assigned',
      'driver_en_route',
      'arrived_at_pickup',
      'in_progress',
    ])
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getActiveTripForDriver(client: OpenrideClient, driverId: string) {
  return client
    .from('trips')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'driver_en_route', 'arrived_at_pickup', 'in_progress'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getPendingOfferForDriver(client: OpenrideClient, driverId: string) {
  return client
    .from('trip_offers')
    .select('*, trips(*)')
    .eq('driver_id', driverId)
    .eq('status', 'pending')
    .gt('responds_by', new Date().toISOString())
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getActiveFareRule(client: OpenrideClient, vehicleType: VehicleType) {
  return client
    .from('fare_rules')
    .select('*')
    .eq('vehicle_type', vehicleType)
    .eq('is_active', true)
    .maybeSingle();
}
