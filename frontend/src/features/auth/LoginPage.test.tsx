import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from './auth.context';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('submits credentials through the authentication context', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const auth: AuthContextValue = {
      accessToken: null,
      status: 'unauthenticated',
      user: null,
      login,
      logout: async () => undefined,
      logoutAll: async () => undefined,
    };

    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/student" element={<h1>Home</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const visitor = userEvent.setup();
    await visitor.type(screen.getByLabelText('Login identifier'), 'student-1001');
    await visitor.type(screen.getByLabelText('Password'), 'correct password');
    await visitor.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('student-1001', 'correct password');
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
