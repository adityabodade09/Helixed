import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherMessagesPage } from './TeacherMessagesPage';
import { teacherMessagesApi, type TeacherMessagesInbox } from './teacherMessages.api';

vi.mock('./teacherMessages.api', () => ({ teacherMessagesApi: { list: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'teacher-token' }) }));

const inbox: TeacherMessagesInbox = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  conversations: [
    {
      id: '50000000-0000-4000-8000-000000000001',
      kind: 'DIRECT',
      title: 'Anita Sharma',
      participant: { displayName: 'Anita Sharma', role: 'PARENT' },
      contexts: ['Parent of Aarav Sharma · Grade 10A'],
      preview: 'Thank you for the update, Neha.',
      latestAt: '2026-09-30T09:35:00.000Z',
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/messages']}>
        <TeacherMessagesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherMessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherMessagesApi.list).mockResolvedValue(inbox);
  });

  it('renders the authorized canonical inbox and active Messages navigation', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByText('Anita Sharma')).toBeInTheDocument();
    expect(screen.getByText('Parent of Aarav Sharma · Grade 10A')).toBeInTheDocument();
    expect(screen.getByText('Thank you for the update, Neha.')).toBeInTheDocument();
    const navigation = screen.getByRole('link', { name: /Messages/ });
    expect(navigation).toHaveAttribute('href', '/teacher/messages');
    expect(navigation.className).toContain('bg-blue-50');
  });

  it('searches through the backend and shows a distinct no-results state', async () => {
    vi.mocked(teacherMessagesApi.list).mockImplementation(async (_token, search) =>
      search === 'missing' ? { ...inbox, conversations: [] } : inbox,
    );
    renderPage();
    await screen.findByText('Anita Sharma');
    fireEvent.change(screen.getByLabelText('Search conversations'), {
      target: { value: 'missing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(teacherMessagesApi.list).toHaveBeenCalledWith('teacher-token', 'missing'),
    );
    expect(await screen.findByText('No matching conversations')).toBeInTheDocument();
  });

  it('uses the canonical conversation ID for future detail navigation without thread controls', async () => {
    renderPage();
    const row = await screen.findByRole('link', { name: /Anita Sharma/ });
    expect(row).toHaveAttribute('href', '/teacher/messages/50000000-0000-4000-8000-000000000001');
    expect(screen.queryByRole('button', { name: /new message|compose|send|reply/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/unread/i);
  });

  it('renders loading, true-empty, and restricted states without private data', async () => {
    vi.mocked(teacherMessagesApi.list).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading conversations…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherMessagesApi.list).mockResolvedValue({ ...inbox, conversations: [] });
    const empty = renderPage();
    expect(await screen.findByText('No authorized conversations')).toBeInTheDocument();
    empty.unmount();

    vi.mocked(teacherMessagesApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Teacher messages are restricted or unavailable.'),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/password|token|email|phone|student ai/i);
  });
});
