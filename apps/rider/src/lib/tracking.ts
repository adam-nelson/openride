import type { LatLng } from '@openride/domain';
import { channels } from '@openride/realtime';

import { supabase } from './supabase';

export interface TrackingDriver {
  lat: number;
  lng: number;
  heading_deg: number | null;
  recorded_at: string;
}

export interface TripTrackingSnapshot {
  id: string;
  status: string;
  driver_id: string | null;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare_cents: number | null;
  final_fare_cents: number | null;
  route_polyline: string | null;
  pickup: LatLng;
  dropoff: LatLng;
  driver: TrackingDriver | null;
}

const TRACKABLE = new Set([
  'assigned',
  'driver_en_route',
  'arrived_at_pickup',
  'in_progress',
]);

export function isTrackableStatus(status: string): boolean {
  return TRACKABLE.has(status);
}

function parseSnapshot(raw: unknown): TripTrackingSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const pickup = o.pickup as LatLng | undefined;
  const dropoff = o.dropoff as LatLng | undefined;
  if (
    typeof o.id !== 'string' ||
    typeof o.status !== 'string' ||
    !pickup ||
    !dropoff ||
    typeof pickup.lat !== 'number' ||
    typeof pickup.lng !== 'number' ||
    typeof dropoff.lat !== 'number' ||
    typeof dropoff.lng !== 'number'
  ) {
    return null;
  }

  let driver: TrackingDriver | null = null;
  if (o.driver && typeof o.driver === 'object') {
    const d = o.driver as Record<string, unknown>;
    if (typeof d.lat === 'number' && typeof d.lng === 'number' && typeof d.recorded_at === 'string') {
      driver = {
        lat: d.lat,
        lng: d.lng,
        heading_deg: typeof d.heading_deg === 'number' ? d.heading_deg : null,
        recorded_at: d.recorded_at,
      };
    }
  }

  return {
    id: o.id,
    status: o.status,
    driver_id: typeof o.driver_id === 'string' ? o.driver_id : null,
    pickup_address: typeof o.pickup_address === 'string' ? o.pickup_address : '',
    dropoff_address: typeof o.dropoff_address === 'string' ? o.dropoff_address : '',
    estimated_fare_cents: typeof o.estimated_fare_cents === 'number' ? o.estimated_fare_cents : null,
    final_fare_cents: typeof o.final_fare_cents === 'number' ? o.final_fare_cents : null,
    route_polyline: typeof o.route_polyline === 'string' ? o.route_polyline : null,
    pickup,
    dropoff,
    driver,
  };
}

export async function fetchTripTrackingSnapshot(
  tripId: string,
): Promise<TripTrackingSnapshot | null> {
  const { data, error } = await supabase.rpc('trip_tracking_snapshot', {
    p_trip_id: tripId,
  });
  if (error) throw error;
  return parseSnapshot(data);
}

/**
 * Subscribe to trip row + driver location changes. On any ping, re-fetch the
 * RPC (geography in realtime payloads is opaque).
 */
export function subscribeTripTracking(
  tripId: string,
  onSnapshot: (snap: TripTrackingSnapshot | null) => void,
  onError?: (err: unknown) => void,
): () => void {
  let driverId: string | null = null;
  let cancelled = false;
  let locationChannel: ReturnType<typeof supabase.channel> | null = null;

  const refresh = async () => {
    try {
      const snap = await fetchTripTrackingSnapshot(tripId);
      if (cancelled) return;
      onSnapshot(snap);

      const nextDriver =
        snap && isTrackableStatus(snap.status) ? snap.driver_id : null;
      if (nextDriver !== driverId) {
        driverId = nextDriver;
        if (locationChannel) {
          void supabase.removeChannel(locationChannel);
          locationChannel = null;
        }
        if (driverId) {
          locationChannel = supabase
            .channel(`${channels.trip(tripId)}:driver-loc`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'driver_location_latest',
                filter: `driver_id=eq.${driverId}`,
              },
              () => {
                void refresh();
              },
            )
            .subscribe();
        }
      }
    } catch (err) {
      if (!cancelled) onError?.(err);
    }
  };

  void refresh();

  const tripChannel = supabase
    .channel(channels.trip(tripId))
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
      () => {
        void refresh();
      },
    )
    .subscribe();

  return () => {
    cancelled = true;
    void supabase.removeChannel(tripChannel);
    if (locationChannel) void supabase.removeChannel(locationChannel);
  };
}
