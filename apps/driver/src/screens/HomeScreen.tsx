import {
  calculateDailyDeduction,
  calculateCompetitorComparison,
  calculateTopUp,
  calculateVestingPercentage,
  checkDriverCompliance,
  formatKobo,
  getVestingMilestoneStatus,
  isFreeDay,
  remainingCapForDay,
  VESTING_TARGET_TRIPS,
} from '@openride/domain';
import { colors, spacing, typography } from '@openride/ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZoluLogo } from '../components/ZoluLogo';
import { signOut } from '../lib/auth';
import { fetchMyVehicles, type DriverDocument, type Vehicle } from '../lib/driver-state';

interface DemoScenario {
  id: string;
  label: string;
  grossEarningsNaira: number;
  tripsToday: number;
  hoursOnlineToday: number;
  lifetimeTrips: number;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'free-day',
    label: 'Free Day',
    grossEarningsNaira: 3_200,
    tripsToday: 2,
    hoursOnlineToday: 3.5,
    lifetimeTrips: 120,
  },
  {
    id: 'top-up-eligible',
    label: 'Top-Up Eligible',
    grossEarningsNaira: 14_000,
    tripsToday: 9,
    hoursOnlineToday: 10.5,
    lifetimeTrips: 350,
  },
  {
    id: 'max-cap-and-vested',
    label: 'Max Cap & Vested',
    grossEarningsNaira: 35_000,
    tripsToday: 14,
    hoursOnlineToday: 10,
    lifetimeTrips: 750,
  },
];

interface Props {
  driverId: string;
  displayName?: string | null;
  online: boolean;
  grossEarningsNaira: number | null;
  completedTrips: number | null;
  completedTripsToday: number | null;
  hoursOnlineToday: number | null;
  driverDocuments: DriverDocument[];
  devPreview?: boolean;
  onDocuments: () => void;
  mockVehicles?: Vehicle[];
  onSignOut?: () => void;
  onGoOnline: (vehicleId: string) => Promise<void>;
  onGoOffline: () => Promise<void>;
  onSimulateRideOffer?: () => void;
  onReport: () => void;
}

