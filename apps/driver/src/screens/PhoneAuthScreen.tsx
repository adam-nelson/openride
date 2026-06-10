import { colors, spacing, typography } from '@openride/ui';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { sendOtp, verifyOtp } from '../lib/auth';

export function PhoneAuthScreen(): JSX.Element {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);

  async function onSendOtp(): Promise<void> {
    setBusy(true);
    try {
      await sendOtp(phone.trim());
      setStage('code');
    } catch (e) {
      Alert.alert('Could not send code', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(): Promise<void> {
    setBusy(true);
    try {
      await verifyOtp(phone.trim(), code.trim());
    } catch (e) {
      Alert.alert('Code did not match', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OpenRide Driver</Text>
      <Text style={styles.subtitle}>
        {stage === 'phone' ? 'Sign in with your driver phone number' : `Code sent to ${phone}`}
      </Text>

      {stage === 'phone' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="+61 400 000 000"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!busy}
          />
          <Pressable style={styles.button} onPress={onSendOtp} disabled={busy || phone.length < 6}>
            <Text style={styles.buttonText}>Send code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            editable={!busy}
            maxLength={6}
          />
          <Pressable style={styles.button} onPress={onVerify} disabled={busy || code.length < 4}>
            <Text style={styles.buttonText}>Verify</Text>
          </Pressable>
          <Pressable onPress={() => setStage('phone')} disabled={busy}>
            <Text style={styles.link}>Use a different number</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center', backgroundColor: colors.surface },
  title: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.brandDark, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.size.md, color: colors.textMuted, marginBottom: spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.size.md,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.brandDark,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: typography.size.md },
  link: { color: colors.brandDark, textAlign: 'center', fontSize: typography.size.sm },
});
