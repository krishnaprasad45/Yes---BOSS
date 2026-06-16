import type {
  DailyDigest,
  DashboardStats,
  ItemResponse,
  PeakUsageBucket,
  Subscription,
} from '@yes-boss/shared';
import { apiFetch } from './client';

const BASE = '/api/v1/stats';

export async function getDashboardStats(range?: {
  from?: string;
  to?: string;
}): Promise<ItemResponse<DashboardStats>> {
  const sp = new URLSearchParams();
  if (range?.from) sp.append('from', range.from);
  if (range?.to) sp.append('to', range.to);
  const qs = sp.toString();
  return apiFetch<ItemResponse<DashboardStats>>(
    `${BASE}/overview${qs ? `?${qs}` : ''}`,
  );
}

export async function getDailyDigest(date?: string): Promise<ItemResponse<DailyDigest>> {
  return apiFetch<ItemResponse<DailyDigest>>(
    `${BASE}/digest${date ? `?date=${encodeURIComponent(date)}` : ''}`,
  );
}

export async function getSubscriptions(): Promise<ItemResponse<Subscription[]>> {
  return apiFetch<ItemResponse<Subscription[]>>(`${BASE}/subscriptions`);
}

export async function getPeakUsage(): Promise<ItemResponse<PeakUsageBucket[]>> {
  return apiFetch<ItemResponse<PeakUsageBucket[]>>(`${BASE}/peak-usage`);
}
