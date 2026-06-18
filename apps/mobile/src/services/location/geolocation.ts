import Geolocation, {
  type GeolocationResponse,
  type GeolocationOptions,
} from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import type { LocationPointInput } from '@yes-boss/shared';

export function isLocationAvailable(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

/** Runtime fine-location grant. iOS handled by the native authorization prompt. */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return new Promise(resolve =>
      Geolocation.requestAuthorization(
        () => resolve(true),
        () => resolve(false),
      ),
    );
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * A device-stable key so re-syncing a buffered point never double-counts it.
 * Fix time (ms) plus 5-decimal coords (~1 m) uniquely identifies a reading.
 */
function dedupeKey(p: GeolocationResponse): string {
  const { latitude, longitude } = p.coords;
  return `${Math.round(p.timestamp)}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;
}

export function toPoint(p: GeolocationResponse): LocationPointInput {
  return {
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    recordedAt: new Date(p.timestamp).toISOString(),
    dedupeKey: dedupeKey(p),
  };
}

const WATCH_OPTS: GeolocationOptions = {
  enableHighAccuracy: true,
  // Only emit after the device has actually moved ~20 m — keeps the haversine
  // sum meaningful and avoids GPS-jitter inflating the distance while standing.
  distanceFilter: 20,
  interval: 10_000,
};

/** Starts foreground GPS; returns a watch id to pass to {@link stopWatch}. */
export function startWatch(
  onPoint: (point: LocationPointInput) => void,
  onError: (message: string) => void,
): number {
  return Geolocation.watchPosition(
    pos => onPoint(toPoint(pos)),
    err => onError(err.message),
    WATCH_OPTS,
  );
}

export function stopWatch(watchId: number): void {
  Geolocation.clearWatch(watchId);
}
