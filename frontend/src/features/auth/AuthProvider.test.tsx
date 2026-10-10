import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

const user = {
  id: '0cfc2b64-29d4-4f15-94bc-5ec5c47cefd1',
  loginIdentifier: 'student-1001',
  displayName: 'Test Student',
  accountState: 'ACTIVE',
} as const;

function Status() {
  const auth = useAuth();
  return <p>{auth.status === 'authenticated' ? auth.user?.loginIdentifier : auth.status}</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthProvider', () => {
  it('restores a session using the refresh-token cookie', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'access-token', user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(
      <AuthProvider>
        <Status />
      </AuthProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('student-1001')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/refresh',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );
  });

  it('settles as unauthenticated when session restoration fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Authentication required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(
      <AuthProvider>
        <Status />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeInTheDocument());
  });
});
