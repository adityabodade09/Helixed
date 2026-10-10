import { apiRequest } from '../../services/api/apiClient';

export type TeacherConversation = {
  id: string;
  kind: 'DIRECT' | 'GROUP';
  title: string;
  participant: { displayName: string; role: 'PARENT' | 'STUDENT' } | null;
  contexts: string[];
  preview: string | null;
  latestAt: string;
};

export type TeacherMessagesInbox = {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  conversations: TeacherConversation[];
};

export type TeacherThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { displayName: string };
  sentByTeacher: boolean;
};

export type TeacherMessageThread = Omit<TeacherMessagesInbox, 'conversations'> & {
  conversation: TeacherConversation & { messages: TeacherThreadMessage[] };
};

export const teacherMessagesApi = {
  list: (token: string, search?: string) =>
    apiRequest<TeacherMessagesInbox>(
      `/teacher/messages${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      { accessToken: token },
    ),
  detail: (token: string, conversationId: string) =>
    apiRequest<TeacherMessageThread>(`/teacher/messages/${conversationId}`, {
      accessToken: token,
    }),
  send: (token: string, conversationId: string, body: string) =>
    apiRequest<TeacherThreadMessage>(`/teacher/messages/${conversationId}/messages`, {
      accessToken: token,
      method: 'POST',
      body: { body },
    }),
};
