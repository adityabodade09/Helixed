import { apiRequest } from '../../services/api/apiClient';
import type { AccountState } from '../auth/auth.types';

export interface AcademySettings {
  academy: { id: string; name: string };
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

export const academySettingsApi = {
  get: (token: string) => apiRequest<AcademySettings>('/academy/settings', { accessToken: token }),
};
