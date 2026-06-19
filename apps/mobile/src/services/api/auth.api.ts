import type { AuthTokens, AuthUser, ItemResponse, LoginPayload } from '@yes-boss/shared';
import { apiFetch } from './client';

export async function login(
  payload: LoginPayload,
): Promise<ItemResponse<AuthTokens & { user: AuthUser }>> {
  return apiFetch(`/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function checkSecureHealth(): Promise<ItemResponse<{ up: boolean; db: boolean }>> {
  return apiFetch(`/api/v1/health/secure`);
}

/** Mint a long-lived token for the background recap worker. */
export async function getDeviceToken(): Promise<ItemResponse<{ deviceToken: string }>> {
  return apiFetch(`/api/v1/auth/device-token`, { method: 'POST' });
}
