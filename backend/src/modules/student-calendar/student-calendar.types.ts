export interface CalendarEvent {
  id: string;
  type: 'class' | 'deadline' | 'exam' | 'activity';
  title: string;
  detail: string | null;
  startsAt: string;
  endsAt: string | null;
  color: string;
}
