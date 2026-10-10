import type { CommunityMessage } from '../student-community/student-community.types.js';
import type { ParentTeacherContext } from '../parent-teachers/parent-teacher-context.js';
import type { DirectConversation, DirectConversationDetail } from './parent-messages.types.js';

export interface ParentMessagesRepository {
  findParentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  teacherContexts(parentId: string, now: Date): Promise<ParentTeacherContext[]>;
  conversations(parentId: string): Promise<DirectConversation[]>;
  conversation(parentId: string, conversationId: string): Promise<DirectConversationDetail | null>;
  send(parentId: string, conversationId: string, body: string): Promise<CommunityMessage | null>;
}
