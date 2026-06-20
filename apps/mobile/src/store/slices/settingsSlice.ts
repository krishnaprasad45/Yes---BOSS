import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AutoReplyConfig, UpdateAutoReplyConfig } from '@yes-boss/shared';
import { fetchBulkData } from '../bulkThunk';

interface SettingsState {
  autoReply: AutoReplyConfig | null;
  updatedAt: string | null;
}

const initialState: SettingsState = { autoReply: null, updatedAt: null };

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /** Authoritative server value — server wins on any conflict. */
    setAutoReply(state, action: PayloadAction<AutoReplyConfig>) {
      state.autoReply = action.payload;
      state.updatedAt = new Date().toISOString();
    },
    /** Optimistic local merge applied before the write reaches the server. */
    patchAutoReplyOptimistic(state, action: PayloadAction<UpdateAutoReplyConfig>) {
      if (state.autoReply) {
        state.autoReply = { ...state.autoReply, ...action.payload };
      }
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchBulkData.fulfilled, (state, action) => {
      state.autoReply = action.payload.settings.autoReply;
      state.updatedAt = action.payload.generatedAt;
    });
  },
});

export const { setAutoReply, patchAutoReplyOptimistic } = settingsSlice.actions;
export default settingsSlice.reducer;
