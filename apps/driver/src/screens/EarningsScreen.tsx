import { formatMoney } from '@openride/ui';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  fetchTodayEarnings,
  type CompletedTripEarning,
} from '../lib/earnings';

interface Props {
  driverId: string;
  onBack: () => void;
}

export function EarningsScreen({ driverId, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [cents, setCents] = useState(0);
  const [trips, setTrips] = useState<CompletedTripEarning[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchTodayEarnings(driverId);
      setCents(result.cents);
      setTrips(result.trips);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{"Today's earnings"}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Gross fares today</Text>
        <Text style={styles.totalValue}>{formatMoney(cents)}</Text>
        <Text style={styles.totalMeta}>
          {trips.length} completed trip{trips.length === 1 ? '' : 's'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No completed trips yet today.</Text>
          }
          renderItem={({ item }) => {
            const fare = item.final_fare_cents ?? item.estimated_fare_cents;
            return (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.route} numberOfLines={2}>
                    {item.pickup_address} → {item.dropoff_address}
                  </Text>
                  <Text style={styles.meta}>
                    {item.completed_at
                      ? new Date(item.completed_at).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '—'}
                  </Text>
                </View>
                <Text style={styles.fare}>{fare != null ? formatMoney(fare) : '—'}</Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0F12' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  totalCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1A1B1E',
  },
  totalLabel: { color: '#9aa0a6', fontSize: 13, fontWeight: '500' },
  totalValue: { color: '#fff', fontSize: 36, fontWeight: '700', marginTop: 4 },
  totalMeta: { color: '#9aa0a6', fontSize: 13, marginTop: 6 },
  empty: { color: '#9aa0a6', textAlign: 'center', marginTop: 24 },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2b2f',
  },
  flex: { flex: 1 },
  route: { color: '#fff', fontSize: 14, fontWeight: '500' },
  meta: { color: '#9aa0a6', fontSize: 12, marginTop: 4 },
  fare: { color: '#3DDC84', fontSize: 15, fontWeight: '700' },
});
