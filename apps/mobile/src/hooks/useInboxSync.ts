import { useState } from 'react';
import Toast from 'react-native-toast-message';
import type { SmsTxnSyncItem } from '@yes-boss/shared';
import {
  isSmsReaderAvailable,
  readInbox,
  requestSmsPermission,
} from '@/services/sms/nativeSms';
import { parseSms } from '@/services/smsParsers';
import { useSyncSmsTxns } from '@/hooks/useSmsTxns';

/**
 * Full on-device pipeline: ask permission → read inbox → parse each SMS into a
 * transaction (non-matches dropped) → upload to backend. Parsing stays local;
 * only structured transactions leave the device.
 */
export function useInboxSync() {
  const [isScanning, setIsScanning] = useState(false);
  const syncMutation = useSyncSmsTxns();

  async function sync() {
    if (!isSmsReaderAvailable()) {
      Toast.show({ type: 'error', text1: 'SMS reading needs the Android app' });
      return;
    }
    setIsScanning(true);
    try {
      const granted = await requestSmsPermission();
      if (!granted) {
        Toast.show({ type: 'error', text1: 'SMS permission denied' });
        return;
      }
      const raw = await readInbox(0, 500);
      const items: SmsTxnSyncItem[] = [];
      for (const sms of raw) {
        const parsed = parseSms(sms);
        if (parsed) items.push(parsed);
      }
      if (items.length === 0) {
        Toast.show({ type: 'info', text1: 'No transaction SMS found' });
        return;
      }
      await syncMutation.mutateAsync(items);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Scan failed',
      });
    } finally {
      setIsScanning(false);
    }
  }

  return { sync, isSyncing: isScanning || syncMutation.isPending };
}
