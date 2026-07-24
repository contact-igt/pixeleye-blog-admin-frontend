'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { broadcastLogout, setAuthFailureHandler } from '@/services/api-client';
import { clearAccessToken } from '@/services/auth-token';
import { getCurrentAdmin, login as loginRequest, logout as logoutRequest, refreshSession } from '@/services/auth.service';
import type { AuthenticatedAdmin, AuthStatus } from '@/types/auth';

interface AuthContextValue {
  status: AuthStatus;
  admin: AuthenticatedAdmin | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshCurrentAdmin(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let startupAuthPromise: Promise<AuthenticatedAdmin | null> | null = null;

function getStartupAuthPromise(): Promise<AuthenticatedAdmin | null> {
  if (!startupAuthPromise) {
    startupAuthPromise = (async () => {
      await refreshSession();
      const profile = await getCurrentAdmin();
      return profile.admin;
    })().catch(() => null);
  }
  return startupAuthPromise;
}

export function resetAuthStartupForTests(): void {
  startupAuthPromise = null;
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [admin, setAdmin] = useState<AuthenticatedAdmin | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const markUnauthenticated = useCallback(() => {
    clearAccessToken();
    setAdmin(null);
    setStatus('unauthenticated');
  }, []);

  const refreshCurrentAdmin = useCallback(async () => {
    const profile = await getCurrentAdmin();
    setAdmin(profile.admin);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest({ email, password });
    setAdmin(result.admin);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    startupAuthPromise = null;
    markUnauthenticated();
    broadcastLogout();
    router.replace('/login');
  }, [markUnauthenticated, router]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      markUnauthenticated();
      if (pathname !== '/login') router.replace('/login');
    });
    return () => setAuthFailureHandler(null);
  }, [markUnauthenticated, pathname, router]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const startupAdmin = await getStartupAuthPromise();
      if (!active) return;
      if (startupAdmin) {
        setAdmin(startupAdmin);
        setStatus('authenticated');
        return;
      }
      markUnauthenticated();
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [markUnauthenticated]);

  const value = useMemo<AuthContextValue>(() => ({ status, admin, login, logout, refreshCurrentAdmin }), [admin, login, logout, refreshCurrentAdmin, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}



