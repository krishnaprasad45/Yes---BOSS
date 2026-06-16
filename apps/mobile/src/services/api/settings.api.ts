import type {
  AutoReplyConfig,
  ItemResponse,
  UpdateAutoReplyConfig,
} from '@yes-boss/shared';
import { apiFetch } from './client';

const BASE = '/api/v1/settings';

export async function getAutoReplyConfig(): Promise<ItemResponse<AutoReplyConfig>> {
  return apiFetch<ItemResponse<AutoReplyConfig>>(`${BASE}/auto-reply`);
}

export async function updateAutoReplyConfig(
  patch: UpdateAutoReplyConfig,
): Promise<ItemResponse<AutoReplyConfig>> {
  return apiFetch<ItemResponse<AutoReplyConfig>>(`${BASE}/auto-reply`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}
