/**
 * One-shot hydration snapshot (offline-first). The app fetches this on launch
 * and persists each slice to disk (MMKV) so every tab works without internet.
 * First page of lists only (10 items) — deeper pages load on demand when online.
 */
import type { Call } from "./call";
import type { SmsTxn, SpendingSummary } from "./smsTxn";
import type {
  DailyDigest,
  DashboardStats,
  PeakUsageBucket,
  Subscription,
} from "./stats";
import type { DistanceSummary } from "./location";
import type { AutoReplyConfig } from "./settings";
import type { Paginated } from "./api";

export interface BulkSnapshot {
  /** ISO timestamp the server built this snapshot — drives staleness checks. */
  generatedAt: string;
  calls: Paginated<Call>;
  smsTxns: Paginated<SmsTxn>;
  spendingSummary: SpendingSummary;
  stats: {
    overview: DashboardStats;
    digest: DailyDigest;
    distance: DistanceSummary;
    subscriptions: Subscription[];
    peakUsage: PeakUsageBucket[];
  };
  settings: {
    autoReply: AutoReplyConfig;
  };
}
