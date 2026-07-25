import { clearAccessToken, getAccessToken, setAccessToken } from './auth-token';
import type { ApiResponse, AuthTokenResponse } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_BLOG_API_URL ?? 'http://localhost:5000/api/v1';
const TIMEOUT_MS = 8_000;

type AuthFailureHandler = () => void;

export interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  skipRefresh?: boolean;
}

let refreshPromise: Promise<string> | null = null;
let authFailureHandler: AuthFailureHandler | null = null;
let refreshChannel: BroadcastChannel | null | undefined;
let remoteRefreshPromise: Promise<string> | null = null;
let resolveRemoteRefresh: ((token: string) => void) | null = null;
let rejectRemoteRefresh: (() => void) | null = null;

type AuthBroadcastMessage =
  | { type: 'refresh-started' }
  | { type: 'refresh-succeeded'; access_token: string }
  | { type: 'refresh-failed' }
  | { type: 'logout' };

export interface ApiFieldError { field?: string; message: string }

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly requestId?: string,
    public readonly errors: ApiFieldError[] = [],
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function setAuthFailureHandler(handler: AuthFailureHandler | null): void {
  authFailureHandler = handler;
}

function getRefreshChannel(): BroadcastChannel | null {
  if (refreshChannel !== undefined) return refreshChannel;
  if (typeof BroadcastChannel === 'undefined') {
    refreshChannel = null;
    return refreshChannel;
  }
  refreshChannel = new BroadcastChannel('pixel-eye-admin-auth');
  refreshChannel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
    const message = event.data;
    if (message.type === 'refresh-started' && !remoteRefreshPromise && !refreshPromise) {
      remoteRefreshPromise = new Promise<string>((resolve, reject) => {
        resolveRemoteRefresh = resolve;
        rejectRemoteRefresh = reject;
      });
      globalThis.setTimeout(() => {
        rejectRemoteRefresh?.();
        remoteRefreshPromise = null;
        resolveRemoteRefresh = null;
        rejectRemoteRefresh = null;
      }, TIMEOUT_MS);
      return;
    }
    if (message.type === 'refresh-succeeded') {
      setAccessToken(message.access_token);
      resolveRemoteRefresh?.(message.access_token);
      remoteRefreshPromise = null;
      resolveRemoteRefresh = null;
      rejectRemoteRefresh = null;
      return;
    }
    if (message.type === 'refresh-failed') {
      rejectRemoteRefresh?.();
      remoteRefreshPromise = null;
      resolveRemoteRefresh = null;
      rejectRemoteRefresh = null;
      return;
    }
    if (message.type === 'logout') {
      clearAccessToken();
      authFailureHandler?.();
    }
  };
  return refreshChannel;
}

function broadcastAuth(message: AuthBroadcastMessage): void {
  getRefreshChannel()?.postMessage(message);
}

export function broadcastLogout(): void {
  broadcastAuth({ type: 'logout' });
}

export function resetApiClientCoordinationForTests(): void {
  refreshPromise = null;
  remoteRefreshPromise = null;
  resolveRemoteRefresh = null;
  rejectRemoteRefresh = null;
  refreshChannel?.close();
  refreshChannel = undefined;
  authFailureHandler = null;
}
export function buildApiUrl(path: string, baseUrl = API_URL): string {
  try {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
    return `${parsed.toString().replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  } catch {
    throw new ApiClientError('The backend API URL is invalid');
  }
}

function buildHeaders(init: ApiRequestOptions): Headers {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = getAccessToken();
  if (init.auth !== false && token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function parsePayload(response: Response): Promise<Record<string, unknown> | null> {
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

async function performRequest(path: string, init: ApiRequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(buildApiUrl(path), {
      ...init,
      headers: buildHeaders(init),
      credentials: 'include',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeFetchError(error: unknown): never {
  if (error instanceof ApiClientError) throw error;
  if (error instanceof DOMException && error.name === 'AbortError') throw new ApiClientError('The API request timed out');
  throw new ApiClientError('Unable to connect to the backend API');
}

async function refreshAccessToken(): Promise<string> {
  if (remoteRefreshPromise) return remoteRefreshPromise;
  if (!refreshPromise) {
    broadcastAuth({ type: 'refresh-started' });
    refreshPromise = (async () => {
      const response = await performRequest('/auth/refresh', {
        method: 'POST',
        auth: false,
        skipRefresh: true,
        retryOnUnauthorized: false
      });
      const payload = await parsePayload(response) as ApiResponse<AuthTokenResponse> | null;
      if (!response.ok || !payload?.data?.access_token) {
        throw new ApiClientError(payload?.message ?? 'Authentication refresh failed', response.status);
      }
      setAccessToken(payload.data.access_token);
      return payload.data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function shouldTryRefresh(path: string, init: ApiRequestOptions, retried: boolean): boolean {
  return responseCanRefresh(path, init) && !retried;
}

function responseCanRefresh(path: string, init: ApiRequestOptions): boolean {
  return init.auth !== false && init.retryOnUnauthorized !== false && !init.skipRefresh && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh');
}

export async function apiRequest<T>(path: string, init: ApiRequestOptions = {}, retried = false): Promise<T> {
  try {
    const response = await performRequest(path, init);
    const payload = await parsePayload(response);

    if (response.status === 401 && shouldTryRefresh(path, init, retried)) {
      try {
        await refreshAccessToken();
        return apiRequest<T>(path, init, true);
      } catch (refreshError) {
        clearAccessToken();
        authFailureHandler?.();
        if (refreshError instanceof ApiClientError) throw refreshError;
        throw new ApiClientError('Authentication refresh failed', 401);
      }
    }

    if (!response.ok) {
      throw new ApiClientError(
        typeof payload?.message === 'string' ? payload.message : 'The API request failed',
        response.status,
        typeof payload?.request_id === 'string' ? payload.request_id : response.headers.get('x-request-id') ?? undefined,
        Array.isArray(payload?.errors) ? payload.errors as ApiFieldError[] : [],
        payload?.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : undefined
      );
    }
    return payload as T;
  } catch (error) {
    normalizeFetchError(error);
  }
}






