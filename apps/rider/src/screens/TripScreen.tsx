import { isLocationStale } from '@openride/domain';
import { colors, formatMoney, spacing, typography } from '@openride/ui';
import type { RouteProp } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../App';
import { hasMapTiles, isMapNativeAvailable } from '../lib/mapStyle';
import {
  isTrackableStatus,
  subscribeTripTracking,
  type TripTrackingSnapshot,
} from '../lib/tracking';

type Props = { route: RouteProp<RootStackParamList, 'Trip'> };

type TripMapComponent = (props: {
  snapshot: TripTrackingSnapshot;
  bottomInset?: number;
}) => React.JSX.Element;

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  requested: 'Finding you a driver…',
  requires_manual_dispatch: 'Finding you a driver…',
  assigned: 'Driver assigned',
  driver_en_route: 'Driver on the way',
  arrived_at_pickup: 'Your driver has arrived',
  in_progress: 'On the trip',
  completed: 'Trip complete',
  cancelled: 'Trip cancelled',
  no_show: 'No show',
};

const ACTIVE = new Set([
  'requested',
  'requires_manual_dispatch',
  'scheduled',
  'assigned',
  'driver_en_route',
  'arrived_at_pickup',
  'in_progress',
]);

function loadTripTrackingMap(): TripMapComponent | null {
  if (!isMapNativeAvailable()) return null;
  // Lazy require so Expo Go (no MapLibre native module) does not crash on import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../components/TripTrackingMap') as {
    TripTrackingMap: TripMapComponent;
  };
  return mod.TripTrackingMap;
}

export function TripScreen({ route }: Props) {
  const { tripId } = route.params;
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<TripTrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const TripMap = useMemo(() => loadTripTrackingMap(), []);

  useEffect(() => {
    return subscribeTripTracking(
      tripId,
      (snap) => {
        setTrip(snap);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Could not load trip tracking.');
      },
    );
  }, [tripId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error ?? 'Trip not found.'}</Text>
      </View>
    );
  }

  const isActive = ACTIVE.has(trip.status);
  const fareCents = trip.final_fare_cents ?? trip.estimated_fare_cents;
  const showMap = Boolean(TripMap) && hasMapTiles();
  const driverStale = trip.driver != null && isLocationStale(trip.driver.recorded_at);
  const waitingForDriver =
    isTrackableStatus(trip.status) && trip.driver_id != null && trip.driver == null;
  const sheetPad = 24 + insets.bottom;
  const bottomInset = 300 + insets.bottom;

  return (
    <View style={styles.root}>
      {showMap && TripMap ? (
        <TripMap snapshot={trip} bottomInset={bottomInset} />
      ) : (
        <View style={[styles.mapFallback, { paddingTop: insets.top + spacing.xl }]}>
          <Text style={styles.fallbackTitle}>Live map</Text>
          <Text style={styles.muted}>
            {!hasMapTiles()
              ? 'Set EXPO_PUBLIC_MAPTILER_KEY in apps/rider/.env.local to enable MapTiler tiles.'
              : 'Maps need a custom Expo development build (MapLibre is not available in Expo Go).'}
          </Text>
        </View>
      )}

      <View style={[styles.sheet, { paddingBottom: sheetPad }]}>
        <View style={[styles.statusBox, isActive ? styles.statusActive : styles.statusDone]}>
          {isActive && trip.status !== 'arrived_at_pickup' ? (
            <ActivityIndicator color="#fff" style={{ marginBottom: spacing.sm }} />
          ) : null}
          <Text style={styles.statusText}>{STATUS_LABEL[trip.status] ?? trip.status}</Text>
          {waitingForDriver ? (
            <Text style={styles.statusSub}>Waiting for driver location…</Text>
          ) : null}
          {driverStale ? (
            <Text style={styles.statusSub}>Driver location unavailable (stale)</Text>
          ) : null}
        </View>

        <View style={styles.row}>
          <Text style={styles.dot}>●</Text>
          <View style={styles.flex}>
            <Text style={styles.label}>Pickup</Text>
            <Text style={styles.value}>{trip.pickup_address}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={[styles.dot, { color: colors.brand }]}>◆</Text>
          <View style={styles.flex}>
            <Text style={styles.label}>Dropoff</Text>
            <Text style={styles.value}>{trip.dropoff_address}</Text>
          </View>
        </View>

        {fareCents != null ? (
          <View style={styles.fareRow}>
            <Text style={styles.label}>
              {trip.final_fare_cents != null ? 'Fare' : 'Estimated fare'}
            </Text>
            <Text style={styles.fare}>{formatMoney(fareCents)}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  mapFallback: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.xl,
  },
  fallbackTitle: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  statusBox: {
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusActive: { backgroundColor: colors.brand },
  statusDone: { backgroundColor: colors.success },
  statusText: { color: '#fff', fontSize: typography.size.lg, fontWeight: '700' },
  statusSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  dot: { fontSize: 14, marginRight: spacing.md, marginTop: 2, color: colors.textMuted },
  flex: { flex: 1 },
  label: { fontSize: typography.size.sm, color: colors.textMuted },
  value: { fontSize: typography.size.md, fontWeight: '500', color: colors.text },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  fare: { fontSize: typography.size.xl, fontWeight: '700', color: colors.brand },
  muted: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  error: { marginTop: spacing.md, color: colors.danger, fontSize: typography.size.sm },
});