export function HomeScreen({
  driverId,
  displayName,
  online,
  grossEarningsNaira,
  completedTrips,
  completedTripsToday,
  hoursOnlineToday,
  driverDocuments,
  devPreview = false,
  onDocuments,
  mockVehicles,
  onSignOut,
  onGoOnline,
  onGoOffline,
  onSimulateRideOffer,
  onReport,
}: Props) {
  const [demoScenario, setDemoScenario] = useState<DemoScenario | null>(null);
  const currentGrossEarningsNaira = demoScenario?.grossEarningsNaira ?? grossEarningsNaira;
  const currentTripsToday = demoScenario?.tripsToday ?? completedTripsToday;
  const currentHoursOnlineToday = demoScenario?.hoursOnlineToday ?? hoursOnlineToday;
  const currentLifetimeTrips = demoScenario?.lifetimeTrips ?? completedTrips;
  const grossEarningsKobo =
    currentGrossEarningsNaira === null ? null : Math.round(currentGrossEarningsNaira * 100);
  const deductionKobo = grossEarningsKobo === null ? null : calculateDailyDeduction(grossEarningsKobo);
  const remainingCapKobo = deductionKobo === null ? null : remainingCapForDay(deductionKobo);
  const freeDay = grossEarningsKobo !== null && isFreeDay(grossEarningsKobo);
  const comparison = grossEarningsKobo === null ? null : calculateCompetitorComparison(grossEarningsKobo);
  const vestingPercentage = currentLifetimeTrips === null ? null : calculateVestingPercentage(currentLifetimeTrips);
  const vestingMilestoneStatus = currentLifetimeTrips === null ? null : getVestingMilestoneStatus(currentLifetimeTrips);
  const fundAllocationKobo =
    grossEarningsKobo === null || currentTripsToday === null || currentHoursOnlineToday === null
      ? null
      : calculateTopUp(grossEarningsKobo, currentHoursOnlineToday, currentTripsToday);
  const compliance = checkDriverCompliance(driverDocuments);
  const canGoOnline = devPreview || compliance.compliant;
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles ?? []);
  const [selected, setSelected] = useState<string | null>(mockVehicles?.[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mockVehicles) return;
    let active = true;
    void fetchMyVehicles(driverId).then((vs) => {
      if (!active) return;
      setVehicles(vs);
      setSelected((cur) => cur ?? vs[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [driverId, mockVehicles]);

  async function toggle(): Promise<void> {
    setBusy(true);
    try {
      if (online) {
        await onGoOffline();
      } else {
        if (!selected) throw new Error('Add an active vehicle before going online.');
        await onGoOnline(selected);
      }
    } catch (e) {
      Alert.alert(online ? 'Could not go offline' : 'Could not go online', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    try {
      await (onSignOut ? onSignOut() : signOut());
    } catch (e) {
      Alert.alert('Could not sign out', (e as Error).message || 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <View style={styles.brandHeading}>
          <ZoluLogo size={36} />
          <View>
            <Text style={styles.hi}>{displayName ?? 'Driver'}</Text>
            <Text style={styles.brandLabel}>ZoluRide Driver</Text>
          </View>
        </View>
        <View style={styles.headerLinks}>
          <Pressable onPress={onDocuments} hitSlop={8}>
            <Text style={styles.link}>Documents</Text>
          </Pressable>
          <Pressable onPress={onReport} hitSlop={8}>
            <Text style={styles.link}>Report</Text>
          </Pressable>
          <Pressable onPress={() => void handleSignOut()} hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.statusPill, online ? styles.onlinePill : styles.offlinePill]}>
        <Text style={styles.statusText}>{online ? 'Online' : 'Offline'}</Text>
      </View>

      <Text style={styles.headline}>{online ? 'Waiting for an offer…' : 'You are offline'}</Text>

      <View style={styles.earnings}>
        <View style={styles.earningsRow}>
          <Text style={styles.earningLabel}>Gross earnings today</Text>
          <Text style={styles.earningValue}>
            {grossEarningsKobo === null ? 'Unavailable' : formatKobo(grossEarningsKobo)}
          </Text>
        </View>
        <View style={styles.earningsRow}>
          <Text style={styles.earningLabel}>Today&apos;s ZoluRide fee</Text>
          {grossEarningsKobo === null ? (
            <Text style={styles.earningValue}>Unavailable</Text>
          ) : (
            <View style={styles.feeDetails}>
              <Text style={freeDay ? styles.freeDayLabel : styles.earningValue}>
                {freeDay ? 'Free day' : formatKobo(deductionKobo ?? 0)}
              </Text>
              <Text style={styles.capRemaining}>{formatKobo(remainingCapKobo ?? 0)} cap remaining</Text>
            </View>
          )}
        </View>
      </View>

      {__DEV__ ? (
        <View style={styles.scenarioCard}>
          <View style={styles.scenarioHeader}>
            <Text style={styles.scenarioTitle}>Dev Demo Scenarios</Text>
            <Pressable onPress={() => setDemoScenario(null)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.liveDataButton}>Live Data</Text>
            </Pressable>
          </View>
          <View style={styles.scenarioButtons}>
            {DEMO_SCENARIOS.map((scenario) => (
              <Pressable
                key={scenario.id}
                style={[styles.scenarioButton, demoScenario?.id === scenario.id && styles.scenarioButtonActive]}
                onPress={() => setDemoScenario(scenario)}
                accessibilityRole="button"
                accessibilityState={{ selected: demoScenario?.id === scenario.id }}
              >
                <Text
                  style={[
                    styles.scenarioButtonText,
                    demoScenario?.id === scenario.id && styles.scenarioButtonTextActive,
                  ]}
                >
                  {scenario.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {onSimulateRideOffer ? (
            <Pressable
              style={styles.simulateRideButton}
              onPress={() => {
                setDemoScenario(null);
                onSimulateRideOffer();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.simulateRideButtonText}>Simulate Ride Offer (₦4,500)</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fund}>
        <Text style={styles.fundTitle}>Stabilisation Fund</Text>
        <View style={styles.fundRow}>
          <Text style={styles.earningLabel}>Today&apos;s pooled contribution</Text>
          <Text style={styles.earningValue}>
            {deductionKobo === null ? 'Unavailable' : formatKobo(deductionKobo)}
          </Text>
        </View>
        <View style={styles.fundRow}>
          <Text style={styles.earningLabel}>Potential allocation</Text>
          <Text style={styles.earningValue}>
            {fundAllocationKobo === null ? 'Unavailable' : formatKobo(fundAllocationKobo)}
          </Text>
        </View>
      </View>

      <View style={styles.comparisonCard}>
        <View style={styles.comparisonColumns}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.zoluLabel}>ZoluRide</Text>
            <Text style={styles.comparisonCaption}>Net</Text>
            <Text style={styles.zoluFare}>{comparison === null ? 'Unavailable' : formatKobo(comparison.zoluNetKobo)}</Text>
          </View>
          <View style={styles.comparisonColumn}>
            <Text style={styles.competitorLabel}>Uber</Text>
            <Text style={styles.comparisonCaption}>Net</Text>
            <Text style={styles.competitorFare}>
              {comparison === null ? 'Unavailable' : formatKobo(comparison.uberNetKobo)}
            </Text>
          </View>
          <View style={styles.comparisonColumn}>
            <Text style={styles.competitorLabel}>Bolt</Text>
            <Text style={styles.comparisonCaption}>Net</Text>
            <Text style={styles.competitorFare}>
              {comparison === null ? 'Unavailable' : formatKobo(comparison.boltNetKobo)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.comparisonBanner}>
        {comparison === null
          ? 'Earnings comparison unavailable.'
          : `You kept ${formatKobo(comparison.savingsVsUberKobo)} more than Uber today.`}
      </Text>

      <View style={styles.vesting}>
        <View style={styles.vestingHeader}>
          <Text style={styles.earningLabel}>Ownership vesting</Text>
          <Text style={styles.earningValue}>
            {vestingPercentage === null ? 'Unavailable' : `${vestingPercentage}%`}
          </Text>
        </View>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: vestingPercentage ?? 0 }}
        >
          <View style={[styles.progressFill, { width: `${vestingPercentage ?? 0}%` }]} />
        </View>
        <View style={styles.vestingDetails}>
          <Text style={styles.vestingText}>
            {currentLifetimeTrips === null
              ? 'Trips unavailable'
              : `${currentLifetimeTrips} / ${VESTING_TARGET_TRIPS} trips`}
          </Text>
          <Text style={styles.vestingText}>
            {vestingMilestoneStatus === null
              ? 'Milestone unavailable'
              : vestingMilestoneStatus.isFullyVested
                ? `Fully vested at ${VESTING_TARGET_TRIPS} trips`
                : vestingMilestoneStatus.achievedMilestoneTrips > 0
                  ? `${vestingMilestoneStatus.achievedMilestoneTrips}-trip milestone reached · ${vestingMilestoneStatus.tripsToNextMilestone} to ${vestingMilestoneStatus.nextMilestoneTrips}`
                  : `${vestingMilestoneStatus.tripsToNextMilestone} trips to first milestone`}
          </Text>
        </View>
      </View>

      {!online ? (
        <>
          <Text style={styles.label}>Vehicle</Text>
          {vehicles.length === 0 ? (
            <Text style={styles.muted}>
              No active vehicle assigned to you. An admin needs to add one before you can go online.
            </Text>
          ) : (
            vehicles.map((v) => (
              <Pressable
                key={v.id}
                style={[styles.vehicle, selected === v.id && styles.vehicleActive]}
                onPress={() => setSelected(v.id)}
              >
                <Text style={styles.vehicleRego}>{v.rego}</Text>
                <Text style={styles.muted}>
                  {v.make} {v.model} · {v.vehicle_type}
                </Text>
              </Pressable>
            ))
          )}
        </>
      ) : (
        <Text style={styles.muted}>
          Your location is shared while online (foreground). Offers will appear here automatically.
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.button,
            online ? styles.danger : styles.primary,
            (!online && (!selected || !canGoOnline)) && styles.disabled,
          ]}
          onPress={toggle}
          disabled={busy || (!online && (!selected || !canGoOnline))}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{online ? 'Go offline' : 'Go online'}</Text>
          )}
        </Pressable>
        {!devPreview && !compliance.compliant ? <Text style={styles.warning}>Verification Required</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  brandHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  brandLabel: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '600' },
  hi: { fontSize: typography.size.lg, fontWeight: '600' },
  headerLinks: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  link: { color: colors.brandDark, fontSize: typography.size.sm, fontWeight: '600' },
  signOut: { color: colors.danger, fontSize: typography.size.sm, fontWeight: '600' },
  statusPill: { alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 999, marginBottom: spacing.lg },
  onlinePill: { backgroundColor: colors.online },
  offlinePill: { backgroundColor: colors.offline },
  statusText: { color: '#fff', fontWeight: '600' },
  headline: { fontSize: typography.size.xl, fontWeight: '600', marginBottom: spacing.lg },
  earnings: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  scenarioCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  scenarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scenarioTitle: { fontSize: typography.size.sm, fontWeight: '600' },
  liveDataButton: { color: colors.brandDark, fontSize: typography.size.xs, fontWeight: '600' },
  scenarioButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
  scenarioButton: { width: '48%', minHeight: 34, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: spacing.xs },
  scenarioButtonActive: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  scenarioButtonText: { color: colors.text, fontSize: typography.size.xs, fontWeight: '600', textAlign: 'center' },
  scenarioButtonTextActive: { color: '#fff' },
  simulateRideButton: { minHeight: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.success, borderRadius: 4, paddingHorizontal: spacing.sm },
  simulateRideButtonText: { color: '#fff', fontSize: typography.size.sm, fontWeight: '600', textAlign: 'center' },
  fund: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  fundTitle: { fontSize: typography.size.md, fontWeight: '600', marginBottom: spacing.xs },
  fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  feeDetails: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.xs },
  earningLabel: { color: colors.textMuted, fontSize: typography.size.md, flexShrink: 1 },
  earningValue: { fontSize: typography.size.md, fontWeight: '600' },
  freeDayLabel: { color: colors.success, fontSize: typography.size.sm, fontWeight: '600' },
  capRemaining: { color: colors.textMuted, fontSize: typography.size.xs },
  comparisonCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  comparisonColumns: { flexDirection: 'row', alignItems: 'stretch' },
  comparisonColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs },
  zoluLabel: { color: colors.success, fontSize: typography.size.sm, fontWeight: '700' },
  competitorLabel: { color: colors.textMuted, fontSize: typography.size.sm, fontWeight: '700' },
  comparisonCaption: { color: colors.textMuted, fontSize: typography.size.xs },
  zoluFare: { color: colors.success, fontSize: typography.size.md, fontWeight: '700' },
  competitorFare: { color: colors.textMuted, fontSize: typography.size.md, fontWeight: '600' },
  comparisonBanner: {
    color: colors.success,
    fontSize: typography.size.sm,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  vesting: { marginBottom: spacing.lg, gap: spacing.sm },
  vestingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 8, backgroundColor: colors.surfaceMuted, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.brand, borderRadius: 4 },
  vestingDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  vestingText: { color: colors.textMuted, fontSize: typography.size.sm },
  label: { fontSize: typography.size.sm, color: colors.textMuted, marginBottom: spacing.sm },
  muted: { color: colors.textMuted, fontSize: typography.size.md, lineHeight: 22 },
  vehicle: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm },
  vehicleActive: { borderColor: colors.brandDark, backgroundColor: colors.surfaceMuted },
  vehicleRego: { fontSize: typography.size.md, fontWeight: '600' },
  actions: { marginTop: 'auto' },
  button: { padding: spacing.lg, borderRadius: 8, alignItems: 'center' },
  primary: { backgroundColor: colors.brandDark },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  warning: { color: colors.danger, fontSize: typography.size.sm, fontWeight: '600', textAlign: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: typography.size.lg },
});
