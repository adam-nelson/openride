import { TurboModuleRegistry } from 'react-native';

// Same public MapTiler key used for geocoding (restrict by app/bundle in dashboard).
const KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

/** MapTiler Streets Dark style for MapLibre (matches driver online map chrome). */
export function mapTilerDarkStyleUrl(): string | null {
  if (!KEY) return null;
  return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${KEY}`;
}

export function hasMapTiles(): boolean {
  return Boolean(KEY);
}

/** True when MapLibre Native is linked (dev/EAS client — not Expo Go). */
export function isMapNativeAvailable(): boolean {
  return TurboModuleRegistry.get('MLRNNetworkModule') != null;
}
