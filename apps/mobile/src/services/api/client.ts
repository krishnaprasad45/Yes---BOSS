import { Platform } from 'react-native';
import type { AuthTokens, ItemResponse } from '@yes-boss/shared';
import { clearTokens, getTokens, setTokens } from './tokenStore';

// Host that serves the backend API, as reachable FROM the device.
// - Physical device (USB/wireless): PC's LAN IP on the shared network.
// - Android emulator: 10.0.2.2 maps to the host loopback.
// Change DEV_HOST when your network/IP changes (e.g. switching wifi/hotspot).
// Physical device over USB uses `adb reverse tcp:4000 tcp:4000`, so localhost
// on the device tunnels to the PC — robust against wifi/IP changes. For a LAN
// (wireless) setup instead, set DEV_HOST to the PC's current LAN IP.
const DEV_HOST = 'localhost'; // via adb reverse (USB)
const API_PORT = 4000; // backend port (3000 used by another local project)
const USE_EMULATOR = false; // set true only when running on an Android emulator

// Production backend. Set this to your deployed HTTPS URL (no trailing slash)
// before building a release APK for real users, e.g.
//   'https://api.yesboss.example.com'
// Leave '' for local dev (localhost via adb reverse / emulator). HTTPS is
// required — Android blocks cleartext to non-local hosts by default.
const PROD_API_URL = 'http://15.135.240.26:4000';

export const BASE_URL =
  PROD_API_URL ||
  (USE_EMULATOR ? `http://10.0.2.2:${API_PORT}` : `http://${DEV_HOST}:${API_PORT}`);

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
