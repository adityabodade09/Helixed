import { apiRequest } from '../../services/api/apiClient';
export type CalendarEvent = {
  id: string;
  type: 'class' | 'deadline' | 'exam' | 'activity';
  title: string;
  detail: string | null;
  startsAt: string;
  endsAt: string | null;
  color: string;
};
export const calendarApi = {
  list: (token: string, from: Date, to: Date) =>
    apiRequest<CalendarEvent[]>(
      `/student/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      { accessToken: token },
    ),
  get: (token: string, id: string) =>
    apiRequest<CalendarEvent>(`/student/calendar/event/${encodeURIComponent(id)}`, {
      accessToken: token,
    }),
};
