import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
  /** null = unknown (before the first NetInfo event). */
  isConnected: boolean | null;
}

const initialState: NetworkState = { isConnected: null };

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
  },
});

export const { setConnected } = networkSlice.actions;
export default networkSlice.reducer;
