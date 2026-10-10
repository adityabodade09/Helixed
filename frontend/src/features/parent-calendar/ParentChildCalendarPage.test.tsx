import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentChildCalendarPage } from './ParentCalendarPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

function renderPage(childId = 'student-demo') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/parent/children/${childId}/calendar`]}>
        <Routes>
          <Route path="/parent/children/:id/calendar" element={<ParentChildCalendarPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const calendar = {
  child: { id: 'student-demo', displayName: 'Aarav Sharma' },
  hasCalendarData: true,
  events: [
    {
      id: 'schedule:1',
      type: 'class',
      title: 'Physics',
      detail: 'Room A-201',
      startsAt: new Date().toISOString(),
      endsAt: null,
      color: 'blue',
    },
  ],
};

describe('ParentChildCalendarPage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders only the selected child’s source-preserving calendar data', async () => {
    apiRequest.mockResolvedValue(calendar);
    renderPage();
    expect(await screen.findByText("Aarav Sharma's calendar")).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Physics/ })).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: '← Child overview' })).toHaveAttribute(
      'href',
      '/parent/children/student-demo',
    );
    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^\/parent\/children\/student-demo\/calendar\?from=/),
      { accessToken: 'token' },
    );
  });

  it('keeps view switching within the canonical child route', async () => {
    apiRequest.mockResolvedValue(calendar);
    renderPage();
    await screen.findByText("Aarav Sharma's calendar");
    fireEvent.click(screen.getByRole('button', { name: 'month' }));
    expect(await screen.findByText('Month view')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'month' })).not.toBeInTheDocument();
  });

  it('renders Mira’s true empty calendar state without sibling events', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'mira-demo', displayName: 'Mira Sharma' },
      hasCalendarData: false,
      events: [],
    });
    renderPage('mira-demo');
    expect(await screen.findByText("Mira Sharma's calendar")).toBeInTheDocument();
    expect(screen.getByText('No calendar data is available for this child.')).toBeInTheDocument();
    expect(screen.queryByText('Physics')).not.toBeInTheDocument();
  });

  it('renders loading and a no-events-in-period state', async () => {
    apiRequest.mockResolvedValue({ ...calendar, events: [] });
    renderPage();
    expect(screen.getByText('Loading calendar…')).toBeInTheDocument();
    expect(await screen.findByText('No parent-visible events in this period.')).toBeInTheDocument();
  });

  it('renders a non-revealing restricted state when child access fails', async () => {
    apiRequest.mockResolvedValue(null);
    renderPage('foreign-child');
    expect(await screen.findByText('Calendar is unavailable.')).toBeInTheDocument();
  });
});
