'use client';

import { useAuth } from './auth-provider';
import type { AdminRole } from '@/types/auth';

export function RoleGuard({ allowedRoles, children, fallback = null }: Readonly<{ allowedRoles: AdminRole[]; children: React.ReactNode; fallback?: React.ReactNode }>) {
  const { admin, status } = useAuth();
  if (status !== 'authenticated' || !admin) return null;
  if (!allowedRoles.includes(admin.role)) return <>{fallback}</>;
  return <>{children}</>;
}
