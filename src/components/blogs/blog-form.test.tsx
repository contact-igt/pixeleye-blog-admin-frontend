import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlogForm } from './blog-form';
import type { BlogDetail } from '@/types/blog';
import type { MediaAsset } from '@/types/media';

const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock, refresh: refreshMock }) }));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => ({ admin: { id: '1', name: 'Admin', role: 'editor' } }) }));

const media: MediaAsset = { id: '5', purpose: 'hero', alt_text: 'Eye care image', original_file_name: 'hero.jpg', storage_provider: 'cloudflare_r2', original_url: 'https://media.example.com/hero.webp', variants: {}, width: 800, height: 600, file_size: 1000, output_mime_type: 'image/webp', status: 'active', uploaded_by: { id: '1', name: 'Admin' }, created_at: '2026-07-22T00:00:00Z', updated_at: '2026-07-22T00:00:00Z' };
function jsonResponse(body: unknown, init: ResponseInit = {}) { return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'Content-Type': 'application/json' } }); }
function templateList() { return jsonResponse({ success: true, data: [{ key: 'template_1', version: 1, name: 'Classic Single-Column Article', description: 'A focused article layout with a centered reading column.', layout: 'single_column' }, { key: 'template_2', version: 1, name: 'Article with Sidebar', description: 'An article layout with a supporting sidebar.', layout: 'article_sidebar' }] }); }
function mediaList() { return jsonResponse({ success: true, data: { items: [media], pagination: { page: 1, limit: 12, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } } }); }
function customTemplateList() { return jsonResponse({ success: true, data: { items: [{ id: '12', name: 'Custom Blog Layout', status: 'active', current_version: { id: '30', version_number: 1 }, owner: { id: '1', name: 'Admin' } }], pagination: { page: 1, limit: 100, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } } }); }
function savedBlog(templateKey: 'template_1' | 'template_2'): BlogDetail {
  const template = templateKey === 'template_2'
    ? { key: 'template_2' as const, version: 1, name: 'Article with Sidebar', layout: 'article_sidebar' as const }
    : { key: 'template_1' as const, version: 1, name: 'Classic Single-Column Article', layout: 'single_column' as const };
  return {
    id: '7', title: 'Saved Article', slug: 'saved-article', excerpt: 'Saved excerpt', status: 'draft', previous_status: null,
    featured_media: media, author: { id: '1', name: 'Admin' }, published_at: null, updated_at: '2026-07-23T00:00:00Z', created_at: '2026-07-23T00:00:00Z', has_unpublished_changes: false,
    draft_version: { id: '20', version_number: 1, version_type: 'draft', title: 'Saved Article', excerpt: 'Saved excerpt', content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Saved body' }] }] }, content_html: '<p>Saved body</p>', featured_media_id: '5', template_key: templateKey, template_version: 1, template, created_at: '2026-07-23T00:00:00Z' },
    published_version: null
  };
}

describe('BlogForm', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); replaceMock.mockReset(); refreshMock.mockReset(); });

  it('creates a draft with SEO and featured media selection', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return mediaList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (init?.method === 'POST') return jsonResponse({ success: true, data: { id: '7' } }, { status: 201 });
      return jsonResponse({ success: true, data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<BlogForm />);

    const templateOne = await screen.findByRole('radio', { name: /Classic Single-Column Article/ });
    expect(screen.getByRole('complementary', { name: 'Blog settings' })).toHaveClass('xl:sticky', 'xl:top-24');
    expect(templateOne).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: /Article with Sidebar/ }));

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Eye Care' } });
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Helpful summary' } });
    await user.type(screen.getByLabelText('Blog content editor'), 'First paragraph');
    await user.click(screen.getByText('Search & SEO'));
    await user.type(screen.getByLabelText('SEO title'), 'SEO Eye Care');
    await user.click(screen.getByText('Choose featured image'));
    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: 'hero.jpg' }));
    await user.click(screen.getByRole('button', { name: /Save Draft/ }));

    const createCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST' && String(call[0]).includes('/blogs'));
    expect(createCall).toBeDefined();
    expect(JSON.parse(createCall?.[1]?.body as string)).toMatchObject({ title: 'Eye Care', slug: 'eye-care', featured_media_id: '5', seo_title: 'SEO Eye Care', template_key: 'template_2' });
    expect(replaceMock).toHaveBeenCalledWith('/blogs/7/edit');
  });

  it('keeps a query-selected template through edits and includes it in the create payload', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return mediaList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (init?.method === 'POST') return jsonResponse({ success: true, data: { id: '8' } }, { status: 201 });
      return jsonResponse({ success: true, data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<BlogForm initialTemplateKey="template_2" />);
    expect(await screen.findByRole('radio', { name: /Article with Sidebar/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Template Two Article' } });
    expect(screen.getByRole('radio', { name: /Article with Sidebar/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: /Save Draft/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'POST')).toBe(true));
    const createCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(JSON.parse(createCall?.[1]?.body as string)).toMatchObject({ title: 'Template Two Article', template_key: 'template_2' });
  });
  it('saves draft edits and publishes existing blogs', async () => {
    const user = userEvent.setup();
    const existing: BlogDetail = { id: '7', title: 'Eye Care', slug: 'eye-care', excerpt: 'Excerpt', status: 'published', previous_status: null, featured_media: media, author: { id: '1', name: 'Admin' }, published_at: '2026-07-22T00:00:00Z', updated_at: '2026-07-22T00:00:00Z', created_at: '2026-07-22T00:00:00Z', has_unpublished_changes: true, draft_version: { id: '20', version_number: 1, version_type: 'draft', title: 'Eye Care', excerpt: 'Excerpt', content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] }, content_html: '<p>Body</p>', featured_media_id: '5', template_key: 'template_1', template_version: 1, template: { key: 'template_1', version: 1, name: 'Classic Single-Column Article', layout: 'single_column' }, created_at: '2026-07-22T00:00:00Z' }, published_version: null };
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return mediaList();
      if (url.includes('/publish-checklist')) return jsonResponse({ success: true, data: { ready: true, items: [] } });
      if (url.endsWith('/publish')) return jsonResponse({ success: true, data: existing });
      if (init?.method === 'PATCH') return jsonResponse({ success: true, data: existing });
      return jsonResponse({ success: true, data: existing });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<BlogForm blog={existing} />);

    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: /Save Draft/ }));
    await screen.findByText('Draft changes saved.');
    await user.click(screen.getByRole('button', { name: /Publish Updates/ }));

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/blogs/7'), expect.objectContaining({ method: 'PATCH' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/blogs/7/publish-checklist'), expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/blogs/7/publish'), expect.objectContaining({ method: 'POST' }));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('preserves the Draft template and warns when it differs from Published', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => { const url = String(input); return url.includes('/custom-templates') ? customTemplateList() : templateList(); }));
    const publishedVersion = { id: '19', version_number: 1, version_type: 'published' as const, title: 'Eye Care', excerpt: 'Excerpt', featured_media_id: '5', template_key: 'template_1' as const, template_version: 1, template: { key: 'template_1' as const, version: 1, name: 'Classic Single-Column Article', layout: 'single_column' as const }, created_at: '2026-07-22T00:00:00Z' };
    const draftVersion = { ...publishedVersion, id: '20', version_type: 'draft' as const, template_key: 'template_2' as const, template: { key: 'template_2' as const, version: 1, name: 'Article with Sidebar', layout: 'article_sidebar' as const }, content_json: { type: 'doc' as const, content: [{ type: 'paragraph' }] }, content_html: '<p></p>' };
    const existing: BlogDetail = { id: '7', title: 'Eye Care', slug: 'eye-care', excerpt: 'Excerpt', status: 'published', previous_status: null, featured_media: media, author: { id: '1', name: 'Admin' }, published_at: '2026-07-22T00:00:00Z', updated_at: '2026-07-22T00:00:00Z', created_at: '2026-07-22T00:00:00Z', has_unpublished_changes: true, has_unpublished_template_changes: true, draft_version: draftVersion, published_version: publishedVersion };
    const user = userEvent.setup();
    render(<BlogForm blog={existing} />);

    const sidebarTemplate = await screen.findByRole('radio', { name: /Article with Sidebar/ });
    expect(sidebarTemplate).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Template change is saved in Draft/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Classic Single-Column Article/ }));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });});




