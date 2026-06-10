import { colors, spacing, typography } from '@openride/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function OfferScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.eta}>4 min</Text>
      <Text style={styles.distance}>1.6 km to pickup</Text>
      <Text style={styles.fare}>$24.30</Text>

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.decline]}>
          <Text style={styles.buttonText}>Decline</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.accept]}>
          <Text style={styles.buttonText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.brandDark, justifyContent: 'center' },
  eta: { fontSize: 64, color: '#fff', fontWeight: '700', textAlign: 'center' },
  distance: { fontSize: typography.size.lg, color: '#fff', opacity: 0.85, textAlign: 'center', marginBottom: spacing.lg },
  fare: { fontSize: typography.size.xxl, color: '#fff', textAlign: 'center', marginBottom: spacing.xxl },
  actions: { flexDirection: 'row', gap: spacing.md },
  button: { flex: 1, padding: spacing.lg, borderRadius: 8, alignItems: 'center' },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.success },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: typography.size.lg },
});
