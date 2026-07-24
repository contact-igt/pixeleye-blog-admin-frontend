'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-[var(--brand-page)] text-sm font-semibold text-[var(--brand-navy)]">Checking admin session...</div>;
  }

  if (status === 'unauthenticated') return null;
  return <>{children}</>;
}