describe('BlogForm template preservation', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); replaceMock.mockReset(); refreshMock.mockReset(); });

  it('preserves content, media, and Template 2 selection through rerenders and a save validation error', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return mediaList();
      if (init?.method === 'POST') return jsonResponse({ success: false, message: 'Excerpt validation failed' }, { status: 422 });
      return jsonResponse({ success: true, data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<BlogForm initialTemplateKey="template_2" />);

    const sidebarTemplate = await screen.findByRole('radio', { name: /Article with Sidebar/ });
    expect(sidebarTemplate).toBeChecked();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Preserved Article' } });
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Preserved excerpt' } });
    await user.type(screen.getByLabelText('Blog content editor'), 'Preserved content');
    expect(sidebarTemplate).toBeChecked();

    await user.click(screen.getByText('Choose featured image'));
    await user.click(await screen.findByRole('button', { name: 'hero.jpg' }));
    expect(sidebarTemplate).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Classic Single-Column Article/ }));
    await user.click(sidebarTemplate);

    expect(screen.getByLabelText('Title')).toHaveValue('Preserved Article');
    expect(screen.getByLabelText('Excerpt')).toHaveValue('Preserved excerpt');
    expect(screen.getByLabelText('Blog content editor')).toHaveTextContent('Preserved content');
    await user.click(screen.getByRole('button', { name: /Save Draft/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Excerpt validation failed');
    expect(sidebarTemplate).toBeChecked();
    expect(screen.getByLabelText('Blog content editor')).toHaveTextContent('Preserved content');
  }, 15000);
});


