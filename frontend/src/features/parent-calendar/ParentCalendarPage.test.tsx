import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentCalendarPage } from './ParentCalendarPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

const data = {
  children: [
    { id: 'child-1', displayName: 'Aarav Sharma' },
    { id: 'child-2', displayName: 'Mira Sharma' },
  ],
  child: { id: 'child-1', displayName: 'Aarav Sharma' },
  events: [
    {
      id: 'exam:1',
      type: 'exam',
      title: 'Physics exam',
      detail: 'Term assessment',
      startsAt: new Date().toISOString(),
      endsAt: null,
      color: 'purple',
    },
  ],
  hasCalendarData: true,
};
function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentCalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentCalendarPage', () => {
  beforeEach(() => apiRequest.mockReset());
  it('renders parent-visible calendar data and linked child selector', async () => {
    apiRequest.mockResolvedValue(data);
    renderPage();
    expect(await screen.findByText("Aarav Sharma's calendar")).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Physics exam/ })).not.toHaveLength(0);
    expect(screen.getByRole('combobox', { name: 'Child' })).toBeInTheDocument();
  });
  it('changes the selected child and navigates calendar dates', async () => {
    apiRequest.mockResolvedValue(data);
    renderPage();
    const selector = await screen.findByRole('combobox', { name: 'Child' });
    fireEvent.change(selector, { target: { value: 'child-2' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Next period' }));
    expect(selector).toHaveValue('child-2');
    expect(apiRequest).toHaveBeenCalled();
  });
  it('shows an empty calendar state', async () => {
    apiRequest.mockResolvedValue({ ...data, events: [] });
    renderPage();
    expect(await screen.findByText('No parent-visible events in this period.')).toBeInTheDocument();
  });
});
