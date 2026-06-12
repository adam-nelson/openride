import { colors, spacing, typography } from '@openride/ui';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { signOut } from '../lib/auth';

export function HomeScreen({ displayName }: { displayName?: string | null }) {
  const [online, setOnline] = useState(false);

  async function onSignOut(): Promise<void> {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Could not sign out', (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.hi}>{displayName ?? 'Driver'}</Text>
        <Pressable onPress={onSignOut} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <View style={[styles.statusPill, online ? styles.onlinePill : styles.offlinePill]}>
        <Text style={styles.statusText}>{online ? 'Online' : 'Offline'}</Text>
      </View>

      <Text style={styles.headline}>{online ? 'Waiting for an offer…' : 'You are offline'}</Text>
      <Text style={styles.muted}>
        Going online will share your location and make you available for offers. Phase 3 wires the
        go-online call to the backend.
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  hi: { fontSize: typography.size.lg, fontWeight: '600' },
  signOut: { color: colors.danger, fontSize: typography.size.sm, fontWeight: '600' },
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
