/** Canonical channel names. Producers and consumers MUST go through these. */
export const channels = {
  driver: (driverId: string) => `driver:${driverId}` as const,
  trip: (tripId: string) => `trip:${tripId}` as const,
  dispatchQueue: 'dispatch:queue' as const,
  presenceOnlineDrivers: 'presence:online_drivers' as const,
};

export type DriverChannel = ReturnType<typeof channels.driver>;
export type TripChannel = ReturnType<typeof channels.trip>;
