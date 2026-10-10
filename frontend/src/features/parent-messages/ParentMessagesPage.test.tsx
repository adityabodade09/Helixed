import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ParentMessagesPage } from './ParentMessagesPage';
import { parentMessagesApi } from './parentMessages.api';

vi.mock('./parentMessages.api', () => ({
  parentMessagesApi: { list: vi.fn(), detail: vi.fn(), send: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'token', user: { id: 'parent-1', displayName: 'Anita' } }),
}));

const conversation = {
  id: 'conversation-1',
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  contexts: [
    {
      childId: 'student-1',
      childName: 'Aarav Sharma',
      className: 'Class 12',
      schoolName: 'Helixed Demo School',
    },
  ],
  preview: 'Class update',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentMessagesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentMessagesPage', () => {
  beforeEach(() => {
    vi.mocked(parentMessagesApi.list).mockResolvedValue([conversation]);
    vi.mocked(parentMessagesApi.detail).mockResolvedValue({
      ...conversation,
      messages: [
        {
          id: 'message-1',
          body: 'Aarav participated thoughtfully today.',
          createdAt: '2026-10-01T10:00:00.000Z',
          sender: { id: 'teacher-1', displayName: 'Neha Kapoor' },
        },
      ],
    });
    vi.mocked(parentMessagesApi.send).mockResolvedValue({
      id: 'message-2',
      body: 'Thank you',
      createdAt: '2026-10-01T10:05:00.000Z',
      sender: { id: 'parent-1', displayName: 'Anita' },
    });
  });

  it('renders only the authorized Parent teacher conversation and child context', async () => {
    renderPage();
    expect(await screen.findAllByText('Neha Kapoor')).not.toHaveLength(0);
    expect(screen.getAllByText(/Aarav Sharma/)).not.toHaveLength(0);
    expect(await screen.findByText('Aarav participated thoughtfully today.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search users/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument();
  });

  it('renders the true empty state without an arbitrary recipient search', async () => {
    vi.mocked(parentMessagesApi.list).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No authorized conversations')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(parentMessagesApi.list).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading conversations…')).toBeInTheDocument();
    view.unmount();
    vi.mocked(parentMessagesApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Messages are unavailable for this account.'),
    ).toBeInTheDocument();
  });

  it('sends through the selected canonical conversation and reports failures', async () => {
    renderPage();
    const input = await screen.findByLabelText('Message');
    fireEvent.change(input, { target: { value: 'Thank you' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(parentMessagesApi.send).toHaveBeenCalledWith('token', 'conversation-1', 'Thank you'),
    );
    vi.mocked(parentMessagesApi.send).mockRejectedValue(new Error('send failed'));
    fireEvent.change(input, { target: { value: 'Try again' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Message was not sent.')).toBeInTheDocument();
  });
});
