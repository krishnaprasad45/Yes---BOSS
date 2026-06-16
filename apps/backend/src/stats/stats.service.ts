import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  CallStats,
  DailyDigest,
  DashboardStats,
  PeakUsageBucket,
  SpendingStats,
  Subscription,
} from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /** Combined dashboard over a date range (defaults to the last 30 days). */
  async overview(from?: string, to?: string): Promise<DashboardStats> {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [calls, spending] = await Promise.all([
      this.callStats(fromDate, toDate),
      this.spendingStats(fromDate, toDate),
    ]);

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      calls,
      spending,
    };
  }

  /** Single-day rollup for the digest. */
  async digest(date?: string): Promise<DailyDigest> {
    const day = date ? new Date(date) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const callWhere: Prisma.CallWhereInput = {
      occurredAt: { gte: start, lt: end },
    };
    const txnWhere: Prisma.SmsTxnWhereInput = {
      receivedAt: { gte: start, lt: end },
    };

    const [callsCount, missedCount, debit, credit, billsDue] = await Promise.all([
      this.prisma.call.count({ where: callWhere }),
      this.prisma.call.count({ where: { ...callWhere, direction: "missed" } }),
      this.prisma.smsTxn.aggregate({
        where: { ...txnWhere, type: "debit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.aggregate({
        where: { ...txnWhere, type: "credit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.count({ where: { ...txnWhere, type: "payment_due" } }),
    ]);

    return {
      date: start.toISOString().slice(0, 10),
      spentMinor: debit._sum.amountMinor ?? 0,
      creditedMinor: credit._sum.amountMinor ?? 0,
      callsCount,
      missedCount,
      billsDue,
    };
  }

  /**
   * Infers recurring subscriptions from debit SMS: merchants charged 2+ times
   * at a roughly regular cadence. Amount is the median charge; cadence is the
   * average gap between consecutive charges.
   */
  async subscriptions(): Promise<Subscription[]> {
    const rows = await this.prisma.smsTxn.findMany({
      where: { type: "debit", merchant: { not: null }, amountMinor: { not: null } },
      select: { merchant: true, amountMinor: true, receivedAt: true },
      orderBy: { receivedAt: "asc" },
    });

    const byMerchant = new Map<
      string,
      { amounts: number[]; times: number[] }
    >();
    for (const r of rows) {
      const key = r.merchant as string;
      const group = byMerchant.get(key) ?? { amounts: [], times: [] };
      group.amounts.push(r.amountMinor as number);
      group.times.push(r.receivedAt.getTime());
      byMerchant.set(key, group);
    }

    const subs: Subscription[] = [];
    for (const [merchant, g] of byMerchant) {
      if (g.times.length < 2) continue;
      const gaps: number[] = [];
      for (let i = 1; i < g.times.length; i++) {
        gaps.push(g.times[i] - g.times[i - 1]);
      }
      const avgGapDays =
        gaps.reduce((s, x) => s + x, 0) / gaps.length / (24 * 60 * 60 * 1000);
      // Only treat weekly–quarterly regular charges as subscriptions.
      if (avgGapDays < 5 || avgGapDays > 100) continue;

      subs.push({
        merchant,
        amountMinor: median(g.amounts),
        occurrences: g.times.length,
        cadenceDays: Math.round(avgGapDays),
        lastChargedAt: new Date(g.times[g.times.length - 1]).toISOString(),
      });
    }
    return subs.sort((a, b) => b.amountMinor - a.amountMinor);
  }

  /** Call volume bucketed by hour of day, over the given range (default 90d). */
  async peakUsage(from?: string, to?: string): Promise<PeakUsageBucket[]> {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.call.findMany({
      where: { occurredAt: { gte: fromDate, lte: toDate } },
      select: { occurredAt: true },
    });

    const buckets: number[] = new Array(24).fill(0);
    for (const r of rows) buckets[r.occurredAt.getHours()]++;
    return buckets.map((count, hour) => ({ hour, count }));
  }

  private async callStats(from: Date, to: Date): Promise<CallStats> {
    const where: Prisma.CallWhereInput = { occurredAt: { gte: from, lte: to } };

    const [byDirection, talk, topRows] = await Promise.all([
      this.prisma.call.groupBy({
        by: ["direction"],
        where,
        _count: { _all: true },
      }),
      this.prisma.call.aggregate({ where, _sum: { durationSec: true } }),
      this.prisma.call.groupBy({
        by: ["contactName"],
        where: { ...where, contactName: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { contactName: "desc" } },
        take: 5,
      }),
    ]);

    const count = (dir: string) =>
      byDirection.find((r) => r.direction === dir)?._count._all ?? 0;

    return {
      total: byDirection.reduce((sum, r) => sum + r._count._all, 0),
      incoming: count("incoming"),
      outgoing: count("outgoing"),
      missed: count("missed"),
      rejected: count("rejected"),
      totalTalkSec: talk._sum.durationSec ?? 0,
      topContacts: topRows.map((r) => ({
        name: r.contactName ?? "Unknown",
        count: r._count._all,
      })),
    };
  }

  private async spendingStats(from: Date, to: Date): Promise<SpendingStats> {
    const where: Prisma.SmsTxnWhereInput = { receivedAt: { gte: from, lte: to } };

    const [debit, credit, dueCount] = await Promise.all([
      this.prisma.smsTxn.aggregate({
        where: { ...where, type: "debit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.aggregate({
        where: { ...where, type: "credit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.count({ where: { ...where, type: "payment_due" } }),
    ]);

    const totalSpent = debit._sum.amountMinor ?? 0;
    const totalCredited = credit._sum.amountMinor ?? 0;
    return {
      totalSpent,
      totalCredited,
      netMinor: totalCredited - totalSpent,
      dueCount,
    };
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
