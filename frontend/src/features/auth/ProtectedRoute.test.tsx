import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from './auth.context';
import { ProtectedRoute } from './ProtectedRoute';

const baseAuth: AuthContextValue = {
  accessToken: null,
  status: 'unauthenticated',
  user: null,
  login: async () => undefined,
  logout: async () => undefined,
  logoutAll: async () => undefined,
};

function renderProtected(auth: AuthContextValue) {
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<h1>Private content</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    renderProtected(baseAuth);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders protected content only for an authenticated state', () => {
    renderProtected({ ...baseAuth, status: 'authenticated' });
    expect(screen.getByRole('heading', { name: 'Private content' })).toBeInTheDocument();
  });
});
