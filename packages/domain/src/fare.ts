export interface FareRule {
  baseCents: number;
  perKmCents: number;
  perMinCents: number;
  minimumCents: number;
  bookingFeeCents: number;
  nightSurchargePct: number;
  airportSurchargeCents: number;
}

export interface FareInput {
  distanceM: number;
  durationS: number;
  rule: FareRule;
  isNight?: boolean;
  isAirport?: boolean;
}

export interface FareBreakdown {
  subtotalCents: number;
  surchargesCents: number;
  totalCents: number;
}

/**
 * Compute the fare for a single trip in integer cents.
 *
 * Pure function — no IO. The same inputs always yield the same outputs, which
 * is what we need for fare estimates that the rider sees before booking.
 */
export function computeFare(input: FareInput): FareBreakdown {
  const { distanceM, durationS, rule, isNight = false, isAirport = false } = input;

  const distanceKm = distanceM / 1000;
  const durationMin = durationS / 60;

  const distanceCharge = Math.round(distanceKm * rule.perKmCents);
  const timeCharge = Math.round(durationMin * rule.perMinCents);
  let subtotal = rule.baseCents + rule.bookingFeeCents + distanceCharge + timeCharge;
  subtotal = Math.max(subtotal, rule.minimumCents);

  let surcharges = 0;
  if (isNight) surcharges += Math.round(subtotal * (rule.nightSurchargePct / 100));
  if (isAirport) surcharges += rule.airportSurchargeCents;

  return {
    subtotalCents: subtotal,
    surchargesCents: surcharges,
    totalCents: subtotal + surcharges,
  };
}
