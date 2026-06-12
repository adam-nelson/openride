/**
 * Typed wrapper around Supabase Edge Functions. Every Edge Function endpoint
 * gets a method here so apps never reach into raw `fetch` or `supabase.functions.invoke`.
 */

import type { OpenrideClient } from '@openride/db';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface FareEstimateRequest {
  pickup: LatLng;
  dropoff: LatLng;
  vehicle_type: string;
}

export interface FareEstimateResponse {
  estimate_id: string;
  distance_m: number;
  duration_s: number;
  subtotal_cents: number;
  surcharges_cents: number;
  total_cents: number;
  expires_at: string;
}

export interface CreateBookingRequest {
  type: 'now' | 'scheduled';
  pickup: LatLng;
  pickup_label: string;
  dropoff: LatLng;
  dropoff_label: string;
  vehicle_type: string;
  passenger_count?: number;
  scheduled_pickup_at?: string;
  notes?: string;
}

export interface BookingResponse {
  booking_id: string;
  trip_id: string;
}

export class OpenrideApi {
  constructor(private readonly client: OpenrideClient) {}

  async fareEstimate(req: FareEstimateRequest): Promise<FareEstimateResponse> {
    return this.invoke('fare-estimate', req);
  }

  async createBooking(req: CreateBookingRequest): Promise<BookingResponse> {
    return this.invoke('bookings', req);
  }

  async cancelBooking(bookingId: string, reason: string): Promise<{ ok: true }> {
    return this.invoke(`bookings-${bookingId}-cancel`, { reason });
  }

  async driverGoOnline(vehicleId: string): Promise<{ ok: true }> {
    return this.invoke('driver-online', { vehicle_id: vehicleId });
  }

  async driverGoOffline(): Promise<{ ok: true }> {
    return this.invoke('driver-offline', {});
  }

  async acceptOffer(tripId: string): Promise<{ ok: true }> {
    return this.invoke('trips-accept-offer', { trip_id: tripId });
  }

  async declineOffer(tripId: string, reason: string): Promise<{ ok: true }> {
    return this.invoke('trips-decline-offer', { trip_id: tripId, reason });
  }

  async manualAssign(tripId: string, driverId: string, reason: string): Promise<{ ok: true }> {
    return this.invoke('dispatch-manual-assign', {
      trip_id: tripId,
      driver_id: driverId,
      reason,
    });
  }

  async tripEvent(
    tripId: string,
    event: 'en-route' | 'arrived' | 'start' | 'complete' | 'cancel',
    reason?: string,
  ): Promise<{ ok: true }> {
    return this.invoke('trips-transition', { trip_id: tripId, event, reason });
  }

  private async invoke<T>(fnName: string, body: object): Promise<T> {
    const { data, error } = await this.client.functions.invoke<T>(fnName, {
      body: body as Record<string, unknown>,
    });
    if (error) throw error;
    if (data === null) throw new Error(`Edge function ${fnName} returned no body`);
    return data;
  }
}
