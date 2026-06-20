import type { BulkSnapshot, ItemResponse } from '@yes-boss/shared';
import { apiFetch } from './client';

/** One-shot offline-first hydration snapshot (calls, SMS, stats, settings). */
export async function getBulkSnapshot(): Promise<ItemResponse<BulkSnapshot>> {
  return apiFetch<ItemResponse<BulkSnapshot>>('/api/v1/bulk');
}
