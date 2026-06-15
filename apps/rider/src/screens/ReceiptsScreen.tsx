import { colors, formatMoney, spacing, typography } from '@openride/ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';

interface Receipt {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  final_fare_cents: number | null;
  estimated_fare_cents: number | null;
  payment_status: string;
  completed_at: string | null;
}

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Paid',
  pending: 'Payment pending',
  authorised: 'Authorised',
  failed: 'Payment failed',
  refunded: 'Refunded',
  waived: 'Waived',
};

export function ReceiptsScreen() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase
      .from('trips')
      .select('id, status, pickup_address, dropoff_address, final_fare_cents, estimated_fare_cents, payment_status, completed_at')
      .in('status', ['completed', 'cancelled', 'no_show'])
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return;
        setReceipts((data as Receipt[]) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ padding: spacing.lg }}
      data={receipts}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={<Text style={styles.muted}>No past trips yet.</Text>}
      renderItem={({ item }) => {
        const fare = item.final_fare_cents ?? item.estimated_fare_cents;
        return (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.route} numberOfLines={1}>
                {item.pickup_address} → {item.dropoff_address}
              </Text>
              <Text style={styles.meta}>
                {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : item.status} ·{' '}
                {PAYMENT_LABEL[item.payment_status] ?? item.payment_status}
              </Text>
            </View>
            <Text style={styles.fare}>{fare != null ? formatMoney(fare) : '—'}</Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  flex: { flex: 1, marginRight: spacing.md },
  route: { fontSize: typography.size.md, fontWeight: '500' },
  meta: { fontSize: typography.size.sm, color: colors.textMuted, marginTop: 2 },
  fare: { fontSize: typography.size.lg, fontWeight: '700', color: colors.brand },
  muted: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
