import { apiRequest } from '../../services/api/apiClient';
export type Conversation = {
  id: string;
  kind: 'group' | 'direct';
  groupId?: string;
  title: string;
  preview: string | null;
  updatedAt: string;
};
export type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};
export type ConversationDetail = Conversation & { messages: Message[] };
export type CommunityGroup = {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  memberCount: number;
  joined: boolean;
};
const base = '/student/community';
export const communityApi = {
  inbox: (token: string) => apiRequest<Conversation[]>(`${base}/inbox`, { accessToken: token }),
  sent: (token: string) => apiRequest<Message[]>(`${base}/sent`, { accessToken: token }),
  groups: (token: string) => apiRequest<CommunityGroup[]>(`${base}/groups`, { accessToken: token }),
  group: (token: string, id: string) =>
    apiRequest<ConversationDetail>(`${base}/groups/${id}`, { accessToken: token }),
  direct: (token: string) => apiRequest<Conversation[]>(`${base}/direct`, { accessToken: token }),
  directDetail: (token: string, id: string) =>
    apiRequest<ConversationDetail>(`${base}/direct/${id}`, { accessToken: token }),
  join: (token: string, id: string) =>
    apiRequest<CommunityGroup>(`${base}/groups/${id}/join`, { accessToken: token, method: 'POST' }),
  send: (token: string, id: string, body: string) =>
    apiRequest<Message>(`${base}/conversations/${id}/messages`, {
      accessToken: token,
      method: 'POST',
      body: { body },
    }),
};
