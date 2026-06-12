import { channels } from '@openride/realtime';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { api } from './api';
import { startLocationStreaming, stopLocationStreaming } from './location';
import { supabase } from './supabase';

export interface Vehicle {
  id: string;
  rego: string;
  make: string;
  model: string;
  vehicle_type: string;
}

export interface ActiveTrip {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare_cents: number | null;
  final_fare_cents: number | null;
}

export interface PendingOffer {
  id: string;
  trip_id: string;
  responds_by: string;
  pickup_eta_s: number | null;
  distance_to_pickup_m: number | null;
  trips: { pickup_address: string; dropoff_address: string; estimated_fare_cents: number | null } | null;
}

const ACTIVE_STATUSES = ['assigned', 'driver_en_route', 'arrived_at_pickup', 'in_progress'] as const;

export interface DriverState {
  loading: boolean;
  online: boolean;
  vehicleId: string | null;
  activeTrip: ActiveTrip | null;
  pendingOffer: PendingOffer | null;
  refresh: () => Promise<void>;
  goOnline: (vehicleId: string) => Promise<void>;
  goOffline: () => Promise<void>;
}

export function useDriverState(session: Session | null): DriverState {
  const driverId = session?.user.id ?? null;
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);

  const refresh = useCallback(async () => {
    if (!driverId) return;
    const nowIso = new Date().toISOString();
    const [statusRes, tripRes, offerRes] = await Promise.all([
      supabase
        .from('driver_status')
        .select('status, vehicle_id')
        .eq('driver_id', driverId)
        .is('ended_at', null)
        .maybeSingle(),
      supabase
        .from('trips')
        .select('id, status, pickup_address, dropoff_address, estimated_fare_cents, final_fare_cents')
        .eq('driver_id', driverId)
        .in('status', ACTIVE_STATUSES)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('trip_offers')
        .select('id, trip_id, responds_by, pickup_eta_s, distance_to_pickup_m, trips(pickup_address, dropoff_address, estimated_fare_cents)')
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .gt('responds_by', nowIso)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const status = statusRes.data as { status?: string; vehicle_id?: string } | null;
    setOnline(Boolean(status) && status?.status !== 'offline');
    setVehicleId(status?.vehicle_id ?? null);
    setActiveTrip((tripRes.data as ActiveTrip) ?? null);
    setPendingOffer((offerRes.data as unknown as PendingOffer) ?? null);
    setLoading(false);
  }, [driverId]);

  // Initial load + realtime subscription on the driver's own rows.
  useEffect(() => {
    if (!driverId) return;
    void refresh();
    const channel = supabase.channel(channels.driver(driverId));
    for (const table of ['driver_status', 'trips', 'trip_offers']) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `driver_id=eq.${driverId}` },
        () => void refresh(),
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driverId, refresh]);

  // Stream location while online; stop when offline or signed out.
  useEffect(() => {
    if (online && driverId) {
      void startLocationStreaming(driverId).catch(() => {});
      return () => stopLocationStreaming();
    }
    stopLocationStreaming();
    return undefined;
  }, [online, driverId]);

  const goOnline = useCallback(
    async (vId: string) => {
      await api.driverGoOnline(vId);
      await refresh();
    },
    [refresh],
  );

  const goOffline = useCallback(async () => {
    await api.driverGoOffline();
    stopLocationStreaming();
    await refresh();
  }, [refresh]);

  return { loading, online, vehicleId, activeTrip, pendingOffer, refresh, goOnline, goOffline };
}

/** Vehicles this driver can operate (their default vehicle(s)). */
export async function fetchMyVehicles(driverId: string): Promise<Vehicle[]> {
  const { data } = await supabase
    .from('vehicles')
    .select('id, rego, make, model, vehicle_type')
    .eq('default_driver_id', driverId)
    .eq('status', 'active');
  return (data as Vehicle[]) ?? [];
}
