export type AccountState = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export interface AuthenticatedUser {
  id: string;
  loginIdentifier: string;
  displayName: string | null;
  accountState: AccountState;
}

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
}

export interface AuthenticationResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;
}
