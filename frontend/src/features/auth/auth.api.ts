import { apiRequest } from '../../services/api/apiClient';
import type { AuthenticationResult, AuthUser } from './auth.types';

export const authApi = {
  login(loginIdentifier: string, password: string) {
    return apiRequest<AuthenticationResult>('/auth/login', {
      method: 'POST',
      body: { loginIdentifier, password },
    });
  },

  refresh() {
    return apiRequest<AuthenticationResult>('/auth/refresh', { method: 'POST' });
  },

  logout() {
    return apiRequest<void>('/auth/logout', { method: 'POST' });
  },

  logoutAll(accessToken: string) {
    return apiRequest<void>('/auth/logout-all', { method: 'POST', accessToken });
  },

  currentUser(accessToken: string) {
    return apiRequest<{ user: AuthUser }>('/auth/me', { accessToken });
  },
};
