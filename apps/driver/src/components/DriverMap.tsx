import { forwardRef, useImperativeHandle, type ComponentType, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DestinationFilter } from '../lib/destination';
import type { LatLng } from '../lib/location';
import { hasMapTiles, isMapNativeAvailable } from '../lib/mapStyle';

export type DriverMapHandle = {
  recenter: (coords?: LatLng | null) => void;
  flyTo: (coords: LatLng, zoom?: number) => void;
};

export type DriverMapProps = {
  coords: LatLng | null;
  destination: DestinationFilter | null;
  bottomInset?: number;
};

type NativeMapComponent = ComponentType<DriverMapProps & { ref?: Ref<DriverMapHandle> }>;

/**
 * Safe entry: never statically import MapLibre. Its TurboModules call
 * `getEnforcing` at module load, which red-screens Expo Go / binaries built
 * without `@maplibre/maplibre-react-native` linked.
 */
export const DriverMap = forwardRef<DriverMapHandle, DriverMapProps>(function DriverMap(props, ref) {
  const nativeOk = isMapNativeAvailable();
  const tilesOk = hasMapTiles();

  if (!tilesOk || !nativeOk) {
    return (
      <MapFallback
        ref={ref}
        reason={
          !tilesOk
            ? 'Set EXPO_PUBLIC_MAPTILER_KEY in apps/driver/.env.local.'
            : 'MapLibre needs a custom Expo/EAS development build (not Expo Go). Rebuild with `pnpm --filter @openride/driver exec expo run:ios` after installing MapLibre.'
        }
      />
    );
  }

  // Dynamic require only when native modules are present — avoids evaluating
  // MapLibre's getEnforcing TurboModule bindings in Expo Go / old binaries.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native load
  const { DriverMapNative } = require('./DriverMapNative') as { DriverMapNative: NativeMapComponent };
  return <DriverMapNative {...props} ref={ref} />;
});

const MapFallback = forwardRef<DriverMapHandle, { reason: string }>(function MapFallback(
  { reason },
  ref,
) {
  useImperativeHandle(ref, () => ({
    recenter() {},
    flyTo() {},
  }));

  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackTitle}>Map unavailable</Text>
      <Text style={styles.fallbackBody}>{reason}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1B1E',
    paddingHorizontal: 32,
  },
  fallbackTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  fallbackBody: { color: '#9aa0a6', textAlign: 'center', lineHeight: 20 },
});
