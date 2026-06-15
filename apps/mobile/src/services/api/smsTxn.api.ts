import type {
  ItemResponse,
  Paginated,
  SmsTxn,
  SmsTxnListParams,
  SmsTxnSyncItem,
  SpendingSummary,
} from '@yes-boss/shared';
import { apiFetch } from './client';

function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

const BASE = '/api/v1/sms-txns';

export async function listSmsTxns(params: SmsTxnListParams): Promise<Paginated<SmsTxn>> {
  const qs = buildQueryString({ ...params });
  return apiFetch<Paginated<SmsTxn>>(`${BASE}${qs ? `?${qs}` : ''}`);
}

export async function syncSmsTxns(
  items: SmsTxnSyncItem[],
): Promise<ItemResponse<{ inserted: number; skipped: number }>> {
  return apiFetch(`${BASE}/sync`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function getSpendingSummary(params: {
  from?: string;
  to?: string;
}): Promise<ItemResponse<SpendingSummary>> {
  const qs = buildQueryString(params);
  return apiFetch<ItemResponse<SpendingSummary>>(`${BASE}/summary${qs ? `?${qs}` : ''}`);
}
