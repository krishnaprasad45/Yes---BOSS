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

/** One-day rollup for the daily digest. */
export interface DailyDigest {
  date: string; // YYYY-MM-DD
  spentMinor: number;
  creditedMinor: number;
  callsCount: number;
  missedCount: number;
  billsDue: number;
}
