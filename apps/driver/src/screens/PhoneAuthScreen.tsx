import { colors, spacing, typography } from '@openride/ui';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZoluLogo } from '../components/ZoluLogo';
import { sendOtp, verifyOtp } from '../lib/auth';
import {
  normalizeSupportedPhoneNumber,
  phoneAuthErrorMessage,
  resendSecondsRemaining,
  RESEND_COOLDOWN_SECONDS,
} from '../lib/phone-auth';

export function PhoneAuthScreen({ onDevBypass }: { onDevBypass: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const busyRef = useRef(false);
  const normalizedPhone = normalizeSupportedPhoneNumber(phone);
  const resendSeconds = resendSecondsRemaining(resendAt, clock);

  useEffect(() => {
    if (stage !== 'code' || resendSeconds === 0) return undefined;
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, [resendSeconds, stage]);

  async function onSendOtp(): Promise<void> {
    if (busyRef.current) return;
    const e164Phone = normalizeSupportedPhoneNumber(phone);
    if (!e164Phone) {
      setError('Enter a mobile number in E.164 format, such as +2348012345678 or +61412345678.');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendOtp(e164Phone);
      setPhone(e164Phone);
      setCode('');
      setStage('code');
      setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setClock(Date.now());
    } catch (e) {
      setError(phoneAuthErrorMessage(e, 'send'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function onVerify(): Promise<void> {
    if (busyRef.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code that was sent to your phone.');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const session = await verifyOtp(phone, code);
      if (!session) throw new Error('Verification did not return an active session.');
    } catch (e) {
      setError(phoneAuthErrorMessage(e, 'verify'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function onResend(): Promise<void> {
    if (busyRef.current || resendSeconds > 0) return;
    await onSendOtp();
  }

  function onChangeNumber(): void {
    if (busyRef.current) return;
    setStage('phone');
    setCode('');
    setError(null);
    setResendAt(0);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.brand}>
        <ZoluLogo size={72} />
        <Text style={styles.title}>ZoluRide Driver</Text>
      </View>
      <Text style={styles.subtitle}>
        {stage === 'phone' ? 'Sign in with your driver phone number' : `Code sent to ${phone}`}
      </Text>
      {__DEV__ ? (
        <Text style={styles.testMode}>
          Developer test mode: configured local test numbers use a fixed code; no SMS is sent.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {stage === 'phone' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="+2348012345678 or +61412345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!busy}
          />
          {phone.length > 0 && !normalizedPhone ? (
            <Text style={styles.hint}>Use E.164 format: +234 followed by 10 digits or +61 followed by 9 digits.</Text>
          ) : null}
          <Pressable style={[styles.button, (busy || !normalizedPhone) && styles.disabled]} onPress={() => void onSendOtp()} disabled={busy || !normalizedPhone}>
            {busy ? <Text style={styles.buttonText}>Sending code…</Text> : <Text style={styles.buttonText}>Send code</Text>}
          </Pressable>
          {__DEV__ ? (
            <Pressable style={styles.devButton} onPress={onDevBypass}>
              <Text style={styles.devButtonText}>Dev Bypass Login</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Six-digit code"
            keyboardType="number-pad"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            editable={!busy}
            maxLength={6}
          />
          <Pressable style={[styles.button, (busy || code.length !== 6) && styles.disabled]} onPress={() => void onVerify()} disabled={busy || code.length !== 6}>
            {busy ? <Text style={styles.buttonText}>Verifying…</Text> : <Text style={styles.buttonText}>Verify and sign in</Text>}
          </Pressable>
          <Pressable onPress={() => void onResend()} disabled={busy || resendSeconds > 0}>
            <Text style={[styles.link, (busy || resendSeconds > 0) && styles.disabledText]}>
              {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
            </Text>
          </Pressable>
          <Pressable style={styles.changeNumber} onPress={onChangeNumber} disabled={busy}>
            <Text style={styles.link}>Use a different number</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center', backgroundColor: colors.surface },
  brand: { alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  title: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.brandDark },
  subtitle: { fontSize: typography.size.md, color: colors.textMuted, marginBottom: spacing.xl },
  testMode: { color: colors.brandDark, fontSize: typography.size.xs, fontWeight: '600', marginBottom: spacing.md },
  hint: { color: colors.danger, fontSize: typography.size.xs, marginBottom: spacing.sm },
  error: {
    color: colors.danger,
    fontSize: typography.size.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
  },
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
  disabled: { opacity: 0.5 },
  disabledText: { opacity: 0.55 },
  devButton: {
    borderWidth: 1,
    borderColor: colors.brandDark,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  devButtonText: { color: colors.brandDark, fontWeight: '600', fontSize: typography.size.md },
  link: { color: colors.brandDark, textAlign: 'center', fontSize: typography.size.sm, padding: spacing.xs },
  changeNumber: { marginTop: spacing.sm },
});
