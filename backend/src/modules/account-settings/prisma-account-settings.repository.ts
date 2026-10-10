import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type {
  AccountSettingsRecord,
  AccountSettingsRepository,
} from './account-settings.service.js';

export class PrismaAccountSettingsRepository implements AccountSettingsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findAccount(userId: string, now: Date): Promise<AccountSettingsRecord | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        loginIdentifier: true,
        displayName: true,
        accountState: true,
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: now } },
          select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true },
          orderBy: { lastSeenAt: 'desc' },
        },
      },
    });
    return user
      ? {
          account: {
            id: user.id,
            loginIdentifier: user.loginIdentifier,
            displayName: user.displayName,
            accountState: user.accountState,
          },
          sessions: user.sessions,
        }
      : null;
  }
}
