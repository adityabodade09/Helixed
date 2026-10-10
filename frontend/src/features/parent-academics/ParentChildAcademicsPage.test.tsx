import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentAcademicsPage } from './ParentAcademicsPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

function renderPage(childContextId: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentAcademicsPage childContextId={childContextId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentChildAcademicsPage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders the selected child academic projection without a sibling selector', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'student-demo', displayName: 'Aarav Sharma' },
      subjects: [{ id: 'subject-1', name: 'Mathematics', progress: 82 }],
      tasks: [{ id: 'task-1', title: 'Physics assignment', completedAt: null }],
      exams: [{ id: 'exam-1', title: 'Physics test', startsAt: '2026-10-01T09:00:00.000Z' }],
      schedule: [
        {
          id: 'schedule-1',
          title: 'Physics',
          detail: 'Room 204',
          startsAt: '2026-10-01T08:00:00.000Z',
        },
      ],
    });
    renderPage('student-demo');
    expect(await screen.findByText("Aarav Sharma's academics")).toBeInTheDocument();
    expect(screen.getByText('Mathematics · 82%')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Child' })).not.toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/parent/children/student-demo/academics', {
      accessToken: 'token',
    });
  });

  it('shows Mira’s true empty state without falling back to another child', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'mira-demo', displayName: 'Mira Sharma' },
      subjects: [],
      tasks: [],
      exams: [],
      schedule: [],
    });
    renderPage('mira-demo');
    expect(await screen.findByText("Mira Sharma's academics")).toBeInTheDocument();
    expect(screen.getByText('No academic progress yet.')).toBeInTheDocument();
    expect(screen.getByText('No tasks yet.')).toBeInTheDocument();
    expect(screen.queryByText('Mathematics · 82%')).not.toBeInTheDocument();
  });
});
