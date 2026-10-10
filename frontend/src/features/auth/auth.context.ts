import { createContext } from 'react';
import type { AuthenticationStatus, AuthUser } from './auth.types';

export interface AuthContextValue {
  accessToken: string | null;
  status: AuthenticationStatus;
  user: AuthUser | null;
  login: (loginIdentifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
