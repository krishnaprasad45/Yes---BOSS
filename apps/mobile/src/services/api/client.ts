import { Platform } from 'react-native';
import type { AuthTokens, ItemResponse } from '@yes-boss/shared';
import { clearTokens, getTokens, setTokens } from './tokenStore';

// Android emulator reaches the host machine via 10.0.2.2.
// Physical device: replace with your PC's LAN IP (Settings screen later).
export const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fired when refresh fails — useAuth subscribes to flip the app to the login screen. */
type SessionListener = () => void;
const sessionListeners = new Set<SessionListener>();
export function onSessionExpired(fn: SessionListener): () => void {
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
}

// Single-flight refresh: concurrent 401s share one refresh request.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tokens = await getTokens();
      if (!tokens) throw new ApiError(401, 'Not authenticated');
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!res.ok) {
        await clearTokens();
        sessionListeners.forEach(fn => fn());
        throw new ApiError(401, 'Session expired');
      }
      const json = (await res.json()) as ItemResponse<AuthTokens>;
      await setTokens(json.data);
      return json.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestInit = {},
  _retried = false,
): Promise<TResponse> {
  const tokens = await getTokens();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401 && !_retried) {
    await refreshAccessToken();
    return apiFetch<TResponse>(path, options, true);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.message ?? `Request failed (${res.status})`);
  }
  return json as TResponse;
}
