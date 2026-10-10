import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type {
  AuthRepository,
  CreateSessionInput,
  LoginUserRecord,
  RefreshTokenContext,
  RotateRefreshTokenInput,
} from './auth.repository.js';
import type { AuthenticatedUser } from './auth.types.js';

function toUser(user: {
  id: string;
  loginIdentifier: string;
  displayName: string | null;
  accountState: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
}): AuthenticatedUser {
  return user;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findUserForLogin(normalizedLoginIdentifier: string): Promise<LoginUserRecord | null> {
    const user = await this.db.user.findUnique({
      where: { normalizedLoginIdentifier },
      include: { passwordCredential: true },
    });

    return user
      ? { ...toUser(user), passwordHash: user.passwordCredential?.passwordHash ?? null }
      : null;
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.db.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        expiresAt: input.expiresAt,
        refreshTokens: {
          create: {
            id: input.refreshTokenId,
            tokenHash: input.refreshTokenHash,
            expiresAt: input.expiresAt,
          },
        },
      },
    });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenContext | null> {
    const token = await this.db.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: { include: { user: true } } },
    });

    return token
      ? {
          id: token.id,
          sessionId: token.sessionId,
          tokenExpiresAt: token.expiresAt,
          usedAt: token.usedAt,
          tokenRevokedAt: token.revokedAt,
          sessionExpiresAt: token.session.expiresAt,
          sessionRevokedAt: token.session.revokedAt,
          user: toUser(token.session.user),
        }
      : null;
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean> {
    return this.db.$transaction(async (transaction) => {
      const claimed = await transaction.refreshToken.updateMany({
        where: {
          id: input.tokenId,
          sessionId: input.sessionId,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: input.usedAt },
        },
        data: { usedAt: input.usedAt },
      });

      if (claimed.count !== 1) return false;

      await transaction.refreshToken.create({
        data: {
          id: input.replacementTokenId,
          sessionId: input.sessionId,
          tokenHash: input.replacementTokenHash,
          expiresAt: input.replacementExpiresAt,
        },
      });
      await transaction.session.update({
        where: { id: input.sessionId },
        data: { lastSeenAt: input.usedAt },
      });
      return true;
    });
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    await this.db.$transaction([
      this.db.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt },
      }),
      this.db.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt },
      }),
    ]);
  }

  async revokeSessionByRefreshTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    const token = await this.db.refreshToken.findUnique({ where: { tokenHash } });
    if (token) await this.revokeSession(token.sessionId, revokedAt);
  }

  async revokeAllSessions(userId: string, revokedAt: Date): Promise<void> {
    const sessions = await this.db.session.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    const sessionIds = sessions.map(({ id }) => id);

    await this.db.$transaction([
      this.db.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt },
      }),
      this.db.refreshToken.updateMany({
        where: { sessionId: { in: sessionIds }, revokedAt: null },
        data: { revokedAt },
      }),
    ]);
  }

  async findActiveSessionUser(
    sessionId: string,
    userId: string,
    now: Date,
  ): Promise<AuthenticatedUser | null> {
    const session = await this.db.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: now } },
      include: { user: true },
    });

    return session?.user.accountState === 'ACTIVE' ? toUser(session.user) : null;
  }
}
