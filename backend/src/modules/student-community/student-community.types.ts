export type ConversationKind = 'group' | 'direct';
export type ConversationSummary = {
  id: string;
  kind: ConversationKind;
  groupId?: string;
  title: string;
  preview: string | null;
  updatedAt: string;
};
export type CommunityMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};
export type CommunityGroup = {
  id: string;
  name: string;
  description: string | null;
  visibility: 'student_discoverable' | 'members_only';
  memberCount: number;
  joined: boolean;
};
export type ConversationDetail = ConversationSummary & { messages: CommunityMessage[] };
