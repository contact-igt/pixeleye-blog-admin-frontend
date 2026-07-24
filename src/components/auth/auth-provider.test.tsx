import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from './auth-guard';
import { AuthProvider, resetAuthStartupForTests, useAuth } from './auth-provider';
import { LoginRouteGuard } from './login-route-guard';
import { clearAccessToken } from '@/services/auth-token';

const replaceMock = vi.fn();
let pathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathname
}));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function AuthStatusProbe() {
  const { status, admin } = useAuth();
  return <div>{status}:{admin?.email ?? 'none'}</div>;
}

describe('admin auth provider and guards', () => {
  afterEach(() => {
    cleanup();
    clearAccessToken();
    resetAuthStartupForTests();
    replaceMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    pathname = '/dashboard';
  });

  it('boots by refreshing the cookie session and then loading /auth/me', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { access_token: 'startup-access', token_type: 'Bearer', admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><AuthStatusProbe /></AuthProvider>);

    await screen.findByText('authenticated:admin@example.com');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/refresh');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/auth/me');
  });

  it('starts only one refresh request when providers mount twice in one tab', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { access_token: 'startup-access', token_type: 'Bearer', admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<><AuthProvider><AuthStatusProbe /></AuthProvider><AuthProvider><AuthStatusProbe /></AuthProvider></>);

    await screen.findAllByText('authenticated:admin@example.com');
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });
  it('redirects unauthenticated users away from protected routes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'no session' }, { status: 401 })));

    render(<AuthProvider><AuthGuard><div>Protected content</div></AuthGuard></AuthProvider>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects authenticated admins away from /login', async () => {
    pathname = '/login';
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { access_token: 'startup-access', token_type: 'Bearer', admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } })));

    render(<AuthProvider><LoginRouteGuard><div>Login form</div></LoginRouteGuard></AuthProvider>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'));
  });
});

