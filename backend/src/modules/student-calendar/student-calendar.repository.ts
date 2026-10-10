import type { CalendarEvent } from './student-calendar.types.js';
export interface StudentCalendarRepository {
  findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  list(userId: string, from: Date, to: Date): Promise<CalendarEvent[]>;
  get(userId: string, eventId: string): Promise<CalendarEvent | null>;
}
