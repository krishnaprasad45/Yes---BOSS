import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { Call } from '@yes-boss/shared';

export interface NativeCallLogEntry {
  phoneNumber: string;
  contactName: string | null;
  direction: Call['direction'];
  durationSec: number;
  occurredAtMs: number;
}

export interface NativeRecording {
  uri: string;
  name: string;
  sizeBytes: number;
  modifiedAtMs: number;
}

interface CallLogNative {
  readCallLog(afterMs: number, limit: number): Promise<NativeCallLogEntry[]>;
}
interface RecordingsNative {
  listRecordings(afterMs: number, limit: number): Promise<NativeRecording[]>;
}

const { CallLogReader, RecordingsReader } = NativeModules as {
  CallLogReader?: CallLogNative;
  RecordingsReader?: RecordingsNative;
};

export function isCallBackupAvailable(): boolean {
  return Platform.OS === 'android' && !!CallLogReader && !!RecordingsReader;
}

/** READ_CALL_LOG + audio storage. Returns true only when all are granted. */
export async function requestCallBackupPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const perms = [PermissionsAndroid.PERMISSIONS.READ_CALL_LOG];
  // Android 13+ uses READ_MEDIA_AUDIO; older uses READ_EXTERNAL_STORAGE.
  const audio =
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO ??
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  if (audio) perms.push(audio);

  const granted = await PermissionsAndroid.requestMultiple(perms);
  return perms.every(
    p => granted[p] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

export async function readCallLog(afterMs = 0, limit = 500): Promise<NativeCallLogEntry[]> {
  if (!CallLogReader) throw new Error('CallLogReader native module unavailable');
  return CallLogReader.readCallLog(afterMs, limit);
}

export async function listRecordings(afterMs = 0, limit = 200): Promise<NativeRecording[]> {
  if (!RecordingsReader) throw new Error('RecordingsReader native module unavailable');
  return RecordingsReader.listRecordings(afterMs, limit);
}
