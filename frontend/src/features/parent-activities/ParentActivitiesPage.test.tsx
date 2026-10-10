import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentActivitiesPage } from './ParentActivitiesPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

const data = {
  children: [
    { id: 'child-1', displayName: 'Aarav Sharma' },
    { id: 'child-2', displayName: 'Mira Sharma' },
  ],
  child: { id: 'child-1', displayName: 'Aarav Sharma' },
  activities: [
    {
      id: 'activity-1',
      title: 'Robotics Club',
      category: 'Technology',
      status: 'ACTIVE',
      startedAt: '2026-01-01T00:00:00.000Z',
      occursAt: null,
      organization: 'School Club',
      _count: { progressEntries: 2, milestones: 3, certificates: 1 },
    },
  ],
  certificates: [
    {
      id: 'certificate-1',
      title: 'Robotics Challenge',
      issuer: 'School Club',
      issuedAt: '2026-02-01T00:00:00.000Z',
      state: 'VERIFIED',
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentActivitiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentActivitiesPage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders parent-visible activities, certificates, and the child selector', async () => {
    apiRequest.mockResolvedValue(data);
    renderPage();
    expect(await screen.findByText("Aarav Sharma's activities")).toBeInTheDocument();
    expect(screen.getByText('Robotics Club')).toBeInTheDocument();
    expect(screen.getByText('Robotics Challenge')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Child' })).toBeInTheDocument();
  });

  it('requests the selected linked child', async () => {
    apiRequest.mockResolvedValue(data);
    renderPage();
    const selector = await screen.findByRole('combobox', { name: 'Child' });
    fireEvent.change(selector, { target: { value: 'child-2' } });
    expect(selector).toHaveValue('child-2');
    expect(await screen.findByText("Aarav Sharma's activities")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenLastCalledWith('/parent/activities?childId=child-2', {
      accessToken: 'token',
    });
  });

  it('shows an empty activity state', async () => {
    apiRequest.mockResolvedValue({ ...data, activities: [], certificates: [] });
    renderPage();
    expect(await screen.findByText('No parent-visible activities yet.')).toBeInTheDocument();
  });
});
