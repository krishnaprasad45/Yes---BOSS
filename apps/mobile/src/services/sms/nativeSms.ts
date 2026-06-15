import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { RawSms } from '@/services/smsParsers/types';

interface SmsReaderNative {
  /** newest-first; afterMs=0 reads whole inbox, limit caps row count. */
  readInbox(afterMs: number, limit: number): Promise<RawSms[]>;
}

const { SmsReader } = NativeModules as { SmsReader?: SmsReaderNative };

export function isSmsReaderAvailable(): boolean {
  return Platform.OS === 'android' && !!SmsReader;
}

/** Ask for READ_SMS at runtime. Returns true only when granted. */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: 'Read SMS',
      message:
        'Yes Boss reads bank & UPI SMS to build your spending analytics. ' +
        'Messages are parsed on-device; only transaction summaries sync.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function readInbox(afterMs = 0, limit = 500): Promise<RawSms[]> {
  if (!SmsReader) throw new Error('SmsReader native module unavailable');
  return SmsReader.readInbox(afterMs, limit);
}
