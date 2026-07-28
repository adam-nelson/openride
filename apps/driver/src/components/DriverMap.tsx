import {
  Camera,
  Map,
  ViewAnnotation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DestinationFilter } from '../lib/destination';
import type { LatLng } from '../lib/location';
import { hasMapTiles, isMapNativeAvailable, mapTilerDarkStyleUrl } from '../lib/mapStyle';

export type DriverMapHandle = {
  recenter: (coords?: LatLng | null) => void;
  flyTo: (coords: LatLng, zoom?: number) => void;
};

type Props = {
  coords: LatLng | null;
  destination: DestinationFilter | null;
  bottomInset?: number;
};

const FALLBACK_CENTER: [number, number] = [152.855, -25.288]; // Hervey Bay area

export const DriverMap = forwardRef<DriverMapHandle, Props>(function DriverMap(
  { coords, destination, bottomInset = 96 },
  ref,
) {
  const styleUrl = mapTilerDarkStyleUrl();
  const cameraRef = useRef<CameraRef>(null);
  const didInitialCenter = useRef(false);
  const nativeOk = isMapNativeAvailable();
  const tilesOk = hasMapTiles();

  useImperativeHandle(ref, () => ({
    recenter(c) {
      const target = c ?? coords;
      if (!target) return;
      cameraRef.current?.easeTo({
        center: [target.lng, target.lat],
        zoom: 15,
        padding: { top: 80, left: 24, right: 24, bottom: bottomInset },
        duration: 500,
      });
    },
    flyTo(c, zoom = 14) {
      cameraRef.current?.easeTo({
        center: [c.lng, c.lat],
        zoom,
        padding: { top: 80, left: 24, right: 24, bottom: bottomInset },
        duration: 700,
      });
    },
  }));

  // Auto-center once when GPS first arrives; later moves use the recenter FAB.
  useEffect(() => {
    if (!coords || didInitialCenter.current) return;
    didInitialCenter.current = true;
    cameraRef.current?.easeTo({
      center: [coords.lng, coords.lat],
      zoom: 15,
      padding: { top: 80, left: 24, right: 24, bottom: bottomInset },
      duration: 400,
    });
  }, [coords, bottomInset]);

  if (!tilesOk || !nativeOk || !styleUrl) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Map unavailable</Text>
        <Text style={styles.fallbackBody}>
          {!tilesOk
            ? 'Set EXPO_PUBLIC_MAPTILER_KEY in apps/driver/.env.local.'
            : 'MapLibre needs a custom Expo/EAS development build (not Expo Go).'}
        </Text>
      </View>
    );
  }

  const initialCenter: [number, number] = coords
    ? [coords.lng, coords.lat]
    : FALLBACK_CENTER;

  return (
    <Map
      style={styles.map}
      mapStyle={styleUrl}
      attributionPosition={{ bottom: bottomInset + 8, left: 8 }}
    >
      <Camera
        ref={cameraRef}
        initialViewState={{ center: initialCenter, zoom: coords ? 15 : 12 }}
        padding={{ top: 80, left: 24, right: 24, bottom: bottomInset }}
      />

      {destination ? (
        <ViewAnnotation
          id="destination"
          lngLat={[destination.lng, destination.lat]}
          anchor="bottom"
        >
          <View style={styles.destWrap}>
            <View style={styles.destPin}>
              <Text style={styles.destLetter}>A</Text>
            </View>
            <Text style={styles.destLabel} numberOfLines={1}>
              {destination.label}
            </Text>
          </View>
        </ViewAnnotation>
      ) : null}

      {coords ? (
        <ViewAnnotation id="driver" lngLat={[coords.lng, coords.lat]} anchor="center">
          <View style={styles.driverDot} />
        </ViewAnnotation>
      ) : null}
    </Map>
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1B1E',
    paddingHorizontal: 32,
  },
  fallbackTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  fallbackBody: { color: '#9aa0a6', textAlign: 'center', lineHeight: 20 },
  driverDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F5A623',
    borderWidth: 3,
    borderColor: '#fff',
  },
  destWrap: { alignItems: 'center', maxWidth: 160 },
  destPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  destLetter: { color: '#111', fontWeight: '800', fontSize: 13 },
  destLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
