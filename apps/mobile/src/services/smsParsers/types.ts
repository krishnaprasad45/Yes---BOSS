import type { SmsTxnSyncItem } from '@yes-boss/shared';

/** Raw SMS as read from the device inbox. */
export interface RawSms {
  sender: string;
  body: string;
  /** Epoch ms from the SMS provider. */
  receivedAtMs: number;
}

/**
 * One parser per bank/UPI template family. `match` is a cheap sender-address
 * gate; `parse` returns null when the body doesn't fit any known template.
 */
export interface SmsParser {
  /** Stable id stored as SmsTxn.source, e.g. "hdfc". */
  id: string;
  match: (sms: RawSms) => boolean;
  parse: (sms: RawSms) => Omit<SmsTxnSyncItem, 'dedupeKey' | 'rawBody' | 'sender' | 'receivedAt'> | null;
}
