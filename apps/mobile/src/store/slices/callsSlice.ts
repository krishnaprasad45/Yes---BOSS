import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Call, Paginated } from '@yes-boss/shared';
import { fetchBulkData } from '../bulkThunk';

interface CallsState {
  items: Call[];
  pagination: Paginated<Call>['pagination'] | null;
  /** ISO time the cache was last filled — drives staleness / "synced X ago". */
  updatedAt: string | null;
}

const initialState: CallsState = { items: [], pagination: null, updatedAt: null };

const callsSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    setCalls(state, action: PayloadAction<Paginated<Call>>) {
      state.items = action.payload.data;
      state.pagination = action.payload.pagination;
      state.updatedAt = new Date().toISOString();
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchBulkData.fulfilled, (state, action) => {
      state.items = action.payload.calls.data;
      state.pagination = action.payload.calls.pagination;
      state.updatedAt = action.payload.generatedAt;
    });
  },
});

export const { setCalls } = callsSlice.actions;
export default callsSlice.reducer;
