export type AdminRole = 'super_admin' | 'editor' | 'author' | 'viewer';
export type AdminStatus = 'active' | 'inactive' | 'blocked';

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status?: AdminStatus;
  last_login_at?: string | null;
  created_at?: string;
}

export interface AuthTokenResponse {
  admin: AuthenticatedAdmin;
  access_token: string;
  token_type: 'Bearer';
}

export interface AuthMeResponse {
  admin: AuthenticatedAdmin;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  request_id?: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
