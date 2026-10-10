import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';

export interface AccountSettingsRecord {
  account: {
    id: string;
    loginIdentifier: string;
    displayName: string | null;
    accountState: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  };
  sessions: {
    id: string;
    createdAt: Date;
    lastSeenAt: Date;
    expiresAt: Date;
  }[];
}

export interface AccountSettingsRepository {
  findAccount(userId: string, now: Date): Promise<AccountSettingsRecord | null>;
}

export class AccountSettingsService {
  constructor(private readonly repository: AccountSettingsRepository) {}

  async get(principal: AuthenticatedPrincipal) {
    const record = await this.repository.findAccount(principal.userId, new Date());
    if (!record) throw new AppError(403, 'FORBIDDEN', 'Account settings are unavailable.');

    return {
      account: record.account,
      sessions: record.sessions.map((session) => ({
        ...session,
        current: session.id === principal.sessionId,
      })),
    };
  }
}
