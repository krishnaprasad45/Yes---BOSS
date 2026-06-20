import { createAsyncThunk } from '@reduxjs/toolkit';
import type { BulkSnapshot } from '@yes-boss/shared';
import { getBulkSnapshot } from '@/services/api/bulk.api';

/**
 * Warm-hydrate every persisted slice from a single backend call. Each slice
 * listens for `fetchBulkData.fulfilled` in its extraReducers, so one dispatch
 * fills calls, SMS, stats and settings at once — the whole app paints offline
 * on the next launch from the MMKV-persisted result.
 */
export const fetchBulkData = createAsyncThunk<BulkSnapshot>('bulk/fetch', async () => {
  const res = await getBulkSnapshot();
  return res.data;
});
