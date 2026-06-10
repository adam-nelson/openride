import { describe, expect, it } from 'vitest';

import { computeFare, type FareRule } from './fare';

const SEDAN: FareRule = {
  baseCents: 350,
  perKmCents: 220,
  perMinCents: 65,
  minimumCents: 1200,
  bookingFeeCents: 150,
  nightSurchargePct: 20,
  airportSurchargeCents: 500,
};

describe('computeFare', () => {
  it('combines base, booking fee, distance, and time', () => {
    const fare = computeFare({ distanceM: 10_000, durationS: 600, rule: SEDAN });
    // 350 + 150 + 10*220 + 10*65 = 3350
    expect(fare.subtotalCents).toBe(3350);
    expect(fare.surchargesCents).toBe(0);
    expect(fare.totalCents).toBe(3350);
  });

  it('honours minimum fare for very short trips', () => {
    const fare = computeFare({ distanceM: 500, durationS: 60, rule: SEDAN });
    expect(fare.totalCents).toBe(SEDAN.minimumCents);
  });

  it('applies night surcharge as a percentage of subtotal', () => {
    const fare = computeFare({
      distanceM: 10_000,
      durationS: 600,
      rule: SEDAN,
      isNight: true,
    });
    expect(fare.surchargesCents).toBe(670); // 20% of 3350
    expect(fare.totalCents).toBe(3350 + 670);
  });

  it('adds airport surcharge as a flat amount', () => {
    const fare = computeFare({
      distanceM: 10_000,
      durationS: 600,
      rule: SEDAN,
      isAirport: true,
    });
    expect(fare.surchargesCents).toBe(SEDAN.airportSurchargeCents);
  });
});
