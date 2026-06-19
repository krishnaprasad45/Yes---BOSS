import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { AutoReplyConfig } from '@yes-boss/shared';

interface AutoReplyNative {
  setConfig(config: {
    enabled: boolean;
    message: string;
    signature: string;
    cooldownMinutes: number;
    recapEnabled: boolean;
    recapNumber: string;
  }): Promise<boolean>;
  setRecapAuth(apiBaseUrl: string, deviceToken: string): Promise<boolean>;
}

const { AutoReply } = NativeModules as { AutoReply?: AutoReplyNative };

export function isAutoReplyAvailable(): boolean {
  return Platform.OS === 'android' && !!AutoReply;
}

/** SEND_SMS + READ_PHONE_STATE — required for the receiver to text missed callers. */
export async function requestAutoReplyPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  ]);
  return (
    granted[PermissionsAndroid.PERMISSIONS.SEND_SMS] ===
      PermissionsAndroid.RESULTS.GRANTED &&
    granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

/** Push the backend config down to the native SharedPreferences store. */
export async function pushAutoReplyConfig(config: AutoReplyConfig): Promise<void> {
  if (!AutoReply) return;
  await AutoReply.setConfig({
    enabled: config.enabled,
    message: config.message,
    signature: config.signature,
    cooldownMinutes: config.cooldownMinutes,
    recapEnabled: config.recapEnabled,
    recapNumber: config.recapNumber,
  });
}

/**
 * Hand the background recap worker what it needs to reach the backend while the
 * app is closed: the API base URL and a long-lived device token.
 */
export async function pushRecapAuth(
  apiBaseUrl: string,
  deviceToken: string,
): Promise<void> {
  if (!AutoReply) return;
  await AutoReply.setRecapAuth(apiBaseUrl, deviceToken);
}
