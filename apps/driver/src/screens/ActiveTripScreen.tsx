import { colors, formatMoney, spacing, typography } from '@openride/ui';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ActiveTrip } from '../lib/driver-state';

type Event = 'arrived' | 'start' | 'complete' | 'cancel';

interface Props {
  trip: ActiveTrip;
  onEvent: (event: Event, reason?: string) => Promise<void>;
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Head to pickup',
  driver_en_route: 'Heading to pickup',
  arrived_at_pickup: 'At pickup',
  in_progress: 'Trip in progress',
};

export function ActiveTripScreen({ trip, onEvent }: Props) {
  const [busy, setBusy] = useState(false);

  function navigateTo(address: string): void {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    void Linking.openURL(url);
  }

  async function run(event: Event): Promise<void> {
    setBusy(true);
    try {
      await onEvent(event);
    } catch (e) {
      Alert.alert('Action failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inProgress = trip.status === 'in_progress';
  const target = inProgress ? trip.dropoff_address : trip.pickup_address;
  const fareCents = trip.final_fare_cents ?? trip.estimated_fare_cents;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <Text style={styles.status}>{STATUS_LABEL[trip.status] ?? trip.status}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Pickup</Text>
        <Text style={styles.value}>{trip.pickup_address}</Text>
        <Text style={[styles.label, { marginTop: spacing.md }]}>Dropoff</Text>
        <Text style={styles.value}>{trip.dropoff_address}</Text>
        {fareCents != null ? <Text style={styles.fare}>{formatMoney(fareCents)}</Text> : null}
      </View>

      <Pressable style={styles.navButton} onPress={() => navigateTo(target)}>
        <Text style={styles.navText}>Navigate to {inProgress ? 'destination' : 'pickup'}</Text>
      </Pressable>

      <View style={styles.actions}>
        {(trip.status === 'assigned' || trip.status === 'driver_en_route') && (
          <PrimaryButton label="Arrived at pickup" busy={busy} onPress={() => run('arrived')} />
        )}
        {trip.status === 'arrived_at_pickup' && (
          <PrimaryButton label="Start trip" busy={busy} onPress={() => run('start')} />
        )}
        {trip.status === 'in_progress' && (
          <PrimaryButton label="Complete trip" busy={busy} onPress={() => run('complete')} />
        )}
        {!inProgress && (
          <Pressable style={styles.cancel} onPress={() => run('cancel')} disabled={busy}>
            <Text style={styles.cancelText}>Cancel trip</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function PrimaryButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, busy && styles.disabled]} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  status: { fontSize: typography.size.xl, fontWeight: '700', marginBottom: spacing.lg },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.lg },
  label: { fontSize: typography.size.sm, color: colors.textMuted },
  value: { fontSize: typography.size.md, fontWeight: '600' },
  fare: { fontSize: typography.size.xl, fontWeight: '700', color: colors.brand, marginTop: spacing.md },
  navButton: { borderWidth: 1, borderColor: colors.brandDark, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  navText: { color: colors.brandDark, fontWeight: '600', fontSize: typography.size.md },
  actions: { marginTop: 'auto', gap: spacing.sm },
  button: { backgroundColor: colors.brandDark, padding: spacing.lg, borderRadius: 8, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: typography.size.lg },
  cancel: { padding: spacing.md, alignItems: 'center' },
  cancelText: { color: colors.danger, fontWeight: '600' },
});
