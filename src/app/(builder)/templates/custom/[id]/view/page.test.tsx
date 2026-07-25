import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ViewCustomTemplatePage from './page';
import { getCustomTemplate } from '@/services/custom-templates.service';
import { ApiClientError } from '@/services/api-client';
import type { CustomTemplateDetail } from '@/types/custom-templates';
import { sampleFrontendCustomTemplateConfig } from '@/components/blogs/custom-template/custom-template-sample';

vi.mock('@/services/custom-templates.service', () => ({
  getCustomTemplate: vi.fn()
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '30' }),
  useRouter: () => ({ push })
}));

function detail(overrides: Partial<CustomTemplateDetail> = {}): CustomTemplateDetail {
  return {
    id: '30', name: 'Healthcare Layout', description: 'A layout', status: 'active', status_before_archive: null,
    owner: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' },
    current_version: { id: '50', version_number: 2 }, schema_version: 1, lock_version: 2,
    activated_at: null, archived_at: null, restored_at: null,
    created_at: '2026-07-24T00:00:00Z', updated_at: '2026-07-24T00:00:00Z',
    usage: { total_blog_versions: 3, distinct_blogs: 2, published_blog_versions: 1 },
    creator: null, updater: null, activated_by: null, archived_by: null, restored_by: null,
    current_version_detail: {
      id: '50', version_number: 2, schema_version: 1, change_summary: null, created_by: null, created_at: '2026-07-24T00:00:00Z',
      layout_config_json: sampleFrontendCustomTemplateConfig, is_current: true
    },
    permissions: { can_edit: true, can_activate: false, can_archive: true, can_restore: false, can_duplicate: true, can_permanently_delete: false },
    ...overrides
  };
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('ViewCustomTemplatePage', () => {
  it('shows a loading state before the Template loads', () => {
    vi.mocked(getCustomTemplate).mockReturnValue(new Promise(() => {}));
    render(<ViewCustomTemplatePage />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading Custom Template/i);
  });

  it('loads and renders Template metadata and the preview', async () => {
    vi.mocked(getCustomTemplate).mockResolvedValue(detail());
    render(<ViewCustomTemplatePage />);
    expect(await screen.findByText('Template Preview')).toBeInTheDocument();
    expect(screen.getAllByText('Healthcare Layout').length).toBeGreaterThan(0);
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('2 Blogs')).toBeInTheDocument();
  });

  it('renders the CustomTemplateRenderer output read-only, without builder controls', async () => {
    vi.mocked(getCustomTemplate).mockResolvedValue(detail());
    render(<ViewCustomTemplatePage />);
    await screen.findByText('Template Preview');
    expect(screen.queryByText('Save Version')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Publish/i })).not.toBeInTheDocument();
  });

  it('shows an Edit Template link when permitted', async () => {
    vi.mocked(getCustomTemplate).mockResolvedValue(detail({ permissions: { can_edit: true, can_activate: false, can_archive: true, can_restore: false, can_duplicate: true, can_permanently_delete: false } }));
    render(<ViewCustomTemplatePage />);
    const link = await screen.findByRole('link', { name: /Edit Template/i });
    expect(link).toHaveAttribute('href', '/templates/custom/30/edit');
  });

  it('hides the Edit Template link without edit permission', async () => {
    vi.mocked(getCustomTemplate).mockResolvedValue(detail({ permissions: { can_edit: false, can_activate: false, can_archive: false, can_restore: false, can_duplicate: false, can_permanently_delete: false } }));
    render(<ViewCustomTemplatePage />);
    await screen.findByText('Template Preview');
    expect(screen.queryByRole('link', { name: /Edit Template/i })).not.toBeInTheDocument();
  });

  it('shows a not-found state for a missing Template', async () => {
    vi.mocked(getCustomTemplate).mockRejectedValue(new ApiClientError('Not found', 404));
    render(<ViewCustomTemplatePage />);
    expect(await screen.findByText('This Custom Template was not found.')).toBeInTheDocument();
  });

  it('shows an unauthorized state for a 403 response', async () => {
    vi.mocked(getCustomTemplate).mockRejectedValue(new ApiClientError('Forbidden', 403));
    render(<ViewCustomTemplatePage />);
    expect(await screen.findByText('You do not have permission to view this Custom Template.')).toBeInTheDocument();
  });

  it('shows a generic API error state', async () => {
    vi.mocked(getCustomTemplate).mockRejectedValue(new ApiClientError('The API request failed', 500));
    render(<ViewCustomTemplatePage />);
    expect(await screen.findByText('The API request failed')).toBeInTheDocument();
  });
});
