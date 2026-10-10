import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../auth/auth.context';
import type { AuthContextValue } from '../auth/auth.context';
import { StudentAcademicsPage, StudentTaskDetailPage } from './StudentAcademicsPage';

const auth: AuthContextValue = {
  accessToken: 'test-token',
  status: 'authenticated',
  user: {
    id: 'student-1',
    loginIdentifier: 'student-1',
    displayName: 'Aarav Sharma',
    accountState: 'ACTIVE',
  },
  login: async () => undefined,
  logout: async () => undefined,
  logoutAll: async () => undefined,
};
function renderPage(element: React.ReactNode, path = '/student/academics') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthContext.Provider value={auth}>{element}</AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StudentAcademicsPage', () => {
  it('renders backend academic overview data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          student: { displayName: 'Aarav Sharma' },
          subjects: [{ id: 'subject-1', name: 'Mathematics', progress: 82, nextClassAt: null }],
          schedule: [],
          tasks: [
            {
              id: 'task-1',
              title: 'Complete physics assignment',
              description: null,
              dueAt: null,
              priority: 'high',
              completedAt: null,
              subject: null,
            },
          ],
          exams: [],
        }),
        { status: 200 },
      ),
    );
    renderPage(<StudentAcademicsPage />);
    await waitFor(() => expect(screen.getByText('Mathematics')).toBeInTheDocument());
    expect(screen.getByText('Complete physics assignment')).toBeInTheDocument();
  });

  it('renders an API error state', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    renderPage(<StudentAcademicsPage />);
    await waitFor(() => expect(screen.getByText('Academics are unavailable')).toBeInTheDocument());
  });

  it('renders an owned task detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'task-1',
          title: 'Complete physics assignment',
          description: 'Solve the problems.',
          dueAt: null,
          priority: 'high',
          completedAt: null,
          subject: { id: 'subject-1', name: 'Physics' },
        }),
        { status: 200 },
      ),
    );
    renderPage(
      <Routes>
        <Route path="/student/academics/tasks/:id" element={<StudentTaskDetailPage />} />
      </Routes>,
      '/student/academics/tasks/task-1',
    );
    await waitFor(() => expect(screen.getByText('Solve the problems.')).toBeInTheDocument());
  });
});
