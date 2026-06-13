import type { SmsTxnSyncItem } from '@yes-boss/shared';
import type { RawSms, SmsParser } from './types';
import { genericBankParser } from './genericBank.parser';

/**
 * Ordered registry — first match wins. Add bank-specific parsers ABOVE the
 * generic fallback as real SMS samples are collected (HDFC, SBI, GPay, ...).
 */
const parsers: SmsParser[] = [genericBankParser];

/** djb2 — stable dedupe key so re-syncing the inbox never duplicates rows. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

/** Null when no parser claims the SMS (not a transaction — skip, don't upload). */
export function parseSms(sms: RawSms): SmsTxnSyncItem | null {
  for (const parser of parsers) {
    if (!parser.match(sms)) continue;
    const parsed = parser.parse(sms);
    if (!parsed) continue;
    const receivedAt = new Date(sms.receivedAtMs).toISOString();
    return {
      ...parsed,
      rawBody: sms.body,
      sender: sms.sender,
      receivedAt,
      dedupeKey: hash(`${sms.sender}|${sms.body}|${sms.receivedAtMs}`),
    };
  }
  return null;
}
