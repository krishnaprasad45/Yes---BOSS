import { Injectable } from "@nestjs/common";
import type { BulkSnapshot } from "@yes-boss/shared";
import { CallService } from "../call/call.service";
import { SmsTxnService } from "../sms-txn/sms-txn.service";
import { StatsService } from "../stats/stats.service";
import { LocationService } from "../location/location.service";
import { SettingsService } from "../settings/settings.service";
import { FinanceService } from "../finance/finance.service";
import { paginated } from "../common/envelope";

/** Inclusive ISO bounds for the server's "today". */
function todayRange(): { from: string; to: string } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** First page size baked into the hydration snapshot. */
const SNAPSHOT_PAGE = 10;

@Injectable()
export class BulkService {
  constructor(
    private calls: CallService,
    private smsTxns: SmsTxnService,
    private stats: StatsService,
    private location: LocationService,
    private settings: SettingsService,
    private finance: FinanceService,
  ) {}

  /**
   * Composes every dashboard read into one response so the app can hydrate its
   * offline store from a single call. Runs all queries in parallel.
   */
  async snapshot(userId: string): Promise<BulkSnapshot> {
    const [
      callsPage,
      smsPage,
      spendingSummary,
      overview,
      digest,
      distance,
      subscriptions,
      peakUsage,
      autoReply,
    ] = await Promise.all([
      this.calls.list({ page: 1, limit: SNAPSHOT_PAGE }),
      this.smsTxns.list({ page: 1, limit: SNAPSHOT_PAGE }),
      this.smsTxns.summary({}),
      this.stats.overview(),
      this.stats.digest(),
      this.location.distance({}),
      this.stats.subscriptions(),
      this.stats.peakUsage(),
      this.settings.getAutoReply(userId),
    ]);

    const today = todayRange();
    const [categories, financeConfig, todayInsights] = await Promise.all([
      this.finance.listCategories(),
      this.finance.getConfig(userId),
      this.finance.insights(userId, today),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      calls: paginated(callsPage.data, callsPage.total, callsPage.page, callsPage.limit),
      smsTxns: paginated(smsPage.data, smsPage.total, smsPage.page, smsPage.limit),
      spendingSummary,
      stats: { overview, digest, distance, subscriptions, peakUsage },
      settings: { autoReply },
      finance: { categories, config: financeConfig, todayInsights },
    };
  }
}
