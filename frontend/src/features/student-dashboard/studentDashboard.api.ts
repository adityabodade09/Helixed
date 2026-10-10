import { apiRequest } from '../../services/api/apiClient';
import type { StudentDashboard } from './studentDashboard.types';

export function getStudentDashboard(accessToken: string): Promise<StudentDashboard> {
  return apiRequest<StudentDashboard>('/student/dashboard', { accessToken });
}
