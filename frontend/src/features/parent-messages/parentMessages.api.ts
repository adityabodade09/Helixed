import { apiRequest } from '../../services/api/apiClient';

export type ParentMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};

export type ParentConversation = {
  id: string;
  teacher: { id: string; displayName: string };
  contexts: { childId: string; childName: string; className: string; schoolName: string }[];
  preview: string | null;
  updatedAt: string;
};

export type ParentConversationDetail = ParentConversation & { messages: ParentMessage[] };

const base = '/parent/messages';
export const parentMessagesApi = {
  list: (token: string) => apiRequest<ParentConversation[]>(base, { accessToken: token }),
  detail: (token: string, conversationId: string) =>
    apiRequest<ParentConversationDetail>(`${base}/${conversationId}`, { accessToken: token }),
  send: (token: string, conversationId: string, body: string) =>
    apiRequest<ParentMessage>(`${base}/${conversationId}/messages`, {
      accessToken: token,
      method: 'POST',
      body: { body },
    }),
};
