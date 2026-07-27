import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import {
  boundsForPoints,
  isLocationStale,
  parseRoutePolyline,
  type LatLng,
} from '@openride/domain';
import { colors } from '@openride/ui';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { mapTilerStyleUrl } from '../lib/mapStyle';
import { isTrackableStatus, type TripTrackingSnapshot } from '../lib/tracking';

type Props = {
  snapshot: TripTrackingSnapshot;
  /** Extra bottom padding so markers sit above the status sheet. */
  bottomInset?: number;
};

export function TripTrackingMap({ snapshot, bottomInset = 280 }: Props) {
  const styleUrl = mapTilerStyleUrl();
  const cameraRef = useRef<CameraRef>(null);
  const followDriver = isTrackableStatus(snapshot.status);
  const driverStale = snapshot.driver
    ? isLocationStale(snapshot.driver.recorded_at)
    : false;

  const routeCoords = useMemo(
    () => parseRoutePolyline(snapshot.route_polyline),
    [snapshot.route_polyline],
  );

  const routeGeoJson = useMemo(() => {
    if (routeCoords.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: routeCoords.map((p) => [p.lng, p.lat] as [number, number]),
      },
    };
  }, [routeCoords]);

  useEffect(() => {
    const points: LatLng[] = [snapshot.pickup, snapshot.dropoff];
    if (snapshot.driver && !driverStale) {
      points.push({ lat: snapshot.driver.lat, lng: snapshot.driver.lng });
    }
    for (const p of routeCoords) points.push(p);

    const bounds = boundsForPoints(points);
    if (!bounds) return;

    if (followDriver && snapshot.driver && !driverStale) {
      cameraRef.current?.easeTo({
        center: [snapshot.driver.lng, snapshot.driver.lat],
        zoom: 14,
        padding: { top: 48, left: 40, right: 40, bottom: bottomInset },
        duration: 600,
      });
      return;
    }

    cameraRef.current?.fitBounds(
      [bounds.sw.lng, bounds.sw.lat, bounds.ne.lng, bounds.ne.lat],
      {
        padding: { top: 48, left: 40, right: 40, bottom: bottomInset },
        duration: 700,
      },
    );
  }, [
    snapshot.pickup,
    snapshot.dropoff,
    snapshot.driver,
    driverStale,
    followDriver,
    routeCoords,
    bottomInset,
  ]);

  if (!styleUrl) {
    return (
      <View style={[styles.fallback, { paddingBottom: bottomInset }]}>
        <Text style={styles.fallbackText}>
          Set EXPO_PUBLIC_MAPTILER_KEY to show the live map.
        </Text>
      </View>
    );
  }

  const initialCenter: [number, number] = [snapshot.pickup.lng, snapshot.pickup.lat];

  return (
    <Map style={styles.map} mapStyle={styleUrl} attributionPosition={{ bottom: 8, right: 8 }}>
      <Camera
        ref={cameraRef}
        initialViewState={{ center: initialCenter, zoom: 12 }}
        padding={{ top: 48, left: 40, right: 40, bottom: bottomInset }}
      />

      {routeGeoJson ? (
        <GeoJSONSource id="trip-route" data={routeGeoJson}>
          <Layer
            id="trip-route-line"
            type="line"
            paint={{
              'line-color': colors.brand,
              'line-width': 4,
              'line-opacity': 0.85,
            }}
          />
        </GeoJSONSource>
      ) : null}

      <ViewAnnotation id="pickup" lngLat={[snapshot.pickup.lng, snapshot.pickup.lat]} anchor="bottom">
        <View style={styles.pinWrap}>
          <View style={[styles.pin, styles.pickupPin]} />
          <Text style={styles.pinLabel}>Pickup</Text>
        </View>
      </ViewAnnotation>

      <ViewAnnotation id="dropoff" lngLat={[snapshot.dropoff.lng, snapshot.dropoff.lat]} anchor="bottom">
        <View style={styles.pinWrap}>
          <View style={[styles.pin, styles.dropoffPin]} />
          <Text style={styles.pinLabel}>Dropoff</Text>
        </View>
      </ViewAnnotation>

      {snapshot.driver ? (
        <ViewAnnotation
          id="driver"
          lngLat={[snapshot.driver.lng, snapshot.driver.lat]}
          anchor="center"
        >
          <View style={[styles.driverDot, driverStale && styles.driverStale]} />
        </ViewAnnotation>
      ) : null}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 24,
  },
  fallbackText: { color: colors.textMuted, textAlign: 'center' },
  pinWrap: { alignItems: 'center' },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  pickupPin: { backgroundColor: colors.textMuted },
  dropoffPin: { backgroundColor: colors.brand },
  pinLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  driverDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  driverStale: { backgroundColor: colors.textMuted },
});
