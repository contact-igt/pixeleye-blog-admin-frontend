import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from './auth-token';
import { apiRequest, buildApiUrl, resetApiClientCoordinationForTests } from './api-client';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) }
  });
}

describe('api client', () => {
  afterEach(() => {
    clearAccessToken();
    resetApiClientCoordinationForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds paths from one validated base URL', () => {
    expect(buildApiUrl('/health/ready', 'http://localhost:5000/api/v1')).toBe(
      'http://localhost:5000/api/v1/health/ready'
    );
    expect(() => buildApiUrl('/health', 'not-a-url')).toThrow('The backend API URL is invalid');
  });

  it('normalizes network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(apiRequest('/health')).rejects.toThrow('Unable to connect to the backend API');
  });

  it('retains a backend request ID on errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Not ready', request_id: 'request-123' }, { status: 503 })));
    await expect(apiRequest('/health')).rejects.toMatchObject({
      status: 503,
      requestId: 'request-123'
    });
  });

  it('aborts requests after the configured timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const assertion = expect(apiRequest('/health')).rejects.toThrow('The API request timed out');
    await vi.advanceTimersByTimeAsync(8_001);
    await assertion;
  });

  it('automatically refreshes once after a 401 response', async () => {
    setAccessToken('expired-access');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'refreshed', data: { access_token: 'new-access', token_type: 'Bearer', admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/protected')).resolves.toMatchObject({ data: { ok: true } });
    expect(getAccessToken()).toBe('new-access');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/auth/refresh');
  });

  it('redirects through the auth failure hook when refresh fails', async () => {
    setAccessToken('expired-access');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ message: 'refresh failed' }, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/protected')).rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
  });

  it('deduplicates concurrent 401 refresh calls', async () => {
    setAccessToken('expired-access');
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ success: true, data: { access_token: 'shared-access', token_type: 'Bearer', admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } } }));
      }
      if (getAccessToken() === 'expired-access') return Promise.resolve(jsonResponse({ message: 'expired' }, { status: 401 }));
      return Promise.resolve(jsonResponse({ success: true, data: { ok: true } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([apiRequest('/one'), apiRequest('/two')]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(getAccessToken()).toBe('shared-access');
  });

  it('does not persist the access token in browser storage', () => {
    setAccessToken('memory-only');
    expect(getAccessToken()).toBe('memory-only');
    expect(window.localStorage.getItem('access_token')).toBeNull();
    expect(window.localStorage.getItem('pixel_eye_access_token')).toBeNull();
    expect(window.sessionStorage.getItem('access_token')).toBeNull();
    expect(window.sessionStorage.getItem('pixel_eye_access_token')).toBeNull();
  });
});


