import type { CommunityMessage } from '../student-community/student-community.types.js';

export type MessageContext = {
  childId: string;
  childName: string;
  className: string;
  schoolName: string;
};

export type ParentConversationSummary = {
  id: string;
  teacher: { id: string; displayName: string };
  contexts: MessageContext[];
  preview: string | null;
  updatedAt: string;
};

export type ParentConversationDetail = ParentConversationSummary & {
  messages: CommunityMessage[];
};

export type DirectConversation = {
  id: string;
  peerId: string;
  peerName: string;
  preview: string | null;
  updatedAt: string;
};

export type DirectConversationDetail = DirectConversation & {
  messages: CommunityMessage[];
};
