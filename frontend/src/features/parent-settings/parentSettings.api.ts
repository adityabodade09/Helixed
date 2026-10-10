import { apiRequest } from '../../services/api/apiClient';
import type { AccountState } from '../auth/auth.types';

export interface ParentSettings {
  account: {
    id: string;
    loginIdentifier: string;
    displayName: string | null;
    accountState: AccountState;
  };
  sessions: {
    id: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    current: boolean;
  }[];
}

export const parentSettingsApi = {
  get: (token: string) => apiRequest<ParentSettings>('/parent/settings', { accessToken: token }),
};
