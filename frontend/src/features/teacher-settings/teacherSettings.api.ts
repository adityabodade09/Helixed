import { apiRequest } from '../../services/api/apiClient';
import type { AccountState } from '../auth/auth.types';

export interface TeacherSettings {
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

export const teacherSettingsApi = {
  get: (token: string) => apiRequest<TeacherSettings>('/teacher/settings', { accessToken: token }),
};
