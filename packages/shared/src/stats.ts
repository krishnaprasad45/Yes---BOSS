/** Aggregate analytics across calls and SMS transactions (Phase 5). */

export interface CallStats {
  total: number;
  incoming: number;
  outgoing: number;
  missed: number;
  rejected: number;
  /** Total connected talk time across the period. */
  totalTalkSec: number;
  /** Most-frequent contacts in the period, busiest first. */
  topContacts: { name: string; count: number }[];
}

export interface SpendingStats {
  totalSpent: number;
  totalCredited: number;
  /** totalCredited - totalSpent, in minor units. */
  netMinor: number;
  dueCount: number;
}

export interface DashboardStats {
  /** ISO range the figures cover. */
  from: string;
  to: string;
  calls: CallStats;
  spending: SpendingStats;
}

/** A recurring debit the detector inferred from SMS transactions (Phase 7). */
export interface Subscription {
  merchant: string;
  /** Typical charge amount in minor units. */
  amountMinor: number;
  /** Times seen in the window. */
  occurrences: number;
  /** Rough cadence in days between charges. */
  cadenceDays: number;
  /** ISO timestamp of the most recent charge. */
  lastChargedAt: string;
}

/** Call volume by hour of day (0–23), for spotting peak usage (Phase 7). */
export interface PeakUsageBucket {
  hour: number;
  count: number;
}

/** One-day rollup for the daily digest. */
export interface DailyDigest {
  date: string; // YYYY-MM-DD
  spentMinor: number;
  creditedMinor: number;
  callsCount: number;
  incomingCount: number;
  outgoingCount: number;
  missedCount: number;
  billsDue: number;
}
