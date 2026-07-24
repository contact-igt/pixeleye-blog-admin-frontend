import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TemplatesPage from './page';

const mocks = vi.hoisted(() => ({
  role: 'super_admin',
  listTemplates: vi.fn(),
  getTemplate: vi.fn()
}));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => ({ admin: { id: '1', name: 'Admin', role: mocks.role } }) }));
vi.mock('@/services/template.service', () => ({ listTemplates: mocks.listTemplates, getTemplate: mocks.getTemplate }));

const items = [
  { key: 'template_1', version: 2, name: 'Template 1', description: 'A complete healthcare editorial layout with hero, article content, callouts, expert guidance, FAQ and disclaimer.', layout: 'single_column', type: 'system', is_editable: false, is_deletable: false, usage: { draft_count: 2, published_count: 1, total_blog_count: 2 } },
  { key: 'template_2', version: 1, name: 'Template 2', description: 'A healthcare editorial article with a supporting sidebar.', layout: 'article_sidebar', type: 'system', is_editable: false, is_deletable: false, usage: { draft_count: 0, published_count: 0, total_blog_count: 0 } }
] as const;

beforeEach(() => {
  mocks.role = 'super_admin';
  mocks.listTemplates.mockResolvedValue({ items });
  mocks.getTemplate.mockImplementation(async (key: string) => ({ ...items.find((item) => item.key === key), regions: key === 'template_2' ? ['article_content', 'table_of_contents_sidebar'] : ['article_content'], supported_behaviors: key === 'template_2' ? ['Automatic table of contents from H2, H3 and H4 headings'] : ['Focused centered reading column'] }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Templates workspace', () => {
  it('shows loading state, exactly two read-only system cards, usage, and custom empty state', async () => {
    let resolve!: (value: { items: typeof items }) => void;
    mocks.listTemplates.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<TemplatesPage />);
    expect(screen.getByLabelText('Loading templates')).toBeInTheDocument();
    resolve({ items });
    expect(await screen.findByText('Template 1')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getAllByText('System')).toHaveLength(2);
    expect(screen.getAllByText('Read-only')).toHaveLength(2);
    expect(screen.getByText('Used by 2 Blogs')).toBeInTheDocument();
    expect(screen.getByText('Not used by any Blogs yet')).toBeInTheDocument();
    expect(screen.getByText('No custom templates yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Template/i })).not.toBeInTheDocument();
  });

  it('shows an API error and retries', async () => {
    mocks.listTemplates.mockRejectedValueOnce(new Error('Library unavailable')).mockResolvedValueOnce({ items });
    const user = userEvent.setup();
    render(<TemplatesPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Library unavailable');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Template 1')).toBeInTheDocument();
    expect(mocks.listTemplates).toHaveBeenCalledTimes(2);
  });

  it('opens safe details and both existing preview renderers', async () => {
    const user = userEvent.setup();
    render(<TemplatesPage />);
    await screen.findByText('Template 1');
    await user.click(screen.getAllByRole('button', { name: 'View Details' })[1]!);
    expect(await screen.findByRole('dialog', { name: 'Template 2' })).toHaveTextContent('table of contents sidebar');
    await user.click(screen.getAllByRole('button', { name: 'Close dialog' }).at(-1)!);
    await user.click(screen.getAllByRole('button', { name: 'View Preview' })[0]!);
    const templateOnePreview = screen.getByRole('dialog', { name: 'Template Preview' });
    expect(templateOnePreview.querySelector('[data-template="template_1"]')).toBeTruthy();
    expect(templateOnePreview.querySelector('[data-template-version="2"]')).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: 'Close dialog' }).at(-1)!);
    await user.click(screen.getAllByRole('button', { name: 'View Preview' })[1]!);
    const preview = screen.getByRole('dialog', { name: 'Template Preview' });
    expect(preview.querySelector('[data-template="template_2"]')).toBeTruthy();
    expect(preview.querySelector('nav[aria-label="Table of contents"]')).toBeTruthy();
  });

  it('provides query-selected create links for permitted roles and hides them for Viewer', async () => {
    const { unmount } = render(<TemplatesPage />);
    const createLinks = await screen.findAllByRole('link', { name: 'Create Blog with this Template' });
    expect(createLinks[0]).toHaveAttribute('href', '/blogs/create?template=template_1');
    expect(createLinks[1]).toHaveAttribute('href', '/blogs/create?template=template_2');
    unmount();
    mocks.role = 'viewer';
    render(<TemplatesPage />);
    await screen.findByText('Template 1');
    expect(screen.queryByRole('link', { name: 'Create Blog with this Template' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'View Preview' })).toHaveLength(2);
  });
});



