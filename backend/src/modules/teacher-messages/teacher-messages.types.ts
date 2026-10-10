export type TeacherMessageFilters = { search?: string };

export type TeacherConversationSummary = {
  id: string;
  kind: 'DIRECT' | 'GROUP';
  title: string;
  participant: { displayName: string; role: 'PARENT' | 'STUDENT' } | null;
  contexts: string[];
  preview: string | null;
  latestAt: string;
};

export type TeacherThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { displayName: string };
  sentByTeacher: boolean;
};

export type TeacherConversationThread = TeacherConversationSummary & {
  messages: TeacherThreadMessage[];
};

export type TeacherMessagesInbox = {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  conversations: TeacherConversationSummary[];
};

export type TeacherMessageThreadResponse = Omit<TeacherMessagesInbox, 'conversations'> & {
  conversation: TeacherConversationThread;
};
