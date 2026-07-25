import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomTemplatesPanel } from './custom-templates-panel';
import type { CustomTemplateSummary } from '@/types/custom-templates';

const useAuthMock = vi.fn();
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => useAuthMock() }));

function response(data: unknown) { return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }

function template(overrides: Partial<CustomTemplateSummary> = {}): CustomTemplateSummary {
  return {
    id: '30', name: 'Healthcare Layout', description: 'A layout', status: 'draft', status_before_archive: null,
    owner: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' },
    current_version: { id: '50', version_number: 1 }, schema_version: 1, lock_version: 1,
    activated_at: null, archived_at: null, restored_at: null,
    created_at: '2026-07-24T00:00:00Z', updated_at: '2026-07-24T00:00:00Z',
    usage: { total_blog_versions: 0, distinct_blogs: 0, published_blog_versions: 0 },
    ...overrides
  };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('CustomTemplatesPanel', () => {
  it('loads and lists Custom Templates with status badges', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template()], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    expect(await screen.findByText('Healthcare Layout')).toBeInTheDocument();
    expect(screen.getByText('Not used by any Blogs yet')).toBeInTheDocument();
  });

  it('shows an empty state with no Custom Templates', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'author' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [], pagination: { page: 1, limit: 50, total_items: 0, total_pages: 0, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    expect(await screen.findByText('No Custom Templates yet')).toBeInTheDocument();
  });

  it('hides Create action for a viewer', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'viewer' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [], pagination: { page: 1, limit: 50, total_items: 0, total_pages: 0, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    await screen.findByText('No Custom Templates yet');
    expect(screen.queryByText('Create Custom Template')).not.toBeInTheDocument();
  });

  it('runs the archive lifecycle action through a confirmation dialog', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ items: [template({ status: 'active' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } }))
      .mockResolvedValueOnce(response(template({ status: 'archived' })))
      .mockResolvedValueOnce(response({ items: [template({ status: 'archived' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<CustomTemplatesPanel />);
    await screen.findByText('Healthcare Layout');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByText('Delete Custom Template?');
    await user.click(within(dialog.closest('div') as HTMLElement ?? document.body).queryByRole('button', { name: 'Move to Archive' }) ?? screen.getByRole('button', { name: 'Move to Archive' }));
    expect(fetchMock.mock.calls.some((args: unknown[]) => String(args[0]).includes('/custom-templates/30/archive'))).toBe(true);
  });

  it('renders a View link for every card pointing at the correct Template id', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template()], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    const link = await screen.findByRole('link', { name: /View Healthcare Layout/i });
    expect(link).toHaveAttribute('href', '/templates/custom/30/view');
  });

  it('hides the View link for a viewer without read access', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '2', role: 'author' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template({ owner: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    await screen.findByText('Healthcare Layout');
    expect(screen.queryByRole('link', { name: /View Healthcare Layout/i })).not.toBeInTheDocument();
  });

  it('shows Edit only with edit permission', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '2', role: 'viewer' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template({ status: 'active' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    await screen.findByText('Healthcare Layout');
    expect(screen.queryByRole('link', { name: /Edit Healthcare Layout/i })).not.toBeInTheDocument();
  });

  it('shows Restore only for an archived Template', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template({ status: 'archived' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows Delete Permanently only for authorized super_admin on an archived Template', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template({ status: 'archived' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    expect(await screen.findByRole('button', { name: 'Delete Permanently' })).toBeInTheDocument();
  });

  it('does not show Delete Permanently on an active Template', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template({ status: 'active' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    await screen.findByText('Healthcare Layout');
    expect(screen.queryByRole('button', { name: 'Delete Permanently' })).not.toBeInTheDocument();
  });

  it('does not show Delete Permanently on a draft Template', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template({ status: 'draft' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    await screen.findByText('Healthcare Layout');
    expect(screen.queryByRole('button', { name: 'Delete Permanently' })).not.toBeInTheDocument();
  });

  it('hides Delete/archive for a role without archive permission', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '2', role: 'viewer' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [template({ status: 'active' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplatesPanel />);
    await screen.findByText('Healthcare Layout');
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('surfaces a clear message when permanent delete is rejected as in-use', async () => {
    useAuthMock.mockReturnValue({ admin: { id: '1', role: 'super_admin' } });
    const conflictResponse = new Response(
      JSON.stringify({ success: false, message: 'Custom Template is in use', data: { code: 'CUSTOM_TEMPLATE_IN_USE' } }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ items: [template({ status: 'archived' })], pagination: { page: 1, limit: 50, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } }))
      .mockResolvedValueOnce(conflictResponse);
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<CustomTemplatesPanel />);
    await user.click(await screen.findByRole('button', { name: 'Delete Permanently' }));
    await screen.findByText('Permanently Delete Custom Template?');
    const confirmButtons = screen.getAllByRole('button', { name: 'Delete Permanently' });
    await user.click(confirmButtons[confirmButtons.length - 1]!);
    expect(await screen.findByText(/cannot be permanently deleted because it is referenced/i)).toBeInTheDocument();
  });
});
