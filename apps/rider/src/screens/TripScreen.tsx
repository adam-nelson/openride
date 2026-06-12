import { channels } from '@openride/realtime';
import { colors, formatMoney, spacing, typography } from '@openride/ui';
import type { RouteProp } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../../App';
import { supabase } from '../lib/supabase';

type Props = { route: RouteProp<RootStackParamList, 'Trip'> };

interface TripRow {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare_cents: number | null;
  final_fare_cents: number | null;
  driver_id: string | null;
}

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

const ACTIVE = new Set(['requested', 'requires_manual_dispatch', 'scheduled', 'assigned', 'driver_en_route', 'arrived_at_pickup', 'in_progress']);

export function TripScreen({ route }: Props) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase
      .from('trips')
      .select('id, status, pickup_address, dropoff_address, estimated_fare_cents, final_fare_cents, driver_id')
      .eq('id', tripId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setTrip(data as TripRow | null);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(channels.trip(tripId))
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        (payload) => setTrip((prev) => ({ ...(prev ?? {}), ...(payload.new as TripRow) })),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
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
        <Text style={styles.muted}>Trip not found.</Text>
      </View>
    );
  }

  const isActive = ACTIVE.has(trip.status);
  const fareCents = trip.final_fare_cents ?? trip.estimated_fare_cents;

  return (
    <View style={styles.container}>
      <View style={[styles.statusBox, isActive ? styles.statusActive : styles.statusDone]}>
        {isActive && trip.status !== 'arrived_at_pickup' ? (
          <ActivityIndicator color="#fff" style={{ marginBottom: spacing.sm }} />
        ) : null}
        <Text style={styles.statusText}>{STATUS_LABEL[trip.status] ?? trip.status}</Text>
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
          <Text style={styles.label}>{trip.final_fare_cents != null ? 'Fare' : 'Estimated fare'}</Text>
          <Text style={styles.fare}>{formatMoney(fareCents)}</Text>
        </View>
      ) : null}

      <Text style={styles.note}>
        Live driver tracking appears here once a driver accepts (Phase 3–4). This screen updates in
        realtime as the trip status changes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  statusBox: { borderRadius: 12, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl },
  statusActive: { backgroundColor: colors.brand },
  statusDone: { backgroundColor: colors.success },
  statusText: { color: '#fff', fontSize: typography.size.lg, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  dot: { fontSize: 14, marginRight: spacing.md, marginTop: 2, color: colors.textMuted },
  flex: { flex: 1 },
  label: { fontSize: typography.size.sm, color: colors.textMuted },
  value: { fontSize: typography.size.md, fontWeight: '500' },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  fare: { fontSize: typography.size.xl, fontWeight: '700', color: colors.brand },
  note: { marginTop: spacing.xl, color: colors.textMuted, fontSize: typography.size.sm, lineHeight: 20 },
  muted: { color: colors.textMuted },
});
