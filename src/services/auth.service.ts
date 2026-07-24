import { apiRequest, type ApiRequestOptions } from './api-client';
import { clearAccessToken, setAccessToken } from './auth-token';
import type { ApiResponse, AuthMeResponse, AuthTokenResponse } from '@/types/auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

function jsonOptions(method: string, body?: unknown, options: ApiRequestOptions = {}): ApiRequestOptions {
  return {
    method,
    body: body ? JSON.stringify(body) : undefined,
    ...options
  };
}

export async function loginAdmin(email: string, password: string): Promise<AuthTokenResponse> {
  const response = await apiRequest<ApiResponse<AuthTokenResponse>>('/auth/login', jsonOptions('POST', { email, password }, {
    auth: false,
    retryOnUnauthorized: false
  }));
  setAccessToken(response.data.access_token);
  return response.data;
}

export async function refreshAdminSession(): Promise<AuthTokenResponse> {
  const response = await apiRequest<ApiResponse<AuthTokenResponse>>('/auth/refresh', jsonOptions('POST', undefined, {
    auth: false,
    skipRefresh: true,
    retryOnUnauthorized: false
  }));
  setAccessToken(response.data.access_token);
  return response.data;
}

export async function getCurrentAdmin(): Promise<AuthMeResponse> {
  const response = await apiRequest<ApiResponse<AuthMeResponse>>('/auth/me');
  return response.data;
}

export async function logoutAdmin(): Promise<void> {
  try {
    await apiRequest<ApiResponse<{ logged_out: true }>>('/auth/logout', jsonOptions('POST', undefined, {
      auth: false,
      retryOnUnauthorized: false
    }));
  } finally {
    clearAccessToken();
  }
}

export const login = ({ email, password }: LoginCredentials) => loginAdmin(email, password);
export const refreshSession = refreshAdminSession;
export const logout = logoutAdmin;


