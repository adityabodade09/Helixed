import type {
  AuthRepository,
  CreateSessionInput,
  LoginUserRecord,
  RefreshTokenContext,
  RotateRefreshTokenInput,
} from '../../src/modules/auth/auth.repository.js';
import type { AuthenticatedUser } from '../../src/modules/auth/auth.types.js';

interface StoredSession {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface StoredToken {
  id: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly tokens = new Map<string, StoredToken>();

  constructor(private readonly users: LoginUserRecord[]) {}

  async findUserForLogin(normalizedLoginIdentifier: string): Promise<LoginUserRecord | null> {
    return (
      this.users.find(
        (user) => user.loginIdentifier.toLocaleLowerCase('en-US') === normalizedLoginIdentifier,
      ) ?? null
    );
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    this.sessions.set(input.id, {
      id: input.id,
      userId: input.userId,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });
    this.tokens.set(input.refreshTokenHash, {
      id: input.refreshTokenId,
      sessionId: input.id,
      tokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      revokedAt: null,
    });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenContext | null> {
    const token = this.tokens.get(tokenHash);
    const session = token ? this.sessions.get(token.sessionId) : undefined;
    const user = session ? this.users.find(({ id }) => id === session.userId) : undefined;
    if (!token || !session || !user) return null;

    return {
      id: token.id,
      sessionId: session.id,
      tokenExpiresAt: token.expiresAt,
      usedAt: token.usedAt,
      tokenRevokedAt: token.revokedAt,
      sessionExpiresAt: session.expiresAt,
      sessionRevokedAt: session.revokedAt,
      user: this.publicUser(user),
    };
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean> {
    const token = [...this.tokens.values()].find(({ id }) => id === input.tokenId);
    if (
      !token ||
      token.sessionId !== input.sessionId ||
      token.usedAt ||
      token.revokedAt ||
      token.expiresAt <= input.usedAt
    ) {
      return false;
    }

    token.usedAt = input.usedAt;
    this.tokens.set(input.replacementTokenHash, {
      id: input.replacementTokenId,
      sessionId: input.sessionId,
      tokenHash: input.replacementTokenHash,
      expiresAt: input.replacementExpiresAt,
      usedAt: null,
      revokedAt: null,
    });
    return true;
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session && !session.revokedAt) session.revokedAt = revokedAt;
    for (const token of this.tokens.values()) {
      if (token.sessionId === sessionId && !token.revokedAt) token.revokedAt = revokedAt;
    }
  }

  async revokeSessionByRefreshTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    const token = this.tokens.get(tokenHash);
    if (token) await this.revokeSession(token.sessionId, revokedAt);
  }

  async revokeAllSessions(userId: string, revokedAt: Date): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) await this.revokeSession(session.id, revokedAt);
    }
  }

  async findActiveSessionUser(
    sessionId: string,
    userId: string,
    now: Date,
  ): Promise<AuthenticatedUser | null> {
    const session = this.sessions.get(sessionId);
    const user = this.users.find(({ id }) => id === userId);
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !user ||
      user.accountState !== 'ACTIVE'
    ) {
      return null;
    }
    return this.publicUser(user);
  }

  private publicUser(user: LoginUserRecord): AuthenticatedUser {
    return {
      id: user.id,
      loginIdentifier: user.loginIdentifier,
      displayName: user.displayName,
      accountState: user.accountState,
    };
  }
}
