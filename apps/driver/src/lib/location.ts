import * as Location from 'expo-location';

import { supabase } from './supabase';

export type LatLng = { lat: number; lng: number; heading?: number | null };

// Foreground location streaming. Expo Go only supports foreground; background
// streaming (screen off / app backgrounded) needs a custom dev client with an
// expo-location background task — a later upgrade.
let sub: Location.LocationSubscription | null = null;
let lastCoords: LatLng | null = null;
const listeners = new Set<(coords: LatLng) => void>();

export function getLastKnownCoords(): LatLng | null {
  return lastCoords;
}

export function subscribeLocation(listener: (coords: LatLng) => void): () => void {
  listeners.add(listener);
  if (lastCoords) listener(lastCoords);
  return () => {
    listeners.delete(listener);
  };
}

function emit(coords: LatLng): void {
  lastCoords = coords;
  for (const listener of listeners) listener(coords);
}

export async function requestCurrentCoords(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords: LatLng = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading,
    };
    emit(coords);
    return coords;
  } catch {
    return lastCoords;
  }
}

export async function startLocationStreaming(driverId: string): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission is required to go online.');

  // Push once immediately so the driver appears on the map without waiting.
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await pushLocation(driverId, pos);
    emit({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading,
    });
  } catch {
    // ignore — the watcher will catch up
  }

  sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 20 },
    (pos) => {
      emit({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading,
      });
      void pushLocation(driverId, pos);
    },
  );
}

export function stopLocationStreaming(): void {
  sub?.remove();
  sub = null;
}

async function pushLocation(driverId: string, pos: Location.LocationObject): Promise<void> {
  await supabase.from('driver_location_latest').upsert(
    {
      driver_id: driverId,
      point: `SRID=4326;POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
      recorded_at: new Date(pos.timestamp).toISOString(),
      speed_mps: pos.coords.speed,
      heading_deg: pos.coords.heading,
      accuracy_m: pos.coords.accuracy,
    },
    { onConflict: 'driver_id' },
  );
}
