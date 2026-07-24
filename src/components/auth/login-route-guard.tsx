'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

export function LoginRouteGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [router, status]);

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-[var(--brand-page)] text-sm font-semibold text-[var(--brand-navy)]">Checking admin session...</div>;
  }

  if (status === 'authenticated') return null;
  return <>{children}</>;
}
