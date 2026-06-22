import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Category, FinanceConfig, SpendingInsights } from '@yes-boss/shared';
import { fetchBulkData } from '../bulkThunk';

interface FinanceState {
  categories: Category[];
  config: FinanceConfig | null;
  /** "Today" insights from the last bulk/refresh — instant offline paint. */
  todayInsights: SpendingInsights | null;
  updatedAt: string | null;
}

const initialState: FinanceState = {
  categories: [],
  config: null,
  todayInsights: null,
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
  },
  extraReducers: builder => {
    builder.addCase(fetchBulkData.fulfilled, (state, action) => {
      state.categories = action.payload.finance.categories;
      state.config = action.payload.finance.config;
      state.todayInsights = action.payload.finance.todayInsights;
      state.updatedAt = action.payload.generatedAt;
    });
  },
});

export const { setCategories, setConfig, setTodayInsights } = financeSlice.actions;
export default financeSlice.reducer;
