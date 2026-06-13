import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Toast from 'react-native-toast-message';
import type { AuthUser, LoginPayload } from '@yes-boss/shared';
import { login as loginApi } from '@/services/api/auth.api';
import { onSessionExpired } from '@/services/api/client';
import { clearTokens, getTokens, setTokens } from '@/services/api/tokenStore';
import { queryClient } from '@/services/queryClient';

interface AuthContextValue {
  /** undefined = still restoring from Keychain (show splash). */
  isAuthenticated: boolean | undefined;
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore session from Keychain on cold start.
  useEffect(() => {
    getTokens()
      .then(tokens => setIsAuthenticated(!!tokens))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Refresh token died → back to login.
  useEffect(
    () =>
      onSessionExpired(() => {
        setIsAuthenticated(false);
        setUser(null);
        queryClient.clear();
        Toast.show({ type: 'error', text1: 'Session expired — log in again' });
      }),
    [],
  );

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await loginApi(payload);
    const { user: loggedInUser, ...tokens } = res.data;
    await setTokens(tokens);
    setUser(loggedInUser);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    queryClient.clear();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, user, login, logout }),
    [isAuthenticated, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
