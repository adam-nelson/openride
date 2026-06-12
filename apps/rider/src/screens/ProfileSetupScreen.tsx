import { colors, spacing, typography } from '@openride/ui';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { completeProfile } from '../lib/auth';

export function ProfileSetupScreen({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSave(): Promise<void> {
    setBusy(true);
    try {
      await completeProfile(name, email);
      onDone();
    } catch (e) {
      Alert.alert('Could not save profile', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.subtitle}>Tell us your name so drivers know who to pick up.</Text>

      <TextInput
        style={styles.input}
        placeholder="First name"
        value={name}
        onChangeText={setName}
        editable={!busy}
        autoFocus
      />
      <TextInput
        style={styles.input}
        placeholder="Email (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <Pressable style={styles.button} onPress={onSave} disabled={busy || name.trim().length < 1}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Continue'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center', backgroundColor: colors.surface },
  title: { fontSize: typography.size.xxl, fontWeight: '700', marginBottom: spacing.sm },
  subtitle: { fontSize: typography.size.md, color: colors.textMuted, marginBottom: spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.size.md,
    marginBottom: spacing.md,
  },
  button: { backgroundColor: colors.brand, padding: spacing.md, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: typography.size.md },
});
