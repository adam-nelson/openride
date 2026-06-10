import { colors, spacing, typography } from '@openride/ui';
import type { RouteProp } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../../App';

type Props = { route: RouteProp<RootStackParamList, 'Trip'> };

export function TripScreen({ route }: Props): JSX.Element {
  const { tripId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip {tripId.slice(0, 8)}</Text>
      <Text style={styles.muted}>
        Live driver tracking and status updates land in Sprint 2.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  title: { fontSize: typography.size.xl, fontWeight: '600', marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: typography.size.md, lineHeight: 22 },
});
