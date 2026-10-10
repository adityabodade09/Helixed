import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ParentOpportunitiesPage } from './ParentOpportunitiesPage';
import { parentOpportunitiesApi, type ParentOpportunities } from './parentOpportunities.api';

vi.mock('./parentOpportunities.api', () => ({ parentOpportunitiesApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));

const populated: ParentOpportunities = {
  children: [
    { id: 'child-1', displayName: 'Aarav Sharma' },
    { id: 'child-2', displayName: 'Mira Sharma' },
  ],
  child: { id: 'child-1', displayName: 'Aarav Sharma' },
  discovery: {
    mode: 'GENERAL',
    explanation:
      'General available opportunities are shown because no approved child-relevance evidence is configured.',
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
      approvalPending: true,
    },
  ],
};
const mira: ParentOpportunities = {
  ...populated,
  child: { id: 'child-2', displayName: 'Mira Sharma' },
  opportunities: populated.opportunities.map((item) => ({ ...item, approvalPending: false })),
};
const empty: ParentOpportunities = { ...populated, opportunities: [] };

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentOpportunitiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentOpportunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentOpportunitiesApi.get).mockImplementation(async (_token, query) => {
      if (query?.search === 'none') return empty;
      return query?.childId === 'child-2' ? mira : populated;
    });
  });

  it('renders canonical opportunities for the selected child without an apply action', async () => {
    renderPage();
    expect(await screen.findByText('Explore for Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Robotics Innovation Challenge 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('switches child context with a fresh child-scoped request', async () => {
    renderPage();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Child' }), {
      target: { value: 'child-2' },
    });
    expect(await screen.findByText('Explore for Mira Sharma')).toBeInTheDocument();
    expect(parentOpportunitiesApi.get).toHaveBeenLastCalledWith(
      'token',
      expect.objectContaining({ childId: 'child-2', availability: 'OPEN' }),
    );
    expect(screen.queryByText(/compare|ranking|better child/i)).not.toBeInTheDocument();
  });

  it('supports deterministic search/filter requests and a no-match state', async () => {
    renderPage();
    const search = await screen.findByRole('textbox', { name: 'Search opportunities' });
    fireEvent.change(search, { target: { value: 'none' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('No matching opportunities')).toBeInTheDocument();
    expect(parentOpportunitiesApi.get).toHaveBeenLastCalledWith(
      'token',
      expect.objectContaining({ search: 'none', availability: 'OPEN' }),
    );
  });

  it('opens safe in-page details and routes pending approval to the canonical workflow', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'View details' }));
    expect(
      screen.getByText(
        'Check eligibility details with the provider. This view does not predict acceptance.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review pending approval' })).toHaveAttribute(
      'href',
      '/parent/approvals',
    );
    expect(document.body.textContent).not.toMatch(
      /application note|essay|attachment|AI conversation/i,
    );
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(parentOpportunitiesApi.get).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading opportunities…')).toBeInTheDocument();
    view.unmount();

    vi.mocked(parentOpportunitiesApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Opportunities are unavailable for this account.'),
    ).toBeInTheDocument();
  });
});
