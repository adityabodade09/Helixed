import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherOpportunitiesPage } from './TeacherOpportunitiesPage';
import { teacherOpportunitiesApi, type TeacherOpportunities } from './teacherOpportunities.api';

vi.mock('./teacherOpportunities.api', () => ({
  teacherOpportunitiesApi: { get: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'teacher-token' }),
}));

const catalog: TeacherOpportunities = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  discovery: {
    mode: 'GENERAL',
    explanation:
      'General canonical opportunities are shown; no individualized relevance is calculated.',
  },
  filters: { categories: ['Competition', 'Scholarship'] },
  opportunities: [
    {
      id: 'opportunity-1',
      title: 'Robotics Innovation Challenge 2026',
      detail: 'Build and present an original robotics project.',
      description: 'A national competition for school students.',
      category: 'Competition',
      provider: 'Indian Robotics Association',
      location: 'New Delhi',
      deadline: '2026-11-01T00:00:00.000Z',
      availability: 'OPEN',
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/opportunities']}>
        <TeacherOpportunitiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherOpportunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherOpportunitiesApi.get).mockResolvedValue(catalog);
  });

  it('renders the canonical catalog with active Opportunities navigation and no Student actions', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Opportunities' })).toBeInTheDocument();
    expect(screen.getByText('Robotics Innovation Challenge 2026')).toBeInTheDocument();
    const navigation = screen.getByRole('link', { name: /Opportunities/ });
    expect(navigation).toHaveAttribute('href', '/teacher/opportunities');
    expect(navigation.className).toContain('bg-blue-50');
    expect(document.body.textContent).not.toMatch(
      /match score|recommended student|apply for student|save for student|student application|parent approval/i,
    );
  });

  it('issues deterministic search and approved filter queries and renders no results', async () => {
    vi.mocked(teacherOpportunitiesApi.get).mockImplementation(async (_token, filters) =>
      filters?.search === 'missing' ? { ...catalog, opportunities: [] } : catalog,
    );
    renderPage();
    await screen.findByText('Robotics Innovation Challenge 2026');
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Competition' } });
    fireEvent.change(await screen.findByLabelText('Availability'), { target: { value: 'CLOSED' } });
    fireEvent.change(await screen.findByLabelText('Search opportunities'), {
      target: { value: 'missing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(teacherOpportunitiesApi.get).toHaveBeenCalledWith('teacher-token', {
        search: 'missing',
        category: 'Competition',
        availability: 'CLOSED',
      }),
    );
    expect(await screen.findByText('No matching opportunities')).toBeInTheDocument();
  });

  it('shows factual details and published-criteria language without eligibility prediction', async () => {
    renderPage();
    await screen.findByText('Robotics Innovation Challenge 2026');
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    expect(screen.getByText('A national competition for school students.')).toBeInTheDocument();
    expect(screen.getByText(/does not determine Student eligibility/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /eligible student|acceptance score|likely to succeed/i,
    );
  });

  it('renders loading, empty, and restricted states without fabricated cards', async () => {
    vi.mocked(teacherOpportunitiesApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Teacher opportunities…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherOpportunitiesApi.get).mockResolvedValue({ ...catalog, opportunities: [] });
    const empty = renderPage();
    expect(await screen.findByText('No matching opportunities')).toBeInTheDocument();
    empty.unmount();

    vi.mocked(teacherOpportunitiesApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Teacher opportunities are restricted or unavailable.'),
    ).toBeInTheDocument();
  });
});
