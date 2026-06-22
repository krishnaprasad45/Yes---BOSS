import type {
  Category,
  CreateCategoryInput,
  FinanceConfig,
  ItemResponse,
  ManualTxnInput,
  SmsTxn,
  SpendingInsights,
  UpdateCategoryInput,
  UpdateFinanceConfigInput,
} from '@yes-boss/shared';
import { apiFetch } from './client';

const BASE = '/api/v1/finance';

export async function getCategories(): Promise<ItemResponse<Category[]>> {
  return apiFetch<ItemResponse<Category[]>>(`${BASE}/categories`);
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ItemResponse<Category>> {
  return apiFetch<ItemResponse<Category>>(`${BASE}/categories`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  id: string,
  patch: UpdateCategoryInput,
): Promise<ItemResponse<Category>> {
  return apiFetch<ItemResponse<Category>>(`${BASE}/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteCategory(id: string): Promise<ItemResponse<{ id: string }>> {
  return apiFetch<ItemResponse<{ id: string }>>(`${BASE}/categories/${id}`, {
    method: 'DELETE',
  });
}

export async function getFinanceConfig(): Promise<ItemResponse<FinanceConfig>> {
  return apiFetch<ItemResponse<FinanceConfig>>(`${BASE}/config`);
}

export async function updateFinanceConfig(
  patch: UpdateFinanceConfigInput,
): Promise<ItemResponse<FinanceConfig>> {
  return apiFetch<ItemResponse<FinanceConfig>>(`${BASE}/config`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function addManualTxn(input: ManualTxnInput): Promise<ItemResponse<SmsTxn>> {
  return apiFetch<ItemResponse<SmsTxn>>(`${BASE}/transactions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getInsights(range: {
  from?: string;
  to?: string;
}): Promise<ItemResponse<SpendingInsights>> {
  const sp = new URLSearchParams();
  if (range.from) sp.append('from', range.from);
  if (range.to) sp.append('to', range.to);
  const qs = sp.toString();
  return apiFetch<ItemResponse<SpendingInsights>>(`${BASE}/insights${qs ? `?${qs}` : ''}`);
}
