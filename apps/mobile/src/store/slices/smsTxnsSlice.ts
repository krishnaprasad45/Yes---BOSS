import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Paginated, SmsTxn, SpendingSummary } from '@yes-boss/shared';
import { fetchBulkData } from '../bulkThunk';

interface SmsTxnsState {
  items: SmsTxn[];
  pagination: Paginated<SmsTxn>['pagination'] | null;
  summary: SpendingSummary | null;
  updatedAt: string | null;
}

const initialState: SmsTxnsState = {
  items: [],
  pagination: null,
  summary: null,
  updatedAt: null,
};

const smsTxnsSlice = createSlice({
  name: 'smsTxns',
  initialState,
  reducers: {
    setSmsTxns(state, action: PayloadAction<Paginated<SmsTxn>>) {
      state.items = action.payload.data;
      state.pagination = action.payload.pagination;
      state.updatedAt = new Date().toISOString();
    },
    setSpendingSummary(state, action: PayloadAction<SpendingSummary>) {
      state.summary = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchBulkData.fulfilled, (state, action) => {
      state.items = action.payload.smsTxns.data;
      state.pagination = action.payload.smsTxns.pagination;
      state.summary = action.payload.spendingSummary;
      state.updatedAt = action.payload.generatedAt;
    });
  },
});

export const { setSmsTxns, setSpendingSummary } = smsTxnsSlice.actions;
export default smsTxnsSlice.reducer;
