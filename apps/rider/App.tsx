import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { PhoneAuthScreen } from './src/screens/PhoneAuthScreen';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { ReceiptsScreen } from './src/screens/ReceiptsScreen';
import { ReportIncidentScreen } from './src/screens/ReportIncidentScreen';
import { TripScreen } from './src/screens/TripScreen';
import { useProfile, useSession } from './src/lib/auth';

export type RootStackParamList = {
  PhoneAuth: undefined;
  Home: undefined;
  Trip: { tripId: string };
  Receipts: undefined;
  ReportIncident: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading, refresh } = useProfile(session);

  const booting = sessionLoading || (session != null && profileLoading);
  const needsProfile = session != null && profile != null && !profile.onboarding_completed_at;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {booting ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : !session ? (
        <PhoneAuthScreen />
      ) : needsProfile ? (
        <ProfileSetupScreen onDone={refresh} />
      ) : (
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Home" options={{ title: 'OpenRide' }}>
              {() => <HomeScreen displayName={profile?.display_name} />}
            </Stack.Screen>
            <Stack.Screen name="Trip" component={TripScreen} options={{ title: 'Your trip' }} />
            <Stack.Screen name="Receipts" component={ReceiptsScreen} options={{ title: 'Receipts' }} />
            <Stack.Screen
              name="ReportIncident"
              component={ReportIncidentScreen}
              options={{ title: 'Report an issue' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
