import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentTeachersPage } from './ParentTeachersPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

function renderPage(childId = 'student-demo') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/parent/children/${childId}/teachers`]}>
        <Routes>
          <Route path="/parent/children/:id/teachers" element={<ParentTeachersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentTeachersPage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders only teachers assigned through the selected child’s class', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'student-demo', displayName: 'Aarav Sharma' },
      teachers: [
        {
          id: 'teacher-demo',
          displayName: 'Neha Kapoor',
          classes: [{ name: 'Class 12', schoolName: 'Helixed Demo School' }],
        },
      ],
    });
    renderPage();
    expect(await screen.findByText('Aarav Sharma’s teachers')).toBeInTheDocument();
    expect(screen.getByText('Neha Kapoor')).toBeInTheDocument();
    expect(screen.getByText('Class 12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Aarav Sharma’s overview' })).toHaveAttribute(
      'href',
      '/parent/children/student-demo',
    );
    expect(apiRequest).toHaveBeenCalledWith('/parent/children/student-demo/teachers', {
      accessToken: 'token',
    });
    expect(screen.queryByText(/Message/)).not.toBeInTheDocument();
  });

  it('renders Mira’s isolated no-authorized-teachers state', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'mira-demo', displayName: 'Mira Sharma' },
      teachers: [],
    });
    renderPage('mira-demo');
    expect(await screen.findByText('Mira Sharma’s teachers')).toBeInTheDocument();
    expect(screen.getByText('No authorized teachers')).toBeInTheDocument();
    expect(screen.queryByText('Neha Kapoor')).not.toBeInTheDocument();
  });

  it('renders loading and restricted states without disclosing a teacher', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'student-demo', displayName: 'Aarav Sharma' },
      teachers: [],
    });
    renderPage();
    expect(screen.getByText('Loading teachers…')).toBeInTheDocument();
    expect(await screen.findByText('No authorized teachers')).toBeInTheDocument();
  });

  it('renders a non-revealing restricted state when access fails', async () => {
    apiRequest.mockResolvedValue(null);
    renderPage('foreign-child');
    expect(
      await screen.findByText('Teachers are unavailable in this authorized child context.'),
    ).toBeInTheDocument();
  });
});
