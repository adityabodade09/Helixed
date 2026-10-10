import type {
  TeacherMessagesInbox,
  TeacherMessageThreadResponse,
  TeacherThreadMessage,
} from './teacher-messages.types.js';

export interface TeacherMessagesRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  inbox(teacherId: string, schoolId: string, now: Date): Promise<TeacherMessagesInbox | null>;
  thread(
    teacherId: string,
    schoolId: string,
    conversationId: string,
    now: Date,
  ): Promise<TeacherMessageThreadResponse | null>;
  send(
    teacherId: string,
    schoolId: string,
    conversationId: string,
    body: string,
    now: Date,
  ): Promise<TeacherThreadMessage | null>;
}
