/** Finance module — customisable categories, budget, manual entry, insights. */

export interface Category {
  id: string;
  name: string;
  /** Hex colour used for the donut slice + category bar. */
  color: string;
  /** Optional per-category daily budget in minor units; null = no budget. */
  dailyBudgetMinor: number | null;
  sortOrder: number;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  dailyBudgetMinor?: number | null;
}

export type UpdateCategoryInput = Partial<{
  name: string;
  color: string;
  dailyBudgetMinor: number | null;
  sortOrder: number;
}>;

export interface FinanceConfig {
  /** Overall daily spend budget in minor units. */
  dailyBudgetMinor: number;
  /** When on, the app shows the "add transaction manually" flow. */
  manualEntryEnabled: boolean;
}

export type UpdateFinanceConfigInput = Partial<FinanceConfig>;

/** Body for adding a transaction by hand (not from an SMS). */
export interface ManualTxnInput {
  type: "debit" | "credit";
  amountMinor: number;
  /** Category name (must match an existing Category); optional. */
  category?: string | null;
  /** Optional free-text note shown in the list. */
  note?: string | null;
  /** ISO timestamp; defaults to now on the server. */
  occurredAt?: string;
}

/** One slice of the category breakdown for a period. */
export interface CategorySpend {
  category: string;
  color: string;
  totalMinor: number;
  /** Share of total spend in the period, 0–100 (rounded). */
  percent: number;
}

/** Everything the Spending Insights screen needs for a date range. */
export interface SpendingInsights {
  from: string;
  to: string;
  totalSpent: number;
  totalCredited: number;
  dueCount: number;
  /** Daily budget (scaled to the period span on the client if needed). */
  dailyBudgetMinor: number;
  byCategory: CategorySpend[];
}
