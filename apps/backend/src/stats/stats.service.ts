import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { CallStats, DailyDigest, DashboardStats, SpendingStats } from "@yes-boss/shared";
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
