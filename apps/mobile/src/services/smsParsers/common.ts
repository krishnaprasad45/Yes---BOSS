/** Shared regex pieces + amount handling for bank SMS parsing. */

/** "Rs.1,234.56" / "INR 1234" / "₹ 99.00" → minor units (paise). */
export function parseAmountMinor(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

/** Matches the amount in most Indian bank SMS: Rs/INR/₹ prefix, optional separators. */
export const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;

export const DEBIT_HINTS = /\b(debited|debit|spent|paid|sent|withdrawn|purchase)\b/i;
export const CREDIT_HINTS = /\b(credited|credit|received|deposited|refund(?:ed)?)\b/i;
export const DUE_HINTS = /\b(due|overdue|bill.*generated|min(?:imum)?\s+amount)\b/i;

/** "to AMAZON" / "at SWIGGY" / "VPA merchant@upi" — best-effort counterparty. */
export const MERCHANT_RE =
  /(?:\bat|\bto|\bfrom|VPA)\s+([A-Za-z0-9@._-]{3,40}?)(?:\s+on|\s+via|\s+ref|\.|,|$)/i;

export function extractMerchant(body: string): string | null {
  const m = body.match(MERCHANT_RE);
  return m ? m[1].trim() : null;
}
