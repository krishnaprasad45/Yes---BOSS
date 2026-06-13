export type TxnType = "debit" | "credit" | "payment_due" | "spam" | "unknown";
export interface SmsTxn {
    id: string;
    type: TxnType;
    /** Amount in minor units (paise) to avoid float money. Null for spam/unknown. */
    amountMinor: number | null;
    currency: "INR";
    /** Merchant / counterparty extracted from the SMS, null if not parseable. */
    merchant: string | null;
    /** Bank or UPI app the SMS came from (parser id), e.g. "hdfc", "sbi", "gpay". */
    source: string | null;
    category: string | null;
    /** Raw SMS body — kept for re-parsing when templates improve. */
    rawBody: string;
    /** SMS sender address, e.g. "VM-HDFCBK". */
    sender: string;
    /** ISO 8601 — SMS received time on device. */
    receivedAt: string;
    /** Due date for payment_due messages. */
    dueAt: string | null;
    createdAt: string;
}
/** Device → backend batch sync. Parsed on device; backend stores + dedupes. */
export interface SmsTxnSyncItem {
    type: TxnType;
    amountMinor: number | null;
    merchant: string | null;
    source: string | null;
    rawBody: string;
    sender: string;
    receivedAt: string;
    dueAt: string | null;
    /** Stable device-side hash (sender + body + receivedAt) for dedupe. */
    dedupeKey: string;
}
export interface SmsTxnListParams {
    page?: number;
    limit?: number;
    search?: string;
    type?: TxnType;
    from?: string;
    to?: string;
}
export interface SpendingSummary {
    /** Minor units (paise). */
    totalSpent: number;
    totalCredited: number;
    byCategory: {
        category: string;
        totalMinor: number;
    }[];
    /** Upcoming payment_due items within the queried window. */
    dueCount: number;
}
