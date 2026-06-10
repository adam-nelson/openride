import { colors, spacing, typography } from '@openride/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function HomeScreen(): JSX.Element {
  const [online, setOnline] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.statusPill, online ? styles.onlinePill : styles.offlinePill]}>
        <Text style={styles.statusText}>{online ? 'Online' : 'Offline'}</Text>
      </View>

      <Text style={styles.headline}>
        {online ? 'Waiting for an offer…' : 'You are offline'}
      </Text>
      <Text style={styles.muted}>
        Going online will share your location and make you available for offers. Sprint 3 wires the
        actual go-online call to the backend.
      </Text>

      <Pressable
        style={[styles.button, online ? styles.danger : styles.primary]}
        onPress={() => setOnline((v) => !v)}
      >
        <Text style={styles.buttonText}>{online ? 'Go offline' : 'Go online'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  statusPill: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    marginBottom: spacing.lg,
  },
  onlinePill: { backgroundColor: colors.online },
  offlinePill: { backgroundColor: colors.offline },
  statusText: { color: '#fff', fontWeight: '600' },
  headline: { fontSize: typography.size.xl, fontWeight: '600', marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: typography.size.md, lineHeight: 22, marginBottom: spacing.xl },
  button: { padding: spacing.lg, borderRadius: 8, alignItems: 'center' },
  primary: { backgroundColor: colors.brandDark },
  danger: { backgroundColor: colors.danger },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: typography.size.lg },
});
