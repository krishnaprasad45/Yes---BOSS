import { useCallback, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import type { LocationPointInput } from '@yes-boss/shared';
import { syncLocationPoints } from '@/services/api/location.api';
import {
  isLocationAvailable,
  requestLocationPermission,
  startWatch,
  stopWatch,
} from '@/services/location/geolocation';

/** Flush the buffer to the backend once it reaches this many fixes. */
const FLUSH_AT = 5;

/**
 * Foreground GPS distance tracking (Phase 7 "KM traveled").
 * Watches position while the app is open, buffers fixes, and batch-syncs them
 * to the backend, which sums the haversine distance. Best-effort: a failed
 * flush keeps the points buffered for the next attempt.
 */
export function useLocationTracking() {
  const qc = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [pointsSynced, setPointsSynced] = useState(0);

  const watchId = useRef<number | null>(null);
  const buffer = useRef<LocationPointInput[]>([]);
  const flushing = useRef(false);

  const flush = useCallback(
    async (force = false) => {
      if (flushing.current) return;
      if (!force && buffer.current.length < FLUSH_AT) return;
      if (buffer.current.length === 0) return;

      flushing.current = true;
      const batch = buffer.current;
      buffer.current = [];
      try {
        const res = await syncLocationPoints(batch);
        setPointsSynced(n => n + (res.data?.inserted ?? 0));
        qc.invalidateQueries({ queryKey: ['stats', 'distance'] });
      } catch {
        // Keep the points for a later retry rather than losing the distance.
        buffer.current = batch.concat(buffer.current);
      } finally {
        flushing.current = false;
      }
    },
    [qc],
  );

  const start = useCallback(async () => {
    if (!isLocationAvailable()) {
      Toast.show({ type: 'error', text1: 'Location needs the mobile app' });
      return;
    }
    const ok = await requestLocationPermission();
    if (!ok) {
      Toast.show({ type: 'error', text1: 'Location permission denied' });
      return;
    }
    watchId.current = startWatch(
      point => {
        buffer.current.push(point);
        void flush();
      },
      message => Toast.show({ type: 'error', text1: 'GPS error', text2: message }),
    );
    setIsTracking(true);
    Toast.show({ type: 'success', text1: 'Tracking distance…' });
  }, [flush]);

  const stop = useCallback(async () => {
    if (watchId.current !== null) {
      stopWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    await flush(true);
  }, [flush]);

  const toggle = useCallback(
    (next: boolean) => (next ? start() : stop()),
    [start, stop],
  );

  return { isTracking, pointsSynced, toggle };
}
