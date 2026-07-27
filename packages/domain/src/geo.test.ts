import { describe, expect, it } from 'vitest';

import {
  boundsForPoints,
  isLocationStale,
  parseRoutePolyline,
  type LatLng,
} from './geo';

describe('boundsForPoints', () => {
  it('returns null for an empty list', () => {
    expect(boundsForPoints([])).toBeNull();
  });

  it('pads a single point', () => {
    const b = boundsForPoints([{ lat: -33.9, lng: 151.2 }]);
    expect(b).not.toBeNull();
    expect(b!.ne.lat).toBeGreaterThan(-33.9);
    expect(b!.sw.lat).toBeLessThan(-33.9);
    expect(b!.ne.lng).toBeGreaterThan(151.2);
    expect(b!.sw.lng).toBeLessThan(151.2);
  });

  it('covers multiple points with padding', () => {
    const points: LatLng[] = [
      { lat: -33.9, lng: 151.1 },
      { lat: -33.8, lng: 151.2 },
    ];
    const b = boundsForPoints(points)!;
    expect(b.sw.lat).toBeLessThan(-33.9);
    expect(b.ne.lat).toBeGreaterThan(-33.8);
    expect(b.sw.lng).toBeLessThan(151.1);
    expect(b.ne.lng).toBeGreaterThan(151.2);
  });
});

describe('parseRoutePolyline', () => {
  it('parses [lng, lat] arrays', () => {
    expect(parseRoutePolyline('[[151.1,-33.9],[151.2,-33.8]]')).toEqual([
      { lat: -33.9, lng: 151.1 },
      { lat: -33.8, lng: 151.2 },
    ]);
  });

  it('parses {lat,lng} objects', () => {
    expect(parseRoutePolyline('[{"lat":-33.9,"lng":151.1}]')).toEqual([
      { lat: -33.9, lng: 151.1 },
    ]);
  });

  it('returns [] for null, empty, or invalid input', () => {
    expect(parseRoutePolyline(null)).toEqual([]);
    expect(parseRoutePolyline('')).toEqual([]);
    expect(parseRoutePolyline('not-json')).toEqual([]);
    expect(parseRoutePolyline('{}')).toEqual([]);
  });
});

describe('isLocationStale', () => {
  it('treats missing timestamps as stale', () => {
    expect(isLocationStale(null)).toBe(true);
    expect(isLocationStale(undefined)).toBe(true);
    expect(isLocationStale('nope')).toBe(true);
  });

  it('uses the 2-minute freshness window', () => {
    const now = Date.parse('2026-07-27T09:00:00.000Z');
    expect(isLocationStale('2026-07-27T08:59:00.000Z', now)).toBe(false);
    expect(isLocationStale('2026-07-27T08:57:59.000Z', now)).toBe(true);
  });
});
