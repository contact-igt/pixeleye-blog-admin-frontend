import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import BuilderLayout from '@/app/(builder)/layout';
import { useAuth } from '@/components/auth/auth-provider';
import { isCustomTemplateBuilderEnabled } from '@/lib/feature-flags';

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/lib/feature-flags', () => ({
  isCustomTemplateBuilderEnabled: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn()
  })
}));

describe('Builder route guard layout tests', () => {
  it('should render loading state when auth profile is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'loading',
      admin: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshCurrentAdmin: vi.fn()
    });

    render(<BuilderLayout><div>Builder Workspace</div></BuilderLayout>);
    expect(screen.getByText(/Checking builder authorization/i)).toBeInTheDocument();
  });

  it('should render children when authenticated, flag enabled, and authorized role', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      admin: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'super_admin' },
      login: vi.fn(),
      logout: vi.fn(),
      refreshCurrentAdmin: vi.fn()
    });
    vi.mocked(isCustomTemplateBuilderEnabled).mockReturnValue(true);

    render(<BuilderLayout><div>Builder Workspace</div></BuilderLayout>);
    expect(screen.getByText('Builder Workspace')).toBeInTheDocument();
  });
});
