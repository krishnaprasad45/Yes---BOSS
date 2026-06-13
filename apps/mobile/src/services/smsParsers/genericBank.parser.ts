import type { SmsParser } from './types';
import {
  AMOUNT_RE,
  CREDIT_HINTS,
  DEBIT_HINTS,
  DUE_HINTS,
  extractMerchant,
  parseAmountMinor,
} from './common';

/**
 * Fallback parser for any bank-looking sender (DLT headers like VM-HDFCBK,
 * AD-SBIINB). Bank-specific parsers run first and take precedence; this one
 * catches the long tail with generic debit/credit/due heuristics.
 */
const BANK_SENDER_RE =
  /^[A-Z]{2}-?(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|BOB|CANB|IDFC|YES|INDUS|FED|UNION|IOB)/i;

export const genericBankParser: SmsParser = {
  id: 'generic-bank',

  match: sms => BANK_SENDER_RE.test(sms.sender),

  parse: sms => {
    const amountMatch = sms.body.match(AMOUNT_RE);
    const amountMinor = amountMatch ? parseAmountMinor(amountMatch[1]) : null;

    if (DUE_HINTS.test(sms.body)) {
      return {
        type: 'payment_due',
        amountMinor,
        merchant: extractMerchant(sms.body),
        source: 'generic-bank',
        dueAt: null, // due-date extraction is template-specific; bank parsers refine this
      };
    }

    if (amountMinor === null) return null;

    if (DEBIT_HINTS.test(sms.body)) {
      return {
        type: 'debit',
        amountMinor,
        merchant: extractMerchant(sms.body),
        source: 'generic-bank',
        dueAt: null,
      };
    }

    if (CREDIT_HINTS.test(sms.body)) {
      return {
        type: 'credit',
        amountMinor,
        merchant: extractMerchant(sms.body),
        source: 'generic-bank',
        dueAt: null,
      };
    }

    return null;
  },
};
