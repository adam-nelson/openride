import { colors, spacing, typography } from '@openride/ui';
import { StyleSheet, Text, View } from 'react-native';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where to?</Text>
      <Text style={styles.muted}>
        Map and booking flow land in Sprint 2. The shell is here so we can wire up auth and
        navigation today.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  title: { fontSize: typography.size.xl, fontWeight: '600', marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: typography.size.md, lineHeight: 22 },
});
