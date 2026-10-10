import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherMessageDetailPage } from './TeacherMessagesPage';
import { teacherMessagesApi, type TeacherMessageThread } from './teacherMessages.api';

vi.mock('./teacherMessages.api', () => ({
  teacherMessagesApi: { list: vi.fn(), detail: vi.fn(), send: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'teacher-token' }) }));

const conversationId = '50000000-0000-4000-8000-000000000001';
const thread: TeacherMessageThread = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  conversation: {
    id: conversationId,
    kind: 'DIRECT',
    title: 'Anita Sharma',
    participant: { displayName: 'Anita Sharma', role: 'PARENT' },
    contexts: ['Parent of Aarav Sharma · Grade 10A'],
    preview: 'Thank you for the update, Neha.',
    latestAt: '2026-09-30T09:35:00.000Z',
    messages: [
      {
        id: 'message-1',
        body: 'Hello Anita, Aarav participated thoughtfully in class today.',
        createdAt: '2026-09-30T09:30:00.000Z',
        sender: { displayName: 'Neha Kapoor' },
        sentByTeacher: true,
      },
      {
        id: 'message-2',
        body: 'Thank you for the update, Neha.',
        createdAt: '2026-09-30T09:35:00.000Z',
        sender: { displayName: 'Anita Sharma' },
        sentByTeacher: false,
      },
    ],
  },
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/teacher/messages/${conversationId}`]}>
        <Routes>
          <Route path="/teacher/messages/:id" element={<TeacherMessageDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherMessageDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherMessagesApi.detail).mockResolvedValue(thread);
    vi.mocked(teacherMessagesApi.send).mockResolvedValue({
      id: 'message-3',
      body: 'Confirmed canonical reply.',
      createdAt: '2026-09-30T09:40:00.000Z',
      sender: { displayName: 'Neha Kapoor' },
      sentByTeacher: true,
    });
  });

  it('renders canonical ordered history, context, back navigation, and active Messages nav', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Anita Sharma' })).toBeInTheDocument();
    const messages = screen.getAllByRole('article');
    expect(messages.map((message) => message.textContent)).toEqual([
      expect.stringContaining('Hello Anita, Aarav participated thoughtfully in class today.'),
      expect.stringContaining('Thank you for the update, Neha.'),
    ]);
    expect(messages[0]).toHaveAttribute('data-sender', 'teacher');
    expect(messages[1]).toHaveAttribute('data-sender', 'participant');
    expect(screen.getByText('Parent of Aarav Sharma · Grade 10A')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to Messages' })).toHaveAttribute(
      'href',
      '/teacher/messages',
    );
    const navigation = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === '/teacher/messages');
    if (!navigation) throw new Error('Teacher Messages navigation link was not rendered');
    expect(navigation.className).toContain('bg-blue-50');
  });

  it('sends once, waits for backend confirmation, clears input, and reconciles the thread', async () => {
    const updated = {
      ...thread,
      conversation: {
        ...thread.conversation,
        messages: [
          ...thread.conversation.messages,
          {
            id: 'message-3',
            body: 'Confirmed canonical reply.',
            createdAt: '2026-09-30T09:40:00.000Z',
            sender: { displayName: 'Neha Kapoor' },
            sentByTeacher: true,
          },
        ],
      },
    } satisfies TeacherMessageThread;
    vi.mocked(teacherMessagesApi.detail).mockResolvedValueOnce(thread).mockResolvedValue(updated);
    renderPage();
    const input = await screen.findByLabelText('Message');
    fireEvent.change(input, { target: { value: 'Confirmed canonical reply.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(teacherMessagesApi.send).toHaveBeenCalledWith(
        'teacher-token',
        conversationId,
        'Confirmed canonical reply.',
      ),
    );
    expect(await screen.findByText('Confirmed canonical reply.')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('prevents duplicate sends while pending and preserves text after failure', async () => {
    vi.mocked(teacherMessagesApi.send).mockReturnValue(new Promise<never>(() => {}));
    const pending = renderPage();
    const input = await screen.findByLabelText('Message');
    fireEvent.change(input, { target: { value: 'One message only' } });
    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(teacherMessagesApi.send).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
    pending.unmount();

    vi.mocked(teacherMessagesApi.send).mockClear();
    vi.mocked(teacherMessagesApi.send).mockRejectedValue(new Error('forbidden'));
    renderPage();
    const retryInput = await screen.findByLabelText('Message');
    fireEvent.change(retryInput, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(
      await screen.findByText('Message was not sent. Your text has been preserved.'),
    ).toBeInTheDocument();
    expect(retryInput).toHaveValue('Keep this draft');
  });

  it('renders empty, loading, and restricted thread states', async () => {
    vi.mocked(teacherMessagesApi.detail).mockResolvedValue({
      ...thread,
      conversation: { ...thread.conversation, messages: [] },
    });
    const empty = renderPage();
    expect(await screen.findByText('No messages yet.')).toBeInTheDocument();
    empty.unmount();

    vi.mocked(teacherMessagesApi.detail).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading conversation…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherMessagesApi.detail).mockRejectedValue(new Error('not found'));
    renderPage();
    expect(
      await screen.findByText('This conversation is restricted or unavailable.'),
    ).toBeInTheDocument();
  });

  it('does not expose attachments, read receipts, AI, or new-conversation controls', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Anita Sharma' });
    expect(document.body.textContent).not.toMatch(
      /attachment|read receipt|seen|typing|online|ai reply|sentiment|urgency|new conversation/i,
    );
    expect(screen.queryByRole('button', { name: /attach|new conversation/i })).toBeNull();
  });
});
