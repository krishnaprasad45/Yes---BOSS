import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { SmsTxnSyncItem } from '@yes-boss/shared';
import {
  isCallBackupAvailable,
  readCallLog,
  requestCallBackupPermissions,
} from '@/services/calls/nativeCalls';
import {
  isSmsReaderAvailable,
  readInbox,
  requestSmsPermission,
} from '@/services/sms/nativeSms';
import { parseSms } from '@/services/smsParsers';
import { syncCalls, type CallSyncItem } from '@/services/api/calls.api';
import { syncSmsTxns } from '@/services/api/smsTxn.api';

const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Silently syncs device call log + SMS inbox to the backend on mount and each
 * time the app returns to the foreground. Throttled to once per 5 minutes.
 * No toasts — runs in the background without user action.
 */
export function useAutoDeviceSync(enabled: boolean) {
  const qc = useQueryClient();
  const lastSyncRef = useRef<number>(0);

  const runSync = useCallback(async () => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return;
    lastSyncRef.current = now;

    if (isCallBackupAvailable()) {
      try {
        const perms = await requestCallBackupPermissions();
        if (perms.callLog) {
          const log = await readCallLog(0, 500);
          const items: CallSyncItem[] = log.map(c => ({
            contactName: c.contactName,
            phoneNumber: c.phoneNumber,
            direction: c.direction,
            durationSec: c.durationSec,
            occurredAt: new Date(c.occurredAtMs).toISOString(),
          }));
          if (items.length > 0) {
            await syncCalls(items);
            qc.invalidateQueries({ queryKey: ['calls'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
          }
        }
      } catch {
        // best-effort — never block or show errors
      }
    }

    if (isSmsReaderAvailable()) {
      try {
        const granted = await requestSmsPermission();
        if (granted) {
          const raw = await readInbox(0, 500);
          const txns: SmsTxnSyncItem[] = [];
          for (const sms of raw) {
            const parsed = parseSms(sms);
            if (parsed) txns.push(parsed);
          }
          if (txns.length > 0) {
            await syncSmsTxns(txns);
            qc.invalidateQueries({ queryKey: ['sms-txns'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
          }
        }
      } catch {
        // best-effort
      }
    }
  }, [enabled, qc]);

  useEffect(() => {
    if (!enabled) return;
    runSync();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') runSync();
    });
    return () => sub.remove();
  }, [enabled, runSync]);
}
