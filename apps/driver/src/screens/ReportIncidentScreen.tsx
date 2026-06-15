import { colors, spacing, typography } from '@openride/ui';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { key: 'safety', label: 'Safety' },
  { key: 'vehicle_damage', label: 'Vehicle damage' },
  { key: 'abuse', label: 'Abuse' },
  { key: 'medical', label: 'Medical' },
  { key: 'other', label: 'Other' },
] as const;

const HIGH = new Set(['safety', 'medical', 'abuse']);

export function ReportIncidentScreen({ onDone }: { onDone: () => void }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key']>('safety');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id;
      if (!id) throw new Error('Not signed in');
      const { error } = await supabase.from('incident_reports').insert({
        reported_by: id,
        driver_id: id,
        category,
        severity: HIGH.has(category) ? 'high' : 'low',
        description: description.trim(),
      });
      if (error) throw error;
      Alert.alert('Thank you', 'Your report has been submitted.');
      onDone();
    } catch (e) {
      Alert.alert('Could not submit', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report an issue</Text>
        <Pressable onPress={onDone} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.chip, category === c.key && styles.chipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={category === c.key ? styles.chipTextActive : styles.chipText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Describe what happened…"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <Pressable
        style={[styles.button, (busy || description.trim().length < 5) && styles.disabled]}
        onPress={submit}
        disabled={busy || description.trim().length < 5}
      >
        <Text style={styles.buttonText}>{busy ? 'Submitting…' : 'Submit report'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: typography.size.xl, fontWeight: '600' },
  cancel: { color: colors.textMuted, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  chipText: { color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, fontSize: typography.size.md, minHeight: 120 },
  button: { backgroundColor: colors.brandDark, padding: spacing.lg, borderRadius: 8, alignItems: 'center', marginTop: spacing.xl },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: typography.size.lg },
});
