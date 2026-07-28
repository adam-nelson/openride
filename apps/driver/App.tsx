import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ActiveTripScreen } from './src/screens/ActiveTripScreen';
import { EarningsScreen } from './src/screens/EarningsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OfferScreen } from './src/screens/OfferScreen';
import { PhoneAuthScreen } from './src/screens/PhoneAuthScreen';
import { ReportIncidentScreen } from './src/screens/ReportIncidentScreen';
import { api } from './src/lib/api';
import { useSession } from './src/lib/auth';
import { useDriverState } from './src/lib/driver-state';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center' }} edges={['top', 'right', 'bottom', 'left']}>
      {children}
    </SafeAreaView>
  );
}

function SignedIn({ session }: { session: Session }) {
  const driverId = session.user.id;
  const displayName =
    (session.user.user_metadata?.display_name as string | undefined) ?? session.user.phone ?? null;
  const state = useDriverState(session);
  const [showReport, setShowReport] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);

  if (state.loading) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  if (showReport) {
    return <ReportIncidentScreen onDone={() => setShowReport(false)} />;
  }

  if (showEarnings) {
    return <EarningsScreen driverId={driverId} onBack={() => setShowEarnings(false)} />;
  }

  // Active trip takes precedence, then a pending offer, then the home/idle view.
  if (state.activeTrip) {
    return (
      <ActiveTripScreen
        trip={state.activeTrip}
        onEvent={async (event, reason) => {
          await api.tripEvent(state.activeTrip!.id, event, reason);
          await state.refresh();
        }}
      />
    );
  }

  if (state.pendingOffer) {
    return (
      <OfferScreen
        offer={state.pendingOffer}
        onAccept={async (tripId) => {
          await api.acceptOffer(tripId);
          await state.refresh();
        }}
        onDecline={async (tripId) => {
          await api.declineOffer(tripId, 'driver declined');
          await state.refresh();
        }}
      />
    );
  }

  return (
    <HomeScreen
      driverId={driverId}
      displayName={displayName}
      online={state.online}
      onGoOnline={state.goOnline}
      onGoOffline={state.goOffline}
      onReport={() => setShowReport(true)}
      onOpenEarnings={() => setShowEarnings(true)}
    />
  );
}

export default function App() {
  const { session, loading } = useSession();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loading ? (
        <Centered>
          <ActivityIndicator />
        </Centered>
      ) : !session ? (
        <PhoneAuthScreen />
      ) : (
        <SignedIn session={session} />
      )}
    </SafeAreaProvider>
  );
}
