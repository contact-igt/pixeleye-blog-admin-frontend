'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { isCustomTemplateBuilderEnabled } from '@/lib/feature-flags';
import type { AdminRole } from '@/types/auth';

function canCreate(role?: AdminRole | null): boolean {
  return role === 'super_admin' || role === 'editor' || role === 'author';
}

export default function BuilderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { status, admin } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    const flagEnabled = isCustomTemplateBuilderEnabled();
    const roleAllowed = canCreate(admin?.role);

    if (!flagEnabled || !roleAllowed) {
      router.replace('/templates');
      return;
    }

    setAuthorized(true);
  }, [status, admin, router]);

  if (status === 'loading' || !authorized) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-900">
        Checking builder authorization...
      </div>
    );
  }

  return <>{children}</>;
}
