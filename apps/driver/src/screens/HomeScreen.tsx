import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '@openride/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DriverMap, type DriverMapHandle } from '../components/DriverMap';
import { signOut } from '../lib/auth';
import {
  clearDestinationFilter,
  loadDestinationFilter,
  saveDestinationFilter,
  type DestinationFilter,
} from '../lib/destination';
import { fetchMyVehicles, type Vehicle } from '../lib/driver-state';
import { fetchTodayEarnings } from '../lib/earnings';
import { hasGeocoder, searchPlaces, type Place } from '../lib/geocode';
import {
  getLastKnownCoords,
  requestCurrentCoords,
  subscribeLocation,
  type LatLng,
} from '../lib/location';

type Sheet = 'none' | 'settings' | 'menu' | 'search' | 'destination' | 'promos' | 'vehicle';

interface Props {
  driverId: string;
  displayName?: string | null;
  online: boolean;
  onGoOnline: (vehicleId: string) => Promise<void>;
  onGoOffline: () => Promise<void>;
  onReport: () => void;
  onOpenEarnings: () => void;
}

export function HomeScreen({
  driverId,
  displayName,
  online,
  onGoOnline,
  onGoOffline,
  onReport,
  onOpenEarnings,
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<DriverMapHandle>(null);
  const [coords, setCoords] = useState<LatLng | null>(getLastKnownCoords());
  const [earningsCents, setEarningsCents] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [destination, setDestination] = useState<DestinationFilter | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<Sheet>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [destMode, setDestMode] = useState(false);

  const bottomBarHeight = 64 + Math.max(insets.bottom, 8);

  const refreshEarnings = useCallback(async () => {
    try {
      const result = await fetchTodayEarnings(driverId);
      setEarningsCents(result.cents);
      setTripCount(result.trips.length);
    } catch {
      // keep last known
    }
  }, [driverId]);

  useEffect(() => {
    void requestCurrentCoords().then((c) => {
      if (c) setCoords(c);
    });
    return subscribeLocation(setCoords);
  }, []);

  useEffect(() => {
    void refreshEarnings();
    const id = setInterval(() => void refreshEarnings(), 60_000);
    return () => clearInterval(id);
  }, [refreshEarnings]);

  useEffect(() => {
    void loadDestinationFilter().then(setDestination);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchMyVehicles(driverId).then((vs) => {
      if (!active) return;
      setVehicles(vs);
      setSelectedVehicle((cur) => cur ?? vs[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [driverId]);

  useEffect(() => {
    if ((sheet !== 'search' && sheet !== 'destination') || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    if (!hasGeocoder()) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchPlaces(searchQuery, coords ?? undefined)
        .then((places) => {
          if (!cancelled) setSearchResults(places);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, sheet, coords]);

  async function toggleOnline(): Promise<void> {
    if (busy) return;
    if (!online) {
      if (!selectedVehicle) {
        setSheet('vehicle');
        return;
      }
      setBusy(true);
      try {
        await onGoOnline(selectedVehicle);
      } catch (e) {
        Alert.alert('Could not go online', (e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      await onGoOffline();
    } catch (e) {
      Alert.alert('Could not go offline', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openSearch(forDestination: boolean): void {
    setDestMode(forDestination);
    setSearchQuery('');
    setSearchResults([]);
    setSheet(forDestination ? 'destination' : 'search');
  }

  async function selectPlace(place: Place): Promise<void> {
    if (destMode || sheet === 'destination') {
      const dest = { label: place.label, lat: place.lat, lng: place.lng };
      await saveDestinationFilter(dest);
      setDestination(dest);
      mapRef.current?.flyTo(dest, 13);
      setSheet('none');
      return;
    }
    mapRef.current?.flyTo({ lat: place.lat, lng: place.lng }, 14);
    setSheet('none');
  }

  async function clearDestination(): Promise<void> {
    await clearDestinationFilter();
    setDestination(null);
    setSheet('none');
  }

  function navigateToDestination(): void {
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    void Linking.openURL(url);
  }

  function recenter(): void {
    void requestCurrentCoords().then((c) => {
      if (c) {
        setCoords(c);
        mapRef.current?.recenter(c);
      } else {
        mapRef.current?.recenter(coords);
      }
    });
  }

  return (
    <View style={styles.root}>
      <DriverMap
        ref={mapRef}
        coords={coords}
        destination={destination}
        bottomInset={bottomBarHeight + 16}
      />

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <RoundButton
            icon="home-outline"
            onPress={() => setSheet('menu')}
            accessibilityLabel="Home menu"
          />
          <Pressable
            style={styles.earningsPill}
            onPress={onOpenEarnings}
            accessibilityLabel="Today's earnings"
          >
            <Text style={styles.earningsDollar}>$</Text>
            <Text style={styles.earningsAmount}>
              {(earningsCents / 100).toFixed(2)}
            </Text>
          </Pressable>
          <RoundButton
            icon="search"
            onPress={() => openSearch(false)}
            accessibilityLabel="Search map"
          />
        </View>
      </SafeAreaView>

      <View
        style={[styles.sideControls, { bottom: bottomBarHeight + 20 }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.shieldBtn}
          onPress={onReport}
          accessibilityLabel="Safety and report"
        >
          <Ionicons name="shield-checkmark" size={22} color="#4C8DFF" />
        </Pressable>

        <View style={styles.fabStack}>
          <RoundButton
            icon="flash"
            onPress={() => setSheet('promos')}
            accessibilityLabel="Promotions"
          />
          <Pressable
            style={[styles.roundBtn, destination ? styles.destActive : null]}
            onPress={() => openSearch(true)}
            onLongPress={() => {
              if (destination) void clearDestination();
            }}
            accessibilityLabel="Set destination filter"
          >
            <View style={styles.destFabInner}>
              <Ionicons name="add" size={18} color={destination ? '#111' : '#fff'} />
              <Text style={[styles.destA, destination && { color: '#111' }]}>A</Text>
            </View>
          </Pressable>
          <RoundButton
            icon="locate"
            onPress={recenter}
            accessibilityLabel="Recenter map"
          />
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable
          style={styles.barIcon}
          onPress={() => setSheet('settings')}
          accessibilityLabel="Settings"
        >
          <Ionicons name="options-outline" size={22} color="#fff" />
        </Pressable>

        <Pressable
          style={styles.statusCenter}
          onPress={() => void toggleOnline()}
          disabled={busy}
          accessibilityLabel={online ? 'Go offline' : 'Go online'}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.statusTitle}>
                {online ? "You're online" : "You're offline"}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    online ? styles.progressOnline : styles.progressOffline,
                  ]}
                />
              </View>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.barIcon}
          onPress={() => setSheet('menu')}
          accessibilityLabel="Menu"
        >
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
      </View>

      <Modal
        visible={sheet !== 'none'}
        animationType="slide"
        transparent
        onRequestClose={() => setSheet('none')}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet('none')} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {sheet === 'settings' || sheet === 'vehicle' ? (
            <SettingsSheet
              displayName={displayName}
              online={online}
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              onClose={() => setSheet('none')}
              onGoOnline={async () => {
                if (!selectedVehicle) {
                  Alert.alert('Select a vehicle', 'Choose a vehicle before going online.');
                  return;
                }
                setBusy(true);
                try {
                  await onGoOnline(selectedVehicle);
                  setSheet('none');
                } catch (e) {
                  Alert.alert('Could not go online', (e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}

          {sheet === 'menu' ? (
            <MenuSheet
              displayName={displayName}
              earningsLabel={formatMoney(earningsCents)}
              tripCount={tripCount}
              destination={destination}
              onEarnings={() => {
                setSheet('none');
                onOpenEarnings();
              }}
              onReport={() => {
                setSheet('none');
                onReport();
              }}
              onDestination={() => openSearch(true)}
              onClearDestination={() => void clearDestination()}
              onNavigateDestination={navigateToDestination}
              onSignOut={() => void signOut()}
              onClose={() => setSheet('none')}
            />
          ) : null}

          {sheet === 'search' || sheet === 'destination' ? (
            <SearchSheet
              title={sheet === 'destination' ? 'Destination filter' : 'Search map'}
              query={searchQuery}
              onChangeQuery={setSearchQuery}
              results={searchResults}
              searching={searching}
              geocoderReady={hasGeocoder()}
              destination={sheet === 'destination' ? destination : null}
              onSelect={selectPlace}
              onClearDestination={
                sheet === 'destination' ? () => void clearDestination() : undefined
              }
              onClose={() => setSheet('none')}
            />
          ) : null}

          {sheet === 'promos' ? (
            <PromosSheet
              earningsCents={earningsCents}
              tripCount={tripCount}
              online={online}
              onClose={() => setSheet('none')}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function RoundButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      style={styles.roundBtn}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={20} color="#fff" />
    </Pressable>
  );
}

function SettingsSheet({
  displayName,
  online,
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onClose,
  onGoOnline,
}: {
  displayName?: string | null;
  online: boolean;
  vehicles: Vehicle[];
  selectedVehicle: string | null;
  onSelectVehicle: (id: string) => void;
  onClose: () => void;
  onGoOnline: () => Promise<void>;
}) {
  return (
    <View>
      <SheetHeader title="Settings" onClose={onClose} />
      <Text style={styles.sheetMuted}>{displayName ?? 'Driver'}</Text>
      <Text style={styles.sectionLabel}>Vehicle</Text>
      {vehicles.length === 0 ? (
        <Text style={styles.sheetMuted}>
          No active vehicle assigned. An admin needs to add one before you can go online.
        </Text>
      ) : (
        vehicles.map((v) => (
          <Pressable
            key={v.id}
            style={[styles.vehicleRow, selectedVehicle === v.id && styles.vehicleActive]}
            onPress={() => onSelectVehicle(v.id)}
            disabled={online}
          >
            <Text style={styles.vehicleRego}>{v.rego}</Text>
            <Text style={styles.sheetMuted}>
              {v.make} {v.model} · {v.vehicle_type}
            </Text>
          </Pressable>
        ))
      )}
      {!online && selectedVehicle ? (
        <Pressable style={styles.primaryBtn} onPress={() => void onGoOnline()}>
          <Text style={styles.primaryBtnText}>Go online with this vehicle</Text>
        </Pressable>
      ) : null}
      {online ? (
        <Text style={[styles.sheetMuted, { marginTop: 12 }]}>
          Go offline from the status bar to change vehicle.
        </Text>
      ) : null}
    </View>
  );
}

function MenuSheet({
  displayName,
  earningsLabel,
  tripCount,
  destination,
  onEarnings,
  onReport,
  onDestination,
  onClearDestination,
  onNavigateDestination,
  onSignOut,
  onClose,
}: {
  displayName?: string | null;
  earningsLabel: string;
  tripCount: number;
  destination: DestinationFilter | null;
  onEarnings: () => void;
  onReport: () => void;
  onDestination: () => void;
  onClearDestination: () => void;
  onNavigateDestination: () => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  return (
    <View>
      <SheetHeader title={displayName ?? 'Menu'} onClose={onClose} />
      <MenuRow
        icon="cash-outline"
        label={`Today ${earningsLabel}`}
        meta={`${tripCount} trips`}
        onPress={onEarnings}
      />
      <MenuRow
        icon="navigate-outline"
        label={destination ? 'Change destination filter' : 'Set destination filter'}
        meta={destination?.label}
        onPress={onDestination}
      />
      {destination ? (
        <>
          <MenuRow
            icon="map-outline"
            label="Navigate to destination"
            onPress={onNavigateDestination}
          />
          <MenuRow
            icon="close-circle-outline"
            label="Clear destination filter"
            onPress={onClearDestination}
          />
        </>
      ) : null}
      <MenuRow icon="shield-checkmark-outline" label="Report an incident" onPress={onReport} />
      <MenuRow icon="log-out-outline" label="Sign out" danger onPress={onSignOut} />
    </View>
  );
}

function SearchSheet({
  title,
  query,
  onChangeQuery,
  results,
  searching,
  geocoderReady,
  destination,
  onSelect,
  onClearDestination,
  onClose,
}: {
  title: string;
  query: string;
  onChangeQuery: (q: string) => void;
  results: Place[];
  searching: boolean;
  geocoderReady: boolean;
  destination: DestinationFilter | null;
  onSelect: (place: Place) => void | Promise<void>;
  onClearDestination?: () => void;
  onClose: () => void;
}) {
  return (
    <View style={{ maxHeight: '80%' }}>
      <SheetHeader title={title} onClose={onClose} />
      {!geocoderReady ? (
        <Text style={styles.sheetMuted}>
          Set EXPO_PUBLIC_MAPTILER_KEY to enable place search.
        </Text>
      ) : (
        <>
          <TextInput
            style={styles.searchInput}
            placeholder="Search places…"
            placeholderTextColor="#6b7280"
            value={query}
            onChangeText={onChangeQuery}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching ? <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} /> : null}
          <ScrollView keyboardShouldPersistTaps="handled">
            {results.map((place) => (
              <Pressable
                key={`${place.lat},${place.lng},${place.label}`}
                style={styles.resultRow}
                onPress={() => void onSelect(place)}
              >
                <Ionicons name="location-outline" size={18} color="#9aa0a6" />
                <Text style={styles.resultText}>{place.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {destination && onClearDestination ? (
            <Pressable style={styles.secondaryBtn} onPress={onClearDestination}>
              <Text style={styles.secondaryBtnText}>Clear current destination</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

function PromosSheet({
  earningsCents,
  tripCount,
  online,
  onClose,
}: {
  earningsCents: number;
  tripCount: number;
  online: boolean;
  onClose: () => void;
}) {
  return (
    <View>
      <SheetHeader title="Promotions" onClose={onClose} />
      <View style={styles.promoCard}>
        <Ionicons name="flash" size={22} color="#F5A623" />
        <View style={styles.flex}>
          <Text style={styles.promoTitle}>Session progress</Text>
          <Text style={styles.sheetMuted}>
            {tripCount} trip{tripCount === 1 ? '' : 's'} · {formatMoney(earningsCents)} today
            {online ? ' · online' : ' · offline'}
          </Text>
        </View>
      </View>
      <Text style={[styles.sheetMuted, { marginTop: 8 }]}>
        Operator quests and surge boosts will show up here when your fleet enables them. Keep
        driving to grow {"today's"} total.
      </Text>
    </View>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetTitle}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Ionicons name="close" size={22} color="#9aa0a6" />
      </Pressable>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  meta,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? '#ff6b6b' : '#fff'} />
      <View style={styles.flex}>
        <Text style={[styles.menuLabel, danger && { color: '#ff6b6b' }]}>{label}</Text>
        {meta ? <Text style={styles.sheetMuted} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#6b7280" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0F12' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26,27,30,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  destActive: { backgroundColor: '#F5A623' },
  destFabInner: { flexDirection: 'row', alignItems: 'center' },
  destA: { color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: -2 },
  earningsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,27,30,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 2,
  },
  earningsDollar: { color: '#3DDC84', fontWeight: '800', fontSize: 16 },
  earningsAmount: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sideControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  shieldBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26,27,30,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fabStack: { gap: 12 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 64,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  barIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  progressTrack: {
    marginTop: 8,
    height: 3,
    width: 120,
    borderRadius: 2,
    backgroundColor: '#2a2b2f',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressOnline: { width: '55%', backgroundColor: '#4C8DFF' },
  progressOffline: { width: '18%', backgroundColor: '#6b7280' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#1A1B1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sheetMuted: { color: '#9aa0a6', fontSize: 13, lineHeight: 18 },
  sectionLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  vehicleRow: {
    borderWidth: 1,
    borderColor: '#2a2b2f',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  vehicleActive: { borderColor: '#4C8DFF', backgroundColor: 'rgba(76,141,255,0.12)' },
  vehicleRego: { color: '#fff', fontWeight: '700', fontSize: 15 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#4C8DFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2b2f',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '600' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2b2f',
  },
  menuLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  flex: { flex: 1 },
  searchInput: {
    backgroundColor: '#0E0F12',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2b2f',
  },
  resultText: { color: '#fff', flex: 1, fontSize: 14 },
  promoCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#0E0F12',
    borderRadius: 14,
    padding: 14,
  },
  promoTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
