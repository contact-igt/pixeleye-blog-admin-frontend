import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminShell } from './admin-shell';

const logoutMock = vi.fn();
const navigationMock = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('next/navigation', () => ({ usePathname: () => navigationMock.pathname }));

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    admin: { id: '1', name: 'Super Admin', email: 'admin@example.com', role: 'super_admin' },
    logout: logoutMock
  })
}));

describe('AdminShell', () => {
  afterEach(() => {
    cleanup();
    logoutMock.mockReset();
    navigationMock.pathname = '/dashboard';
  });

  it('renders the dashboard shell and available blog navigation safely', () => {
    render(<AdminShell><div>Dashboard content</div></AdminShell>);
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Blogs/ })).toHaveAttribute('href', '/blogs');
    expect(screen.getByRole('link', { name: /Templates/ })).toHaveAttribute('href', '/templates');
    expect(screen.getByRole('link', { name: /Media Library/ })).toHaveAttribute('href', '/media');
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('marks Templates active on the Templates route', () => {
    navigationMock.pathname = '/templates';
    render(<AdminShell><div>Templates content</div></AdminShell>);
    expect(screen.getByRole('link', { name: /Templates/ })).toHaveAttribute('aria-current', 'page');
  });
  it('opens the mobile navigation and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<AdminShell><div>Dashboard content</div></AdminShell>);
    const openButton = screen.getByRole('button', { name: 'Open menu' });
    await user.click(openButton);
    expect(openButton).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('logs out safely', async () => {
    const user = userEvent.setup();
    render(<AdminShell><div>Dashboard content</div></AdminShell>);
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    await user.click(screen.getByRole('menuitem', { name: /Sign out/ }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});




