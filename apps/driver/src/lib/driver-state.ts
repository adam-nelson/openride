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

export const REQUIRED_DRIVER_DOCUMENTS = [
  { type: 'License', docType: 'license' },
  { type: 'LASDRI', docType: 'lasdri' },
  { type: 'NHIA', docType: 'nhia' },
] as const;

export type RequiredDocumentName = (typeof REQUIRED_DRIVER_DOCUMENTS)[number]['type'];
export type DriverDocumentType = RequiredDocumentName | 'Hackney Permit' | 'Motor Insurance';

export interface DriverDocument {
  type: DriverDocumentType;
  label?: string;
  status: 'verified' | 'pending';
  uploaded: boolean;
  expiresOn?: string | null;
  expiryLabel?: string;
  expiringSoon?: boolean;
  renewalSubmitted?: boolean;
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
  grossEarningsNaira: number | null;
  completedTrips: number | null;
  completedTripsToday: number | null;
  hoursOnlineToday: number | null;
  driverDocuments: DriverDocument[];
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
  const [grossEarningsNaira, setGrossEarningsNaira] = useState<number | null>(null);
  const [completedTrips, setCompletedTrips] = useState<number | null>(null);
  const [completedTripsToday, setCompletedTripsToday] = useState<number | null>(null);
  const [hoursOnlineToday, setHoursOnlineToday] = useState<number | null>(null);
  const [driverDocuments, setDriverDocuments] = useState<DriverDocument[]>(
    REQUIRED_DRIVER_DOCUMENTS.map(({ type }) => ({ type, status: 'pending', uploaded: false })),
  );
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);

  const refresh = useCallback(async () => {
    if (!driverId) return;
    const nowIso = new Date().toISOString();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const [statusRes, tripRes, offerRes, earningsRes, completedTripsRes, shiftsRes, documentsRes] = await Promise.all([
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
      supabase
        .from('trips')
        .select('final_fare_cents')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('completed_at', dayStart.toISOString())
        .lt('completed_at', dayEnd.toISOString()),
      supabase
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .eq('status', 'completed'),
      supabase
        .from('driver_status')
        .select('started_at, ended_at')
        .lte('started_at', nowIso)
        .or(`ended_at.is.null,ended_at.gt.${dayStart.toISOString()}`),
      supabase
        .from('driver_documents')
        .select('doc_type, status')
        .eq('driver_id', driverId)
        .in('doc_type', REQUIRED_DRIVER_DOCUMENTS.map(({ docType }) => docType)),
    ]);

    const status = statusRes.data as { status?: string; vehicle_id?: string } | null;
    setOnline(Boolean(status) && status?.status !== 'offline');
    setVehicleId(status?.vehicle_id ?? null);
    setActiveTrip((tripRes.data as ActiveTrip) ?? null);
    setPendingOffer((offerRes.data as unknown as PendingOffer) ?? null);
    if (earningsRes.error) {
      setGrossEarningsNaira(null);
      setCompletedTripsToday(null);
    } else {
      const earningsRows = (earningsRes.data ?? []) as { final_fare_cents: number | null }[];
      const grossEarningsCents = earningsRows.reduce((total, trip) => total + (trip.final_fare_cents ?? 0), 0);
      setGrossEarningsNaira(grossEarningsCents / 100);
      setCompletedTripsToday(earningsRows.length);
    }
    setCompletedTrips(completedTripsRes.error ? null : completedTripsRes.count ?? 0);
    if (shiftsRes.error) {
      setHoursOnlineToday(null);
    } else {
      const currentTimeMs = Date.now();
      const dayStartMs = dayStart.getTime();
      const onlineMilliseconds = (shiftsRes.data ?? []).reduce((total, shift) => {
        const startedAtMs = Math.max(new Date(shift.started_at).getTime(), dayStartMs);
        const endedAtMs = Math.min(shift.ended_at ? new Date(shift.ended_at).getTime() : currentTimeMs, currentTimeMs);
        return total + Math.max(0, endedAtMs - startedAtMs);
      }, 0);
      setHoursOnlineToday(onlineMilliseconds / 3_600_000);
    }
    const documentRows = documentsRes.data ?? [];
    setDriverDocuments(
      REQUIRED_DRIVER_DOCUMENTS.map(({ type, docType }) => {
        const matchingDocuments = documentRows.filter((document) => document.doc_type === docType);
        return {
          type,
          status: matchingDocuments.some((document) => document.status === 'approved') ? 'verified' : 'pending',
          uploaded: matchingDocuments.length > 0,
        };
      }),
    );
    setLoading(false);
  }, [driverId]);

  // Initial load + realtime subscription on the driver's own rows.
  useEffect(() => {
    if (!driverId) return;
    void refresh();
    const channel = supabase.channel(channels.driver(driverId));
    for (const table of ['driver_status', 'trips', 'trip_offers', 'driver_documents']) {
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

  return {
    loading,
    online,
    vehicleId,
    grossEarningsNaira,
    completedTrips,
    completedTripsToday,
    hoursOnlineToday,
    driverDocuments,
    activeTrip,
    pendingOffer,
    refresh,
    goOnline,
    goOffline,
  };
}

export async function submitDriverDocuments(driverId: string, uploadedTypes: RequiredDocumentName[]): Promise<void> {
  const documents = REQUIRED_DRIVER_DOCUMENTS.filter(({ type }) => uploadedTypes.includes(type));

  for (const { docType } of documents) {
    const { error } = await supabase.rpc('submit_driver_document', {
      p_doc_type: docType,
      p_storage_path: `mock/${driverId}/${docType}/${Date.now()}`,
      p_issued_on: null,
      p_expires_on: null,
    });
    if (error) throw error;
  }
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
