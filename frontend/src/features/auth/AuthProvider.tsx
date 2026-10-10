import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { authApi } from './auth.api';
import { AuthContext } from './auth.context';
import type { AuthenticationStatus, AuthUser } from './auth.types';

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthenticationStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const restored = useRef(false);

  const setAuthenticated = useCallback((nextUser: AuthUser, token: string) => {
    setUser(nextUser);
    setAccessToken(token);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    void authApi.refresh().then(
      (result) => setAuthenticated(result.user, result.accessToken),
      () => clearSession(),
    );
  }, [clearSession, setAuthenticated]);

  const login = useCallback(
    async (loginIdentifier: string, password: string) => {
      const result = await authApi.login(loginIdentifier, password);
      setAuthenticated(result.user, result.accessToken);
    },
    [setAuthenticated],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      if (accessToken) await authApi.logoutAll(accessToken);
    } finally {
      clearSession();
    }
  }, [accessToken, clearSession]);

  const value = useMemo(
    () => ({ accessToken, status, user, login, logout, logoutAll }),
    [accessToken, status, user, login, logout, logoutAll],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
