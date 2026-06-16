import { useState } from 'react';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import type { UploadCallMeta } from '@yes-boss/shared';
import { CallSyncItem, syncCalls, uploadRecording } from '@/services/api/calls.api';
import {
  isCallBackupAvailable,
  listRecordings,
  readCallLog,
  requestCallBackupPermissions,
  type NativeCallLogEntry,
  type NativeRecording,
} from '@/services/calls/nativeCalls';

/** Recording is matched to the call whose start time is within this window. */
const MATCH_WINDOW_MS = 5 * 60 * 1000;

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'm4a' || ext === 'mp4') return 'audio/mp4';
  if (ext === 'amr') return 'audio/amr';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'wav') return 'audio/wav';
  return 'audio/mpeg';
}

/** Nearest call-log entry to a recording's modified time, within the window. */
function matchCall(
  rec: NativeRecording,
  calls: NativeCallLogEntry[],
): NativeCallLogEntry | null {
  let best: NativeCallLogEntry | null = null;
  let bestDelta = MATCH_WINDOW_MS;
  for (const c of calls) {
    const delta = Math.abs(c.occurredAtMs - rec.modifiedAtMs);
    if (delta <= bestDelta) {
      best = c;
      bestDelta = delta;
    }
  }
  return best;
}

/**
 * Full call-backup pipeline:
 *  1. read the device call log → sync metadata to the backend
 *  2. list call recordings → match each to a call → upload the audio
 * Best-effort per file; one failed upload doesn't abort the rest.
 */
export function useCallBackup() {
  const qc = useQueryClient();
  const [isBackingUp, setIsBackingUp] = useState(false);

  async function backup() {
    if (!isCallBackupAvailable()) {
      Toast.show({ type: 'error', text1: 'Call backup needs the Android app' });
      return;
    }
    setIsBackingUp(true);
    try {
      const granted = await requestCallBackupPermissions();
      if (!granted) {
        Toast.show({ type: 'error', text1: 'Call/storage permission denied' });
        return;
      }

      const log = await readCallLog(0, 500);
      const items: CallSyncItem[] = log.map(c => ({
        contactName: c.contactName,
        phoneNumber: c.phoneNumber,
        direction: c.direction,
        durationSec: c.durationSec,
        occurredAt: new Date(c.occurredAtMs).toISOString(),
      }));
      if (items.length > 0) await syncCalls(items);

      const recordings = await listRecordings(0, 200);
      let uploaded = 0;
      for (const rec of recordings) {
        const call = matchCall(rec, log);
        if (!call) continue;
        const meta: UploadCallMeta = {
          contactName: call.contactName,
          phoneNumber: call.phoneNumber,
          direction: call.direction,
          durationSec: call.durationSec,
          occurredAt: new Date(call.occurredAtMs).toISOString(),
          sourceFileName: rec.name,
        };
        try {
          await uploadRecording(meta, {
            uri: rec.uri,
            name: rec.name,
            type: guessMime(rec.name),
          });
          uploaded++;
        } catch {
          // skip this file; keep going
        }
      }

      qc.invalidateQueries({ queryKey: ['calls'] });
      Toast.show({
        type: 'success',
        text1: `Backed up ${items.length} calls, ${uploaded} recordings`,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Backup failed',
      });
    } finally {
      setIsBackingUp(false);
    }
  }

  return { backup, isBackingUp };
}
