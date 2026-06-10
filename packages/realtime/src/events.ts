/**
 * The canonical event registry. Adding a realtime event = adding to this file.
 *
 * Producers cast their payload to the corresponding type; consumers type-narrow
 * on `event` and get fully typed payloads.
 */

export interface DriverLocationUpdated {
  event: 'driver.location.updated';
  driver_id: string;
  point: { lat: number; lng: number };
  heading_deg: number | null;
  speed_mps: number | null;
  ts: string;
}

export interface DriverStatusChanged {
  event: 'driver.status.changed';
  driver_id: string;
  status: 'offline' | 'online' | 'on_trip' | 'break';
  vehicle_id: string | null;
  ts: string;
}

export interface BookingCreated {
  event: 'booking.created';
  booking_id: string;
  trip_id: string;
  type: 'now' | 'scheduled';
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  ts: string;
}

export interface TripOfferSent {
  event: 'trip.offer.sent';
  trip_id: string;
  offer_id: string;
  pickup_eta_s: number;
  distance_to_pickup_m: number;
  fare_cents: number;
  expires_at: string;
}

export interface TripOfferAccepted {
  event: 'trip.offer.accepted';
  trip_id: string;
  driver_id: string;
}

export interface TripOfferRejected {
  event: 'trip.offer.rejected';
  trip_id: string;
  driver_id: string;
  reason: string;
}

export interface TripAssigned {
  event: 'trip.assigned';
  trip_id: string;
  driver_id: string;
  vehicle_summary: { rego: string; make: string; model: string; color: string };
  eta_s: number;
}

export type TripStateEvent =
  | { event: 'trip.driver_en_route'; trip_id: string; eta_s: number }
  | { event: 'trip.arrived_at_pickup'; trip_id: string; ts: string }
  | { event: 'trip.started'; trip_id: string; started_at: string }
  | { event: 'trip.completed'; trip_id: string; distance_m: number; duration_s: number; fare_cents: number }
  | { event: 'trip.cancelled'; trip_id: string; cancelled_by: string; reason: string };

export interface PaymentAuthorised {
  event: 'payment.authorised';
  trip_id: string;
  payment_id: string;
}

export interface PaymentCaptured {
  event: 'payment.captured';
  trip_id: string;
  amount_cents: number;
}

export interface PaymentFailed {
  event: 'payment.failed';
  trip_id: string;
  code: string;
  message: string;
}

export interface FatigueLockoutStarted {
  event: 'fatigue.lockout.started';
  driver_id: string;
  until: string;
}

export interface IncidentCreated {
  event: 'incident.created';
  incident_id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export type OpenrideEvent =
  | DriverLocationUpdated
  | DriverStatusChanged
  | BookingCreated
  | TripOfferSent
  | TripOfferAccepted
  | TripOfferRejected
  | TripAssigned
  | TripStateEvent
  | PaymentAuthorised
  | PaymentCaptured
  | PaymentFailed
  | FatigueLockoutStarted
  | IncidentCreated;
