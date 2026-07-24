import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';
import { ApiClientError } from '@/services/api-client';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshCurrentAdmin: vi.fn()
}));
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock })
}));

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    admin: null,
    login: authMocks.login,
    logout: authMocks.logout,
    refreshCurrentAdmin: authMocks.refreshCurrentAdmin
  })
}));

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    authMocks.login.mockReset();
    replaceMock.mockReset();
  });

  it('logs in successfully', async () => {
    const user = userEvent.setup();
    authMocks.login.mockResolvedValue(undefined);
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/), 'admin@example.com');
    await user.type(screen.getByLabelText(/Password/), 'CorrectPass123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(authMocks.login).toHaveBeenCalledWith('admin@example.com', 'CorrectPass123'));
    expect(replaceMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a friendly invalid credentials error', async () => {
    const user = userEvent.setup();
    authMocks.login.mockRejectedValue(new ApiClientError('Invalid email or password', 401));
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/), 'admin@example.com');
    await user.type(screen.getByLabelText(/Password/), 'WrongPass123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password is incorrect.');
  });

  it('shows a locked-account message', async () => {
    const user = userEvent.setup();
    authMocks.login.mockRejectedValue(new ApiClientError('Admin account is temporarily locked', 423));
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/), 'admin@example.com');
    await user.type(screen.getByLabelText(/Password/), 'CorrectPass123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily locked');
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter your email and password.');
    expect(authMocks.login).not.toHaveBeenCalled();
  });
});
