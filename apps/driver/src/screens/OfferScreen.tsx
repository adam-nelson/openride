import { colors, formatDistance, formatDurationS, formatMoney, spacing, typography } from '@openride/ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PendingOffer } from '../lib/driver-state';

interface Props {
  offer: PendingOffer;
  onAccept: (tripId: string) => Promise<void>;
  onDecline: (tripId: string) => Promise<void>;
}

export function OfferScreen({ offer, onAccept, onDecline }: Props) {
  const [remaining, setRemaining] = useState(() => secsUntil(offer.responds_by));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setRemaining(secsUntil(offer.responds_by)), 250);
    return () => clearInterval(id);
  }, [offer.responds_by]);

  const expired = remaining <= 0;
  const trip = offer.trips;

  async function act(fn: (id: string) => Promise<void>, label: string): Promise<void> {
    setBusy(true);
    try {
      await fn(offer.trip_id);
    } catch (e) {
      Alert.alert(`Could not ${label}`, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countdown}>{expired ? 'Expired' : `${remaining}s`}</Text>
      {offer.pickup_eta_s != null ? (
        <Text style={styles.sub}>
          {formatDurationS(offer.pickup_eta_s)} to pickup
          {offer.distance_to_pickup_m != null ? ` · ${formatDistance(offer.distance_to_pickup_m)}` : ''}
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Pickup</Text>
        <Text style={styles.value}>{trip?.pickup_address ?? '—'}</Text>
        <Text style={[styles.label, { marginTop: spacing.md }]}>Dropoff</Text>
        <Text style={styles.value}>{trip?.dropoff_address ?? '—'}</Text>
        {trip?.estimated_fare_cents != null ? (
          <Text style={styles.fare}>{formatMoney(trip.estimated_fare_cents)}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.decline]}
          onPress={() => act(onDecline, 'decline')}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Decline</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.accept, (expired || busy) && styles.disabled]}
          onPress={() => act(onAccept, 'accept')}
          disabled={expired || busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accept</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function secsUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.brandDark, justifyContent: 'center' },
  countdown: { fontSize: 72, color: '#fff', fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: typography.size.lg, color: '#fff', opacity: 0.85, textAlign: 'center', marginBottom: spacing.xl },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: spacing.lg, marginBottom: spacing.xxl },
  label: { fontSize: typography.size.sm, color: colors.textMuted },
  value: { fontSize: typography.size.md, fontWeight: '600' },
  fare: { fontSize: typography.size.xl, fontWeight: '700', color: colors.brand, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  button: { flex: 1, padding: spacing.lg, borderRadius: 8, alignItems: 'center' },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.success },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: typography.size.lg },
});
