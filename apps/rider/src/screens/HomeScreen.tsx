import type { FareEstimateResponse } from '@openride/api-client';
import { colors, formatDistance, formatDurationS, formatMoney, spacing, typography } from '@openride/ui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RootStackParamList } from '../../App';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';
import { hasGeocoder, reverseGeocode, searchPlaces, type Place } from '../lib/geocode';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const VEHICLE_TYPES = [
  { key: 'sedan', label: 'Sedan' },
  { key: 'wheelchair_accessible', label: 'Wheelchair' },
] as const;

export function HomeScreen({ displayName }: { displayName?: string | null }) {
  const navigation = useNavigation<Nav>();
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [vehicleType, setVehicleType] = useState<string>('sedan');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [estimate, setEstimate] = useState<FareEstimateResponse | null>(null);
  const [locating, setLocating] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(false);
  const searchSeq = useRef(0);

  // Pickup = current location.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (active) setLocating(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (active) {
          setPickup({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: label ?? 'Current location',
          });
        }
      } catch {
        // ignore — rider can still proceed once we have a dropoff + GPS retry
      } finally {
        if (active) setLocating(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Debounced dropoff search.
  useEffect(() => {
    if (dropoff && query === dropoff.label) return;
    const seq = ++searchSeq.current;
    const handle = setTimeout(async () => {
      if (query.trim().length < 3) {
        setResults([]);
        return;
      }
      try {
        const places = await searchPlaces(query, pickup ?? undefined);
        if (seq === searchSeq.current) setResults(places);
      } catch (e) {
        if (seq === searchSeq.current) setResults([]);
        if (!hasGeocoder()) Alert.alert('Search unavailable', (e as Error).message);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query, pickup, dropoff]);

  const onGetEstimate = useCallback(async () => {
    if (!pickup || !dropoff) return;
    setEstimating(true);
    setEstimate(null);
    try {
      const e = await api.fareEstimate({
        pickup: { lat: pickup.lat, lng: pickup.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        vehicle_type: vehicleType,
      });
      setEstimate(e);
    } catch (e) {
      Alert.alert('Could not estimate fare', (e as Error).message);
    } finally {
      setEstimating(false);
    }
  }, [pickup, dropoff, vehicleType]);

  const onAddCard = useCallback(async () => {
    try {
      const { url } = await api.setupCard();
      if (url) await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Add card', (e as Error).message);
    }
  }, []);

  const onBook = useCallback(async () => {
    if (!pickup || !dropoff) return;
    setBooking(true);
    try {
      const { trip_id } = await api.createBooking({
        type: 'now',
        pickup: { lat: pickup.lat, lng: pickup.lng },
        pickup_label: pickup.label,
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        dropoff_label: dropoff.label,
        vehicle_type: vehicleType,
      });
      navigation.navigate('Trip', { tripId: trip_id });
    } catch (e) {
      Alert.alert('Could not book', (e as Error).message);
    } finally {
      setBooking(false);
    }
  }, [pickup, dropoff, vehicleType, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.hi}>Hi{displayName ? `, ${displayName}` : ''} 👋</Text>
        <View style={styles.headerLinks}>
          <Pressable onPress={() => navigation.navigate('Receipts')} hitSlop={8}>
            <Text style={styles.link}>Receipts</Text>
          </Pressable>
          <Pressable onPress={onAddCard} hitSlop={8}>
            <Text style={styles.link}>Add card</Text>
          </Pressable>
          <Pressable onPress={() => void signOut()} hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.label}>Pickup</Text>
      <View style={styles.fieldBox}>
        {locating ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.fieldText}>{pickup?.label ?? 'Location unavailable'}</Text>
        )}
      </View>

      <Text style={styles.label}>Where to?</Text>
      <TextInput
        style={styles.input}
        placeholder="Search destination"
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setDropoff(null);
          setEstimate(null);
        }}
        autoCorrect={false}
      />
      {results.length > 0 && !dropoff ? (
        <FlatList
          style={styles.results}
          data={results}
          keyExtractor={(item, i) => `${item.label}-${i}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultRow}
              onPress={() => {
                setDropoff(item);
                setQuery(item.label);
                setResults([]);
              }}
            >
              <Text numberOfLines={1}>{item.label}</Text>
            </Pressable>
          )}
        />
      ) : null}

      <Text style={styles.label}>Vehicle</Text>
      <View style={styles.vehicleRow}>
        {VEHICLE_TYPES.map((v) => (
          <Pressable
            key={v.key}
            style={[styles.chip, vehicleType === v.key && styles.chipActive]}
            onPress={() => {
              setVehicleType(v.key);
              setEstimate(null);
            }}
          >
            <Text style={vehicleType === v.key ? styles.chipTextActive : styles.chipText}>
              {v.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {estimate ? (
        <View style={styles.estimateBox}>
          <Text style={styles.fare}>{formatMoney(estimate.total_cents)}</Text>
          <Text style={styles.muted}>
            {formatDistance(estimate.distance_m)} · {formatDurationS(estimate.duration_s)}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {!estimate ? (
          <Pressable
            style={[styles.button, (!pickup || !dropoff) && styles.disabled]}
            onPress={onGetEstimate}
            disabled={!pickup || !dropoff || estimating}
          >
            <Text style={styles.buttonText}>{estimating ? 'Estimating…' : 'Get fare estimate'}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.button} onPress={onBook} disabled={booking}>
            <Text style={styles.buttonText}>{booking ? 'Booking…' : 'Book now'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerLinks: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  link: { color: colors.brand, fontSize: typography.size.sm, fontWeight: '600' },
  hi: { fontSize: typography.size.lg, fontWeight: '600' },
  signOut: { color: colors.danger, fontSize: typography.size.sm, fontWeight: '600' },
  label: { fontSize: typography.size.sm, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
  fieldBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    minHeight: 48,
    justifyContent: 'center',
  },
  fieldText: { fontSize: typography.size.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.size.md,
  },
  results: { maxHeight: 180, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: spacing.xs },
  resultRow: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  vehicleRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  estimateBox: { marginTop: spacing.xl, alignItems: 'center' },
  fare: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.brand },
  muted: { color: colors.textMuted, fontSize: typography.size.md },
  actions: { marginTop: 'auto' },
  button: { backgroundColor: colors.brand, padding: spacing.lg, borderRadius: 8, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: typography.size.lg },
});
