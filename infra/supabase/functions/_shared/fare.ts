export interface LatLng {
  lat: number;
  lng: number;
}

export interface FareRuleLike {
  base_cents: number;
  per_km_cents: number;
  per_min_cents: number;
  minimum_cents: number;
  booking_fee_cents: number;
}

/** Great-circle distance in metres. MVP stand-in for a routed distance. */
export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** Rough duration from distance assuming ~40 km/h average. */
export function estimateDurationS(distanceM: number): number {
  return Math.round(distanceM / 11);
}

/** Fare in integer cents. Keep in sync with packages/domain/src/fare.ts. */
export function computeFareCents(rule: FareRuleLike, distanceM: number, durationS: number): number {
  const distanceKm = distanceM / 1000;
  const durationMin = durationS / 60;
  return Math.max(
    rule.minimum_cents,
    rule.base_cents +
      rule.booking_fee_cents +
      Math.round(distanceKm * rule.per_km_cents) +
      Math.round(durationMin * rule.per_min_cents),
  );
}
