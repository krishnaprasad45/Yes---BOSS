import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  Category,
  FinanceConfig,
  SmsTxn,
  SpendingInsights,
} from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toSmsTxn } from "../sms-txn/sms-txn.service";
import {
  CreateCategoryDto,
  InsightsQueryDto,
  ManualTxnDto,
  UpdateCategoryDto,
  UpdateFinanceConfigDto,
} from "./dto";

/** Sensible starter categories seeded on first read. */
const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Food & Dining", color: "#FB923C" },
  { name: "Transport", color: "#6366F1" },
  { name: "Utilities", color: "#22C55E" },
  { name: "Shopping", color: "#A855F7" },
  { name: "Bills", color: "#EF4444" },
  { name: "Other", color: "#64748B" },
];

const UNCATEGORIZED_COLOR = "#64748B";

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ---- Categories -------------------------------------------------------

  /** Returns categories, seeding the defaults the first time. */
  async listCategories(): Promise<Category[]> {
    const count = await this.prisma.category.count();
    if (count === 0) {
      await this.prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })),
        skipDuplicates: true,
      });
    }
    const rows = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toCategory);
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const max = await this.prisma.category.aggregate({ _max: { sortOrder: true } });
    const row = await this.prisma.category.create({
      data: {
        name: dto.name,
        color: dto.color ?? "#2DD4BF",
        dailyBudgetMinor: dto.dailyBudgetMinor ?? null,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
    return toCategory(row);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.requireCategory(id);
    const row = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color,
        dailyBudgetMinor: dto.dailyBudgetMinor,
        sortOrder: dto.sortOrder,
      },
    });
    return toCategory(row);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.requireCategory(id);
    await this.prisma.category.delete({ where: { id } });
  }

  private async requireCategory(id: string) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Category not found");
    return found;
  }

  // ---- Config -----------------------------------------------------------

  async getConfig(userId: string): Promise<FinanceConfig> {
    const row = await this.prisma.financeConfig.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return { dailyBudgetMinor: row.dailyBudgetMinor, manualEntryEnabled: row.manualEntryEnabled };
  }

  async updateConfig(userId: string, dto: UpdateFinanceConfigDto): Promise<FinanceConfig> {
    const row = await this.prisma.financeConfig.upsert({
      where: { userId },
      update: { ...dto },
      create: { userId, ...dto },
    });
    return { dailyBudgetMinor: row.dailyBudgetMinor, manualEntryEnabled: row.manualEntryEnabled };
  }

  // ---- Manual transactions ---------------------------------------------

  /** Adds a transaction by hand; stored alongside SMS rows so analytics include it. */
  async addManual(dto: ManualTxnDto): Promise<SmsTxn> {
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const row = await this.prisma.smsTxn.create({
      data: {
        type: dto.type,
        amountMinor: dto.amountMinor,
        merchant: dto.note ?? null,
        source: "manual",
        category: dto.category ?? null,
        rawBody: dto.note ?? "",
        sender: "manual",
        receivedAt: occurredAt,
        entryMode: "manual",
        note: dto.note ?? null,
        dedupeKey: `manual:${occurredAt.getTime()}:${Math.random().toString(36).slice(2, 10)}`,
      },
    });
    return toSmsTxn(row);
  }

  // ---- Insights ---------------------------------------------------------

  async insights(userId: string, query: InsightsQueryDto): Promise<SpendingInsights> {
    const where = this.dateWhere(query.from, query.to);
    const categories = await this.listCategories();
    const colorByName = new Map(categories.map((c) => [c.name, c.color]));

    const [debit, credit, byCategoryRows, dueCount, config] = await Promise.all([
      this.prisma.smsTxn.aggregate({ where: { ...where, type: "debit" }, _sum: { amountMinor: true } }),
      this.prisma.smsTxn.aggregate({ where: { ...where, type: "credit" }, _sum: { amountMinor: true } }),
      this.prisma.smsTxn.groupBy({
        by: ["category"],
        where: { ...where, type: "debit" },
        _sum: { amountMinor: true },
      }),
      this.prisma.smsTxn.count({ where: { ...where, type: "payment_due" } }),
      this.getConfig(userId),
    ]);

    const totalSpent = debit._sum.amountMinor ?? 0;
    const byCategory = byCategoryRows
      .filter((r) => (r._sum.amountMinor ?? 0) > 0)
      .map((r) => {
        const name = r.category ?? "Uncategorized";
        const totalMinor = r._sum.amountMinor ?? 0;
        return {
          category: name,
          color: colorByName.get(name) ?? UNCATEGORIZED_COLOR,
          totalMinor,
          percent: totalSpent > 0 ? Math.round((totalMinor / totalSpent) * 100) : 0,
        };
      })
      .sort((a, b) => b.totalMinor - a.totalMinor);

    return {
      from: query.from ?? "",
      to: query.to ?? "",
      totalSpent,
      totalCredited: credit._sum.amountMinor ?? 0,
      dueCount,
      dailyBudgetMinor: config.dailyBudgetMinor,
      byCategory,
    };
  }

  private dateWhere(from?: string, to?: string): Prisma.SmsTxnWhereInput {
    if (!from && !to) return {};
    const receivedAt: Prisma.DateTimeFilter = {};
    if (from) receivedAt.gte = new Date(from);
    if (to) receivedAt.lte = new Date(to);
    return { receivedAt };
  }
}

function toCategory(row: {
  id: string;
  name: string;
  color: string;
  dailyBudgetMinor: number | null;
  sortOrder: number;
}): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    dailyBudgetMinor: row.dailyBudgetMinor,
    sortOrder: row.sortOrder,
  };
}
