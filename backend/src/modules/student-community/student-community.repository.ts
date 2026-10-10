import type {
  CommunityGroup,
  CommunityMessage,
  ConversationDetail,
  ConversationSummary,
} from './student-community.types.js';

export interface StudentCommunityRepository {
  findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  inbox(userId: string, kind?: 'group' | 'direct'): Promise<ConversationSummary[]>;
  sent(userId: string): Promise<CommunityMessage[]>;
  groups(userId: string): Promise<CommunityGroup[]>;
  group(userId: string, groupId: string): Promise<ConversationDetail | null>;
  direct(userId: string, conversationId: string): Promise<ConversationDetail | null>;
  joinGroup(userId: string, groupId: string): Promise<CommunityGroup | null>;
  send(userId: string, conversationId: string, body: string): Promise<CommunityMessage | null>;
}
