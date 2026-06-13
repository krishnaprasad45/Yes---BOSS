import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { SmsTxn, SpendingSummary } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ListSmsTxnsDto, SummaryQueryDto, SyncSmsTxnsDto } from "./dto";

@Injectable()
export class SmsTxnService {
  constructor(private prisma: PrismaService) {}

  /**
   * Idempotent batch insert. The device parses SMS and sends a stable
   * `dedupeKey` per message; re-syncing the inbox never creates duplicates.
   * Returns how many were newly inserted vs skipped.
   */
  async sync(dto: SyncSmsTxnsDto): Promise<{ inserted: number; skipped: number }> {
    if (dto.items.length === 0) return { inserted: 0, skipped: 0 };

    const result = await this.prisma.smsTxn.createMany({
      data: dto.items.map((i) => ({
        type: i.type,
        amountMinor: i.amountMinor,
        merchant: i.merchant,
        source: i.source,
        rawBody: i.rawBody,
        sender: i.sender,
        receivedAt: new Date(i.receivedAt),
        dueAt: i.dueAt ? new Date(i.dueAt) : null,
        dedupeKey: i.dedupeKey,
      })),
      skipDuplicates: true, // relies on @@unique(dedupeKey)
    });

    return { inserted: result.count, skipped: dto.items.length - result.count };
  }

  async list(
    query: ListSmsTxnsDto,
  ): Promise<{ data: SmsTxn[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.smsTxn.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.smsTxn.count({ where }),
    ]);

    return { data: rows.map(toSmsTxn), total, page, limit };
  }

  async summary(query: SummaryQueryDto): Promise<SpendingSummary> {
    const where = this.dateWhere(query.from, query.to);

    const [debit, credit, byCategoryRows, dueCount] = await Promise.all([
      this.prisma.smsTxn.aggregate({
        where: { ...where, type: "debit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.aggregate({
        where: { ...where, type: "credit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.groupBy({
        by: ["category"],
        where: { ...where, type: "debit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.count({ where: { ...where, type: "payment_due" } }),
    ]);

    return {
      totalSpent: debit._sum.amountMinor ?? 0,
      totalCredited: credit._sum.amountMinor ?? 0,
      byCategory: byCategoryRows
        .filter((r) => (r._sum.amountMinor ?? 0) > 0)
        .map((r) => ({
          category: r.category ?? "uncategorized",
          totalMinor: r._sum.amountMinor ?? 0,
        }))
        .sort((a, b) => b.totalMinor - a.totalMinor),
      dueCount,
    };
  }

  private buildWhere(query: ListSmsTxnsDto): Prisma.SmsTxnWhereInput {
    const where: Prisma.SmsTxnWhereInput = this.dateWhere(query.from, query.to);
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { merchant: { contains: query.search, mode: "insensitive" } },
        { sender: { contains: query.search, mode: "insensitive" } },
        { rawBody: { contains: query.search, mode: "insensitive" } },
      ];
    }
    return where;
  }

  private dateWhere(from?: string, to?: string): Prisma.SmsTxnWhereInput {
    if (!from && !to) return {};
    const receivedAt: Prisma.DateTimeFilter = {};
    if (from) receivedAt.gte = new Date(from);
    if (to) receivedAt.lte = new Date(to);
    return { receivedAt };
  }
}

function toSmsTxn(row: {
  id: string;
  type: string;
  amountMinor: number | null;
  currency: string;
  merchant: string | null;
  source: string | null;
  category: string | null;
  rawBody: string;
  sender: string;
  receivedAt: Date;
  dueAt: Date | null;
  createdAt: Date;
}): SmsTxn {
  return {
    id: row.id,
    type: row.type as SmsTxn["type"],
    amountMinor: row.amountMinor,
    currency: "INR",
    merchant: row.merchant,
    source: row.source,
    category: row.category,
    rawBody: row.rawBody,
    sender: row.sender,
    receivedAt: row.receivedAt.toISOString(),
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
