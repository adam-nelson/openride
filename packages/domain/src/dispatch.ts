import { haversineM, type LatLng } from './geo';

export interface DispatchCandidate {
  driverId: string;
  point: LatLng;
  vehicleId: string;
  vehicleType: string;
  /** Optional ETA in seconds from a routing engine; if absent we fall back to haversine. */
  pickupEtaS?: number;
}

export interface DispatchTripRequest {
  pickup: LatLng;
  vehicleType: string;
}

/**
 * Rank dispatch candidates for a trip. Pure — no IO. The dispatch Edge Function
 * is responsible for loading candidates, calling this, and offering the top
 * driver. We rank in two layers: a cheap haversine cut, then ETA if provided.
 */
export function rankCandidates(
  request: DispatchTripRequest,
  candidates: DispatchCandidate[],
): DispatchCandidate[] {
  const compatible = candidates.filter((c) => c.vehicleType === request.vehicleType);

  return [...compatible].sort((a, b) => {
    if (a.pickupEtaS != null && b.pickupEtaS != null) return a.pickupEtaS - b.pickupEtaS;
    if (a.pickupEtaS != null) return -1;
    if (b.pickupEtaS != null) return 1;
    return haversineM(a.point, request.pickup) - haversineM(b.point, request.pickup);
  });
}
