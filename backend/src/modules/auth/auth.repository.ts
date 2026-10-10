import type { AuthenticatedUser } from './auth.types.js';

export interface LoginUserRecord extends AuthenticatedUser {
  passwordHash: string | null;
}

export interface RefreshTokenContext {
  id: string;
  sessionId: string;
  tokenExpiresAt: Date;
  usedAt: Date | null;
  tokenRevokedAt: Date | null;
  sessionExpiresAt: Date;
  sessionRevokedAt: Date | null;
  user: AuthenticatedUser;
}

export interface CreateSessionInput {
  id: string;
  userId: string;
  expiresAt: Date;
  refreshTokenId: string;
  refreshTokenHash: string;
}

export interface RotateRefreshTokenInput {
  tokenId: string;
  sessionId: string;
  usedAt: Date;
  replacementTokenId: string;
  replacementTokenHash: string;
  replacementExpiresAt: Date;
}

export interface AuthRepository {
  findUserForLogin(normalizedLoginIdentifier: string): Promise<LoginUserRecord | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenContext | null>;
  rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  revokeSessionByRefreshTokenHash(tokenHash: string, revokedAt: Date): Promise<void>;
  revokeAllSessions(userId: string, revokedAt: Date): Promise<void>;
  findActiveSessionUser(
    sessionId: string,
    userId: string,
    now: Date,
  ): Promise<AuthenticatedUser | null>;
}
