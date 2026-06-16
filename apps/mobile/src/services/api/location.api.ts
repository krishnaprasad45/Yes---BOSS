import type {
  DistanceSummary,
  ItemResponse,
  LocationPointInput,
} from '@yes-boss/shared';
import { apiFetch } from './client';

const BASE = '/api/v1/location';

export async function getDistance(range?: {
  from?: string;
  to?: string;
}): Promise<ItemResponse<DistanceSummary>> {
  const sp = new URLSearchParams();
  if (range?.from) sp.append('from', range.from);
  if (range?.to) sp.append('to', range.to);
  const qs = sp.toString();
  return apiFetch<ItemResponse<DistanceSummary>>(
    `${BASE}/distance${qs ? `?${qs}` : ''}`,
  );
}

export async function syncLocationPoints(
  points: LocationPointInput[],
): Promise<ItemResponse<{ inserted: number; skipped: number }>> {
  return apiFetch(`${BASE}/points`, {
    method: 'POST',
    body: JSON.stringify({ points }),
  });
}
