/**
 * Dispatch simulation — pure-domain, no database.
 *
 * Spins up N virtual drivers and a stream of rider requests, runs the real
 * ranking from @openride/domain, models driver willingness + trip duration, and
 * reports coverage metrics. Useful for tuning radius / fleet size before
 * touching the live engine. Deterministic (seeded PRNG) so runs are comparable.
 *
 *   pnpm sim            # defaults
 *   DRIVERS=40 REQUESTS=300 RADIUS_M=8000 pnpm sim
 */
import { haversineM, rankCandidates, type DispatchCandidate } from '@openride/domain';

// Seeded LCG for reproducible runs.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Greater Sydney-ish bounding box.
const BOX = { minLat: -34.0, maxLat: -33.7, minLng: 150.9, maxLng: 151.3 };

interface SimDriver {
  id: string;
  lat: number;
  lng: number;
  willingness: number; // P(accept) when offered
  busyUntil: number; // sim seconds
}

function num(env: string, def: number): number {
  const v = Number(process.env[env]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

function main(): void {
  const DRIVERS = num('DRIVERS', 25);
  const REQUESTS = num('REQUESTS', 200);
  const RADIUS_M = num('RADIUS_M', 10_000);
  const MAX_ATTEMPTS = num('MAX_ATTEMPTS', 5);
  const HORIZON_S = num('HORIZON_S', 7200); // 2h of requests
  const rng = makeRng(num('SEED', 42));

  const pt = () => ({
    lat: BOX.minLat + rng() * (BOX.maxLat - BOX.minLat),
    lng: BOX.minLng + rng() * (BOX.maxLng - BOX.minLng),
  });

  const drivers: SimDriver[] = Array.from({ length: DRIVERS }, (_, i) => {
    const p = pt();
    return { id: `d${i}`, lat: p.lat, lng: p.lng, willingness: 0.6 + rng() * 0.35, busyUntil: 0 };
  });

  let assigned = 0;
  let manual = 0;
  let totalAttempts = 0;
  let totalPickupM = 0;

  for (let r = 0; r < REQUESTS; r += 1) {
    const now = Math.floor((r / REQUESTS) * HORIZON_S);
    const pickup = pt();

    const candidates: DispatchCandidate[] = drivers
      .filter((d) => d.busyUntil <= now && haversineM(d, pickup) <= RADIUS_M)
      .map((d) => ({ driverId: d.id, point: { lat: d.lat, lng: d.lng }, vehicleId: 'v', vehicleType: 'sedan' }));

    const ranked = rankCandidates({ pickup, vehicleType: 'sedan' }, candidates);

    let placed = false;
    for (let a = 0; a < Math.min(MAX_ATTEMPTS, ranked.length); a += 1) {
      totalAttempts += 1;
      const driver = drivers.find((d) => d.id === ranked[a]!.driverId)!;
      if (rng() < driver.willingness) {
        const pickupM = haversineM(driver, pickup);
        totalPickupM += pickupM;
        // Busy for pickup + a 5–25 min trip.
        const tripS = 300 + Math.floor(rng() * 1200);
        driver.busyUntil = now + Math.round(pickupM / 8) + tripS;
        assigned += 1;
        placed = true;
        break;
      }
    }
    if (!placed) manual += 1;
  }

  const pct = (n: number) => `${((n / REQUESTS) * 100).toFixed(1)}%`;
  console.warn('— OpenRide dispatch simulation —');
  console.warn(`fleet=${DRIVERS}  requests=${REQUESTS}  radius=${RADIUS_M}m  maxAttempts=${MAX_ATTEMPTS}`);
  console.warn(`assigned:        ${assigned} (${pct(assigned)})`);
  console.warn(`manual fallback: ${manual} (${pct(manual)})`);
  console.warn(`avg attempts/assigned: ${(totalAttempts / Math.max(1, assigned)).toFixed(2)}`);
  console.warn(`avg pickup distance:   ${Math.round(totalPickupM / Math.max(1, assigned))} m`);
}

main();
