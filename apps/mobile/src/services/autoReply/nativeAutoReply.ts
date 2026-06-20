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
    recapMode: string;
    callerSummaryEnabled: boolean;
  }): Promise<boolean>;
  setRecapAuth(apiBaseUrl: string, deviceToken: string): Promise<boolean>;
  getPendingRecaps(): Promise<PendingRecap[]>;
  sendRecap(id: string, body: string): Promise<boolean>;
  discardRecap(id: string): Promise<boolean>;
}

/** A recap awaiting the owner's review (Smart/Ask path). */
export interface PendingRecap {
  id: string;
  number: string;
  body: string;
  who: string;
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
    recapMode: config.recapMode,
    callerSummaryEnabled: config.callerSummaryEnabled,
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

/** Recaps queued for the owner to review/edit before sending. */
export async function getPendingRecaps(): Promise<PendingRecap[]> {
  if (!AutoReply) return [];
  return AutoReply.getPendingRecaps();
}

/** Send a reviewed (possibly edited) recap; clears it from the queue. */
export async function sendPendingRecap(id: string, body: string): Promise<boolean> {
  if (!AutoReply) return false;
  return AutoReply.sendRecap(id, body);
}

/** Drop a pending recap without sending. */
export async function discardPendingRecap(id: string): Promise<boolean> {
  if (!AutoReply) return false;
  return AutoReply.discardRecap(id);
}
