import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  DailyDigest,
  DashboardStats,
  DistanceSummary,
  PeakUsageBucket,
  Subscription,
} from '@yes-boss/shared';
import { fetchBulkData } from '../bulkThunk';

interface StatsState {
  overview: DashboardStats | null;
  digest: DailyDigest | null;
  distance: DistanceSummary | null;
  subscriptions: Subscription[];
  peakUsage: PeakUsageBucket[];
  updatedAt: string | null;
}

const initialState: StatsState = {
  overview: null,
  digest: null,
  distance: null,
  subscriptions: [],
  peakUsage: [],
  updatedAt: null,
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    setOverview(state, action: PayloadAction<DashboardStats>) {
      state.overview = action.payload;
    },
    setDigest(state, action: PayloadAction<DailyDigest>) {
      state.digest = action.payload;
    },
    setDistance(state, action: PayloadAction<DistanceSummary>) {
      state.distance = action.payload;
    },
    setSubscriptions(state, action: PayloadAction<Subscription[]>) {
      state.subscriptions = action.payload;
    },
    setPeakUsage(state, action: PayloadAction<PeakUsageBucket[]>) {
      state.peakUsage = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchBulkData.fulfilled, (state, action) => {
      const { overview, digest, distance, subscriptions, peakUsage } = action.payload.stats;
      state.overview = overview;
      state.digest = digest;
      state.distance = distance;
      state.subscriptions = subscriptions;
      state.peakUsage = peakUsage;
      state.updatedAt = action.payload.generatedAt;
    });
  },
});

export const { setOverview, setDigest, setDistance, setSubscriptions, setPeakUsage } =
  statsSlice.actions;
export default statsSlice.reducer;
