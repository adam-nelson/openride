import { describe, expect, it } from 'vitest';

import { rankCandidates, type DispatchCandidate } from './dispatch';

const TRIP = { pickup: { lat: -33.86, lng: 151.21 }, vehicleType: 'sedan' };

describe('rankCandidates', () => {
  it('filters out incompatible vehicle types', () => {
    const candidates: DispatchCandidate[] = [
      { driverId: 'a', vehicleId: 'v1', vehicleType: 'sedan', point: { lat: -33.86, lng: 151.21 } },
      { driverId: 'b', vehicleId: 'v2', vehicleType: 'van', point: { lat: -33.86, lng: 151.21 } },
    ];
    const ranked = rankCandidates(TRIP, candidates);
    expect(ranked.map((c) => c.driverId)).toEqual(['a']);
  });

  it('prefers candidates with a real ETA', () => {
    const candidates: DispatchCandidate[] = [
      { driverId: 'far-but-eta', vehicleId: 'v', vehicleType: 'sedan',
        point: { lat: -33.95, lng: 151.10 }, pickupEtaS: 60 },
      { driverId: 'close-no-eta', vehicleId: 'v', vehicleType: 'sedan',
        point: { lat: -33.861, lng: 151.211 } },
    ];
    const ranked = rankCandidates(TRIP, candidates);
    expect(ranked[0]?.driverId).toBe('far-but-eta');
  });

  it('falls back to haversine when no ETAs are present', () => {
    const candidates: DispatchCandidate[] = [
      { driverId: 'far', vehicleId: 'v', vehicleType: 'sedan',
        point: { lat: -33.95, lng: 151.10 } },
      { driverId: 'close', vehicleId: 'v', vehicleType: 'sedan',
        point: { lat: -33.861, lng: 151.211 } },
    ];
    const ranked = rankCandidates(TRIP, candidates);
    expect(ranked.map((c) => c.driverId)).toEqual(['close', 'far']);
  });
});
