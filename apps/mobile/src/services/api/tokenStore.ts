import * as Keychain from 'react-native-keychain';
import type { AuthTokens } from '@yes-boss/shared';

const SERVICE = 'yes-boss-auth';

// In-memory cache so apiFetch doesn't hit Keychain on every request.
let cached: AuthTokens | null | undefined;

export async function getTokens(): Promise<AuthTokens | null> {
  if (cached !== undefined) return cached;
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  cached = creds ? (JSON.parse(creds.password) as AuthTokens) : null;
  return cached;
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  cached = tokens;
  await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), {
    service: SERVICE,
  });
}

export async function clearTokens(): Promise<void> {
  cached = null;
  await Keychain.resetGenericPassword({ service: SERVICE });
}
