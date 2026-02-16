import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

const adminLoginMock = vi.fn();

vi.mock('../api', () => ({
  adminLogin: (...args: unknown[]) => adminLoginMock(...args),
}));

function AuthHarness() {
  const { token, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      <p data-testid="token">{token ?? 'none'}</p>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <button type="button" onClick={() => void login('admin@matboss.online', 'password123')}>
        Login
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('stores token to localStorage on login and clears on logout', async () => {
    const user = userEvent.setup();
    adminLoginMock.mockResolvedValue('token-abc');

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('token-abc');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(localStorage.getItem('admin_token')).toBe('token-abc');

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(localStorage.getItem('admin_token')).toBeNull();
  });
});
