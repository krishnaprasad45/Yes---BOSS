import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { Permission } from 'react-native';
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

/** The audio-read permission that actually exists on this OS version. */
function audioPermission(): Permission {
  // READ_MEDIA_AUDIO only exists on Android 13+ (API 33). On older versions it
  // is an unknown permission and can never be granted — use legacy storage.
  return Number(Platform.Version) >= 33
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
}

/**
 * Requests call-log + audio read. READ_CALL_LOG is mandatory (it gates the
 * whole feature); audio is best-effort — without it we still sync the call log,
 * just skip recordings. Returns whether each was granted.
 */
export async function requestCallBackupPermissions(): Promise<{
  callLog: boolean;
  audio: boolean;
}> {
  if (Platform.OS !== 'android') return { callLog: false, audio: false };
  const audio = audioPermission();
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    audio,
  ]);
  return {
    callLog:
      granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] ===
      PermissionsAndroid.RESULTS.GRANTED,
    audio: granted[audio] === PermissionsAndroid.RESULTS.GRANTED,
  };
}

export async function readCallLog(afterMs = 0, limit = 500): Promise<NativeCallLogEntry[]> {
  if (!CallLogReader) throw new Error('CallLogReader native module unavailable');
  return CallLogReader.readCallLog(afterMs, limit);
}

export async function listRecordings(afterMs = 0, limit = 200): Promise<NativeRecording[]> {
  if (!RecordingsReader) throw new Error('RecordingsReader native module unavailable');
  return RecordingsReader.listRecordings(afterMs, limit);
}