describe('BlogForm template instructions and persistence confirmation', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); replaceMock.mockReset(); refreshMock.mockReset(); });

  it('shows fields and heading instructions for the selected template', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => { const url = String(input); return url.includes('/custom-templates') ? customTemplateList() : templateList(); }));
    const user = userEvent.setup();
    render(<BlogForm />);
    expect(await screen.findByText('Selected: Template 1')).toBeInTheDocument();
    expect(screen.getByText('Use headings when helpful; this layout does not display a Table of Contents.')).toBeInTheDocument();
    expect(screen.getByText('Applies on first save')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Article with Sidebar/ }));
    expect(screen.getByText('Selected: Template 2')).toBeInTheDocument();
    expect(screen.getByText('Use H2, H3, or H4 headings in the editor to build the Table of Contents.')).toBeInTheDocument();
  });

  it('sends Template 2 and confirms it was saved in the returned Draft', async () => {
    const original = savedBlog('template_1');
    const updated = savedBlog('template_2');
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return mediaList();
      if (init?.method === 'PATCH') return jsonResponse({ success: true, data: updated });
      return jsonResponse({ success: true, data: original });
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<BlogForm blog={original} />);
    await user.click(await screen.findByRole('radio', { name: /Article with Sidebar/ }));
    expect(screen.getByText('Save Draft to apply')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save Draft/ }));
    expect(await screen.findByText('Saved in Draft')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(JSON.parse(patchCall?.[1]?.body as string)).toMatchObject({ template_key: 'template_2' });
  });

  it('reports when the backend response does not confirm the selected template', async () => {
    const original = savedBlog('template_1');
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return mediaList();
      if (init?.method === 'PATCH') return jsonResponse({ success: true, data: original });
      return jsonResponse({ success: true, data: original });
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<BlogForm blog={original} />);
    await user.click(await screen.findByRole('radio', { name: /Article with Sidebar/ }));
    await user.click(screen.getByRole('button', { name: /Save Draft/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not the selected template_2');
    expect(screen.getByText('Save Draft to apply')).toBeInTheDocument();
  });

  it('shows only the selected Custom Template\'s own sections in Article Sections, not the fixed Template 1/2 list', async () => {
    const customTemplateDetail = jsonResponse({
      success: true,
      data: {
        id: '12',
        name: 'Custom Blog Layout',
        status: 'active',
        current_version_detail: {
          id: '30',
          version_number: 1,
          layout_config_json: {
            schemaVersion: 1,
            layoutId: 'sample_layout',
            metadata: { name: 'Custom Blog Layout', description: '' },
            page: { contentWidth: 'standard', background: 'white', spacing: 'normal', typography: 'editorial' },
            sections: [
              {
                id: 'sec-1',
                layout: 'full_width',
                responsiveStrategy: 'stack_on_mobile',
                enabled: true,
                slots: [
                  {
                    id: 'slot-1',
                    name: 'Main',
                    components: [
                      { id: 'comp-1', componentKey: 'numbered_list', blockId: 'comp-1', settings: { style: 'circle' }, enabled: true },
                      { id: 'comp-2', componentKey: 'numbered_list', blockId: 'comp-2', settings: { style: 'circle' }, enabled: true }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates/12')) return customTemplateDetail;
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return mediaList();
      return jsonResponse({ success: true, data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<BlogForm />);

    expect(await screen.findByText('Custom Blog Layout')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Custom Blog Layout/ }));

    expect(await screen.findByText('Article Sections')).toBeInTheDocument();
    expect(screen.getByText('Numbered List #1')).toBeInTheDocument();
    expect(screen.getByText('Numbered List #2')).toBeInTheDocument();
    // The fixed Template 1/2 block list (e.g. Key Takeaways, Medical Disclaimer) must not appear
    // for a Custom Template that doesn't define those components.
    expect(screen.queryByText('Key Takeaways')).not.toBeInTheDocument();
    expect(screen.queryByText('Medical Disclaimer')).not.toBeInTheDocument();
  });
});
