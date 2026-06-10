import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
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

export default function App(): JSX.Element {
  const { session } = useSession();

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator>
          {session ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Driver' }} />
              <Stack.Screen
                name="Offer"
                component={OfferScreen}
                options={{ presentation: 'fullScreenModal', headerShown: false }}
              />
            </>
          ) : (
            <Stack.Screen
              name="PhoneAuth"
              component={PhoneAuthScreen}
              options={{ headerShown: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
