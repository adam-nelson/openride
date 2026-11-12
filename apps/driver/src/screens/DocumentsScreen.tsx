import { colors, spacing, typography } from '@openride/ui';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZoluLogo } from '../components/ZoluLogo';
import {
  type DriverDocument,
  type DriverDocumentType,
} from '../lib/driver-state';

interface Props {
  driverId: string;
  documents: DriverDocument[];
  onBack: () => void;
  onSubmit: (uploadedTypes: DriverDocumentType[]) => Promise<void>;
  onPreviewVerify?: () => Promise<void>;
  preview?: boolean;
}

export function DocumentsScreen({ documents, onBack, onSubmit, onPreviewVerify, preview = false }: Props) {
  const [uploaded, setUploaded] = useState<Set<DriverDocumentType>>(
    () => new Set(documents.filter((document) => document.uploaded && document.status !== 'verified').map((document) => document.type)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function mockUpload(type: DriverDocumentType): void {
    setUploaded((current) => new Set(current).add(type));
  }

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await onSubmit([...uploaded]);
      setMessage(preview ? 'Renewal submitted and saved in this preview.' : 'Documents submitted for review.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function simulatePreviewVerification(): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await onPreviewVerify?.();
      setMessage('Preview verification simulated locally. No review record was changed.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <View style={styles.titleHeader}>
        <ZoluLogo size={28} />
        <Text style={styles.title}>Driver documents</Text>
      </View>
      <Text style={styles.muted}>
        {preview ? 'Lagos driver compliance records' : 'Submit your documents for admin review.'}
      </Text>

      <View style={styles.list}>
        {documents.map((document) => {
          const { type } = document;
          const verified = document?.status === 'verified';
          const isUploaded = uploaded.has(type);
          const expiringSoon = document.expiringSoon ?? false;
          const statusLabel = document.renewalSubmitted
            ? 'Renewal submitted'
            : expiringSoon
              ? 'Expiring Soon'
              : verified
                ? 'Verified'
                : isUploaded
                  ? 'Uploaded'
                  : document.uploaded
                    ? 'Pending review'
                    : 'Required';
          const statusStyle = expiringSoon ? styles.warning : verified ? styles.verified : styles.muted;
          const canRenew = expiringSoon && !document.renewalSubmitted;
          return (
            <View key={type} style={styles.documentRow}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{document.label ?? type}</Text>
                <Text style={statusStyle}>
                  {statusLabel}
                  {document.expiryLabel ? ` · ${document.expiryLabel}` : ''}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={[styles.uploadButton, ((verified && !canRenew) || isUploaded || busy) && styles.disabled]}
                disabled={(verified && !canRenew) || isUploaded || busy}
                onPress={() => mockUpload(type)}
              >
                <Text style={styles.uploadText}>
                  {document.renewalSubmitted ? 'Submitted' : isUploaded ? 'Selected' : canRenew ? 'Renew' : verified ? 'Verified' : 'Mock Upload'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <View style={styles.actions}>
        {uploaded.size > 0 ? (
          <Pressable
            accessibilityRole="button"
            style={[styles.submitButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void submit()}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for Review</Text>}
          </Pressable>
        ) : null}
        {__DEV__ && preview && onPreviewVerify ? (
          <Pressable
            accessibilityRole="button"
            style={[styles.verifyButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void simulatePreviewVerification()}
          >
            <Text style={styles.submitText}>Simulate Verification (Preview Only)</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  back: { alignSelf: 'flex-start', marginBottom: spacing.lg },
  backText: { color: colors.brandDark, fontSize: typography.size.md, fontWeight: '600' },
  titleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textMuted, fontSize: typography.size.sm },
  list: { marginTop: spacing.xl, borderTopWidth: 1, borderColor: colors.border },
  documentRow: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  documentInfo: { gap: spacing.xs },
  documentName: { color: colors.text, fontSize: typography.size.md, fontWeight: '600' },
  verified: { color: colors.online, fontSize: typography.size.sm, fontWeight: '600' },
  warning: { color: '#b45309', fontSize: typography.size.sm, fontWeight: '700' },
  uploadButton: { backgroundColor: colors.brandDark, borderRadius: 8, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  uploadText: { color: '#fff', fontSize: typography.size.sm, fontWeight: '600' },
  disabled: { opacity: 0.55 },
  error: { color: colors.danger, fontSize: typography.size.sm, marginTop: spacing.md },
  success: { color: colors.online, fontSize: typography.size.sm, fontWeight: '600', marginTop: spacing.md },
  actions: { marginTop: 'auto' },
  submitButton: { backgroundColor: colors.brandDark, borderRadius: 8, padding: spacing.lg, alignItems: 'center' },
  verifyButton: { backgroundColor: colors.online, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  submitText: { color: '#fff', fontSize: typography.size.md, fontWeight: '600' },
});
