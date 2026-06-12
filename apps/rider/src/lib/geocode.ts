// MapTiler geocoding. Key is public by design (restrict by origin/usage in the
// MapTiler dashboard for production). Set EXPO_PUBLIC_MAPTILER_KEY in .env.local.
const KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

export interface Place {
  label: string;
  lat: number;
  lng: number;
}

export function hasGeocoder(): boolean {
  return Boolean(KEY);
}

export async function searchPlaces(
  query: string,
  proximity?: { lat: number; lng: number },
): Promise<Place[]> {
  if (!KEY) throw new Error('Set EXPO_PUBLIC_MAPTILER_KEY in apps/rider/.env.local to search.');
  if (query.trim().length < 3) return [];
  const params = new URLSearchParams({
    key: KEY,
    country: 'au',
    limit: '6',
    autocomplete: 'true',
  });
  if (proximity) params.set('proximity', `${proximity.lng},${proximity.lat}`);

  const res = await fetch(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = (await res.json()) as { features?: GeocodeFeature[] };
  return (data.features ?? [])
    .filter((f) => Array.isArray(f.center) && f.center.length === 2)
    .map((f) => ({ label: f.place_name ?? f.text ?? 'Unknown', lng: f.center[0], lat: f.center[1] }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!KEY) return null;
  const res = await fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${KEY}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: GeocodeFeature[] };
  return data.features?.[0]?.place_name ?? null;
}

interface GeocodeFeature {
  center: [number, number];
  place_name?: string;
  text?: string;
}
