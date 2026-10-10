import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthRepository } from './auth.repository.js';
import type {
  AuthenticatedPrincipal,
  AuthenticatedUser,
  AuthenticationResult,
} from './auth.types.js';
import { verifyPassword } from './password.service.js';
import { signAccessToken, verifyAccessToken } from './token.service.js';

const invalidPasswordHash =
  '$argon2id$v=19$m=65536,t=3,p=4$rXcq+nW086zAk56VskypiA$dgoWrTtb+FWNGUr4Y4GBMLmaIWH8LQV00xwPPeHcqr4';

function normalizeLoginIdentifier(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async login(loginIdentifier: string, password: string): Promise<AuthenticationResult> {
    const user = await this.repository.findUserForLogin(normalizeLoginIdentifier(loginIdentifier));
    const passwordValid = await verifyPassword(user?.passwordHash ?? invalidPasswordHash, password);

    if (!user || !passwordValid || user.accountState !== 'ACTIVE') {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'The login identifier or password is invalid.',
      );
    }

    const now = new Date();
    const sessionId = randomUUID();
    const refreshToken = createRefreshToken();
    const refreshTokenExpiresAt = sessionExpiry(now);
    await this.repository.createSession({
      id: sessionId,
      userId: user.id,
      expiresAt: refreshTokenExpiresAt,
      refreshTokenId: randomUUID(),
      refreshTokenHash: hashRefreshToken(refreshToken),
    });

    return {
      accessToken: await signAccessToken({ userId: user.id, sessionId }),
      refreshToken,
      refreshTokenExpiresAt,
      user: this.publicUser(user),
    };
  }

  async refresh(rawRefreshToken: string): Promise<AuthenticationResult> {
    const now = new Date();
    const context = await this.repository.findRefreshToken(hashRefreshToken(rawRefreshToken));

    if (
      !context ||
      context.usedAt ||
      context.tokenRevokedAt ||
      context.sessionRevokedAt ||
      context.tokenExpiresAt <= now ||
      context.sessionExpiresAt <= now ||
      context.user.accountState !== 'ACTIVE'
    ) {
      if (context) await this.repository.revokeSession(context.sessionId, now);
      throw new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
    }

    const refreshToken = createRefreshToken();
    const rotated = await this.repository.rotateRefreshToken({
      tokenId: context.id,
      sessionId: context.sessionId,
      usedAt: now,
      replacementTokenId: randomUUID(),
      replacementTokenHash: hashRefreshToken(refreshToken),
      replacementExpiresAt: context.sessionExpiresAt,
    });

    if (!rotated) {
      await this.repository.revokeSession(context.sessionId, now);
      throw new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
    }

    return {
      accessToken: await signAccessToken({
        userId: context.user.id,
        sessionId: context.sessionId,
      }),
      refreshToken,
      refreshTokenExpiresAt: context.sessionExpiresAt,
      user: this.publicUser(context.user),
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.repository.revokeSessionByRefreshTokenHash(
        hashRefreshToken(rawRefreshToken),
        new Date(),
      );
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repository.revokeAllSessions(userId, new Date());
  }

  async authenticate(accessToken: string): Promise<AuthenticatedPrincipal> {
    const identity = await verifyAccessToken(accessToken);
    const user = await this.repository.findActiveSessionUser(
      identity.sessionId,
      identity.userId,
      new Date(),
    );
    if (!user) throw new Error('Session is not active.');

    return { userId: user.id, sessionId: identity.sessionId };
  }

  async getCurrentUser(principal: AuthenticatedPrincipal): Promise<AuthenticatedUser> {
    const user = await this.repository.findActiveSessionUser(
      principal.sessionId,
      principal.userId,
      new Date(),
    );
    if (!user) throw new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
    return this.publicUser(user);
  }

  private publicUser(user: AuthenticatedUser): AuthenticatedUser {
    return {
      id: user.id,
      loginIdentifier: user.loginIdentifier,
      displayName: user.displayName,
      accountState: user.accountState,
    };
  }
}
