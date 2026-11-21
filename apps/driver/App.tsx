import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ActiveTripScreen } from './src/screens/ActiveTripScreen';
import { DocumentsScreen } from './src/screens/DocumentsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OfferScreen } from './src/screens/OfferScreen';
import { PhoneAuthScreen } from './src/screens/PhoneAuthScreen';
import { ReportIncidentScreen } from './src/screens/ReportIncidentScreen';
import { api } from './src/lib/api';
import { useSession } from './src/lib/auth';
import {
  REQUIRED_DRIVER_DOCUMENTS,
  submitDriverDocuments,
  useDriverState,
  type DriverDocument,
  type DriverDocumentType,
  type ActiveTrip,
  type PendingOffer,
  type RequiredDocumentName,
  type Vehicle,
} from './src/lib/driver-state';
import { simulatePreviewDocumentVerification } from './src/lib/preview-documents';

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
  const [showDocuments, setShowDocuments] = useState(false);

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

  if (showDocuments) {
    return (
      <DocumentsScreen
        driverId={driverId}
        documents={state.driverDocuments}
        onBack={() => setShowDocuments(false)}
        onSubmit={async (uploadedTypes) => {
          const requiredTypes = uploadedTypes.filter(
            (type): type is RequiredDocumentName =>
              REQUIRED_DRIVER_DOCUMENTS.some((document) => document.type === type),
          );
          await submitDriverDocuments(driverId, requiredTypes);
          await state.refresh();
          setShowDocuments(false);
        }}
      />
    );
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
      grossEarningsNaira={state.grossEarningsNaira}
      completedTrips={state.completedTrips}
      completedTripsToday={state.completedTripsToday}
      hoursOnlineToday={state.hoursOnlineToday}
      driverDocuments={state.driverDocuments}
      onDocuments={() => setShowDocuments(true)}
      onGoOnline={state.goOnline}
      onGoOffline={state.goOffline}
      onReport={() => setShowReport(true)}
    />
  );
}

const DEV_BYPASS_DRIVER_ID = 'dev-bypass-driver';
const DEV_TRIP_ID = 'dev-preview-trip';
const DEV_TRIP_FARE_KOBO = 450_000;
function expiryDate(months: number, days = 0): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

const DEV_BYPASS_VEHICLES: Vehicle[] = [
  { id: 'dev-preview-vehicle', rego: 'DEV-001', make: 'ZOLU', model: 'Preview', vehicle_type: 'sedan' },
];

function DevBypassHome({ onExit }: { onExit: () => void }) {
  const [showDocuments, setShowDocuments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [online, setOnline] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [grossEarningsNaira, setGrossEarningsNaira] = useState(0);
  const [completedTrips, setCompletedTrips] = useState(350);
  const [completedTripsToday, setCompletedTripsToday] = useState(0);
  const [driverDocuments, setDriverDocuments] = useState<DriverDocument[]>(() => [
    {
      type: 'License',
      label: "Nigerian Driver's Licence",
      status: 'verified',
      uploaded: true,
      expiresOn: expiryDate(14),
      expiryLabel: 'expires in 14 months',
    },
    {
      type: 'LASDRI',
      label: 'LASDRI Driver Institute Card',
      status: 'verified',
      uploaded: true,
      expiresOn: expiryDate(8),
      expiryLabel: 'expires in 8 months',
    },
    {
      type: 'Hackney Permit',
      label: 'Lagos Hackney Permit / Vehicle License',
      status: 'verified',
      uploaded: true,
      expiresOn: expiryDate(0, 14),
      expiryLabel: 'expires in 14 days',
      expiringSoon: true,
    },
    {
      type: 'Motor Insurance',
      label: 'Comprehensive / Third-Party Motor Insurance',
      status: 'verified',
      uploaded: true,
      expiresOn: expiryDate(6),
      expiryLabel: 'expires in 6 months',
    },
  ]);

  if (showDocuments) {
    return (
      <DocumentsScreen
        driverId={DEV_BYPASS_DRIVER_ID}
        documents={driverDocuments}
        preview
        onBack={() => setShowDocuments(false)}
        onSubmit={async (uploadedTypes: DriverDocumentType[]) => {
          setDriverDocuments((documents) =>
            documents.map((document) =>
              uploadedTypes.includes(document.type)
                ? { ...document, status: 'pending', uploaded: true, renewalSubmitted: true }
                : document,
            ),
          );
        }}
        onPreviewVerify={async () => {
          setDriverDocuments((documents) => simulatePreviewDocumentVerification(documents, expiryDate(12)));
        }}
      />
    );
  }

  if (showReport) {
    return <ReportIncidentScreen devPreview onDone={() => setShowReport(false)} />;
  }

  if (activeTrip) {
    return (
      <ActiveTripScreen
        trip={activeTrip}
        onEvent={async (event) => {
          if (event === 'arrived') {
            setActiveTrip((trip) => (trip ? { ...trip, status: 'arrived_at_pickup' } : trip));
          } else if (event === 'start') {
            setActiveTrip((trip) => (trip ? { ...trip, status: 'in_progress' } : trip));
          } else if (event === 'complete') {
            setGrossEarningsNaira((gross) => gross + 4_500);
            setCompletedTrips((trips) => trips + 1);
            setCompletedTripsToday((trips) => trips + 1);
            setActiveTrip(null);
          } else if (event === 'cancel') {
            setActiveTrip(null);
          }
        }}
      />
    );
  }

  if (pendingOffer) {
    return (
      <OfferScreen
        offer={pendingOffer}
        onAccept={async (tripId) => {
          setPendingOffer(null);
          setActiveTrip({
            id: tripId,
            status: 'assigned',
            pickup_address: 'Victoria Island, Lagos',
            dropoff_address: 'Lekki Phase 1, Lagos',
            estimated_fare_cents: DEV_TRIP_FARE_KOBO,
            final_fare_cents: null,
          });
        }}
        onDecline={async () => setPendingOffer(null)}
      />
    );
  }

  return (
    <HomeScreen
      driverId={DEV_BYPASS_DRIVER_ID}
      displayName="Dev Preview Driver"
      online={online}
      grossEarningsNaira={grossEarningsNaira}
      completedTrips={completedTrips}
      completedTripsToday={completedTripsToday}
      hoursOnlineToday={0}
      driverDocuments={driverDocuments}
      devPreview
      mockVehicles={DEV_BYPASS_VEHICLES}
      onDocuments={() => setShowDocuments(true)}
      onSignOut={onExit}
      onGoOnline={async () => setOnline(true)}
      onGoOffline={async () => setOnline(false)}
      onSimulateRideOffer={() => {
        setPendingOffer({
          id: 'dev-preview-offer',
          trip_id: DEV_TRIP_ID,
          responds_by: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          pickup_eta_s: 720,
          distance_to_pickup_m: 8_500,
          trips: {
            pickup_address: 'Victoria Island, Lagos',
            dropoff_address: 'Lekki Phase 1, Lagos',
            estimated_fare_cents: DEV_TRIP_FARE_KOBO,
          },
        });
      }}
      onReport={() => setShowReport(true)}
    />
  );
}

export default function App() {
  const { session, loading } = useSession();
  const [devBypass, setDevBypass] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {loading ? (
        <Centered>
          <ActivityIndicator />
        </Centered>
      ) : !session && __DEV__ && devBypass ? (
        <DevBypassHome onExit={() => setDevBypass(false)} />
      ) : !session ? (
        <PhoneAuthScreen onDevBypass={() => setDevBypass(true)} />
      ) : (
        <SignedIn session={session} />
      )}
    </SafeAreaProvider>
  );
}
