import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Category, FinanceConfig, ManualTxnInput, SpendingInsights } from '@yes-boss/shared';
import { fetchBulkData } from '../bulkThunk';

export interface PendingTxn extends ManualTxnInput {
  localId: string;
  createdAt: string;
}

interface FinanceState {
  categories: Category[];
  config: FinanceConfig | null;
  todayInsights: SpendingInsights | null;
  /** Manual txns added offline, not yet flushed to the server. */
  pendingTxns: PendingTxn[];
  updatedAt: string | null;
}

const initialState: FinanceState = {
  categories: [],
  config: null,
  todayInsights: null,
  pendingTxns: [],
  updatedAt: null,
};

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setCategories(state, action: PayloadAction<Category[]>) {
      state.categories = action.payload;
    },
    setConfig(state, action: PayloadAction<FinanceConfig>) {
      state.config = action.payload;
    },
    setTodayInsights(state, action: PayloadAction<SpendingInsights>) {
      state.todayInsights = action.payload;
    },
    /** Optimistically add a category (offline). Replaced by server data on sync. */
    addCategoryOptimistic(state, action: PayloadAction<Category>) {
      state.categories.push(action.payload);
    },
    /** Optimistically update a category (offline). */
    updateCategoryOptimistic(
      state,
      action: PayloadAction<{ id: string; patch: Partial<Category> }>,
    ) {
      const idx = state.categories.findIndex(c => c.id === action.payload.id);
      if (idx !== -1) Object.assign(state.categories[idx], action.payload.patch);
    },
    /** Optimistically remove a category (offline). */
    removeCategoryOptimistic(state, action: PayloadAction<string>) {
      state.categories = state.categories.filter(c => c.id !== action.payload);
    },
    addPendingTxn(state, action: PayloadAction<PendingTxn>) {
      state.pendingTxns.push(action.payload);
    },
    removePendingTxn(state, action: PayloadAction<string>) {
      state.pendingTxns = state.pendingTxns.filter(t => t.localId !== action.payload);
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchBulkData.fulfilled, (state, action) => {
      state.categories = action.payload.finance.categories;
      state.config = action.payload.finance.config;
      state.todayInsights = action.payload.finance.todayInsights;
      state.updatedAt = action.payload.generatedAt;
      // Server is now authoritative — clear txns that were pending.
      state.pendingTxns = [];
    });
  },
});

export const {
  setCategories,
  setConfig,
  setTodayInsights,
  addCategoryOptimistic,
  updateCategoryOptimistic,
  removeCategoryOptimistic,
  addPendingTxn,
  removePendingTxn,
} = financeSlice.actions;
export default financeSlice.reducer;
