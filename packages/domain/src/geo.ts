/**
 * Lightweight geo helpers used outside Postgres. For anything serious, use
 * PostGIS — these are for client-side ranking, sanity checks, and tests.
 */

const EARTH_RADIUS_M = 6_371_000;

export interface LatLng {
  lat: number;
  lng: number;
}

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LatLngBounds {
  ne: LatLng;
  sw: LatLng;
}

/** Axis-aligned bounds covering the given points (null if empty). */
export function boundsForPoints(points: readonly LatLng[]): LatLngBounds | null {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
  if (valid.length === 0) return null;
  let minLat = valid[0]!.lat;
  let maxLat = valid[0]!.lat;
  let minLng = valid[0]!.lng;
  let maxLng = valid[0]!.lng;
  for (const p of valid.slice(1)) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  // Pad degenerate single-point / zero-span bounds so the camera has room.
  const latPad = maxLat === minLat ? 0.005 : (maxLat - minLat) * 0.15;
  const lngPad = maxLng === minLng ? 0.005 : (maxLng - minLng) * 0.15;
  return {
    ne: { lat: maxLat + latPad, lng: maxLng + lngPad },
    sw: { lat: minLat - latPad, lng: minLng - lngPad },
  };
}

/**
 * Parse `trips.route_polyline` text into coordinates.
 * Accepts a JSON array of `[lng, lat]` or `{lat, lng}` objects.
 */
export function parseRoutePolyline(raw: string | null | undefined): LatLng[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: LatLng[] = [];
    for (const item of parsed) {
      if (Array.isArray(item) && item.length >= 2) {
        const lng = Number(item[0]);
        const lat = Number(item[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
        continue;
      }
      if (item && typeof item === 'object' && 'lat' in item && 'lng' in item) {
        const lat = Number((item as { lat: unknown }).lat);
        const lng = Number((item as { lng: unknown }).lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** True when a driver location timestamp is older than the dispatch freshness window. */
export function isLocationStale(
  recordedAt: string | null | undefined,
  nowMs = Date.now(),
  maxAgeMs = 120_000,
): boolean {
  if (!recordedAt) return true;
  const t = Date.parse(recordedAt);
  if (!Number.isFinite(t)) return true;
  return nowMs - t > maxAgeMs;
}
