import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { OfferScreen } from './src/screens/OfferScreen';
import { PhoneAuthScreen } from './src/screens/PhoneAuthScreen';
import { useSession } from './src/lib/auth';

export type RootStackParamList = {
  PhoneAuth: undefined;
  Home: undefined;
  Offer: { offerId: string; tripId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { session, loading } = useSession();
  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined) ?? session?.user.phone ?? null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : !session ? (
        <PhoneAuthScreen />
      ) : (
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Home" options={{ title: 'Driver' }}>
              {() => <HomeScreen displayName={displayName} />}
            </Stack.Screen>
            <Stack.Screen
              name="Offer"
              component={OfferScreen}
              options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
