import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BlogsPage from './page';

const replaceMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => ({ admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } }));
let query = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/blogs',
  useSearchParams: () => new URLSearchParams(query)
}));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => authMock }));

const blog = { id: '7', title: 'Eye Care', slug: 'eye-care', excerpt: 'Excerpt', status: 'draft', previous_status: null, featured_media: { id: '5', original_url: 'https://media.example.com/hero.webp' }, author: { id: '1', name: 'Admin' }, published_at: null, updated_at: '2026-07-22T00:00:00Z', created_at: '2026-07-22T00:00:00Z', has_unpublished_changes: false };
const trashedBlog = { ...blog, status: 'trashed', previous_status: 'published', trashed_at: '2026-07-22T00:00:00Z' };
function jsonResponse(body: unknown, init: ResponseInit = {}) { return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'Content-Type': 'application/json' } }); }
function listResponse(items: unknown[]) { return jsonResponse({ success: true, data: { items, pagination: { page: 1, limit: 20, total_items: items.length, total_pages: items.length ? 1 : 0, has_next_page: false, has_previous_page: false } } }); }

describe('BlogsPage', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); replaceMock.mockReset(); authMock.admin = { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' }; query = ''; });

  it('renders active blog list and scoped controls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([blog])));
    render(<BlogsPage />);

    expect(screen.getByText('Blogs')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Blog/ })).toHaveAttribute('href', '/blogs/create');
    await screen.findByText('Eye Care');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Publish$/ })).toBeInTheDocument();
  });

  it('debounces search and preserves requested pagination navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ success: true, data: { items: [blog], pagination: { page: 2, limit: 20, total_items: 30, total_pages: 2, has_next_page: false, has_previous_page: true } } }))));
    query = 'page=2';
    render(<BlogsPage />);
    fireEvent.change(screen.getByLabelText('Search blogs'), { target: { value: 'retina' } });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/blogs?page=1&search=retina'), { timeout: 1200 });
    await screen.findByText(/Page 2 of 2/);
    fireEvent.click(screen.getByRole('button', { name: /Previous/ }));
    expect(replaceMock).toHaveBeenLastCalledWith('/blogs?page=1');
  });

  it('does not reset pagination when the URL changes without a search change', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { items: [blog], pagination: { page: 2, limit: 20, total_items: 30, total_pages: 2, has_next_page: false, has_previous_page: true } } })));
    query = 'page=2';
    render(<BlogsPage />);

    await screen.findByText(/Page 2 of 2/);
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('moves a blog to trash only after confirmation', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(listResponse([blog])).mockResolvedValueOnce(jsonResponse({ success: true, data: { ...blog, status: 'trashed' } })).mockResolvedValueOnce(listResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    render(<BlogsPage />);
    await screen.findByText('Eye Care');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Move Blog to Trash')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move to Trash' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/blogs/7'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('lists trash and restores blogs for publishing roles', async () => {
    query = 'tab=trash';
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(listResponse([trashedBlog])).mockResolvedValueOnce(jsonResponse({ success: true, data: { ...blog, status: 'unpublished' } })).mockResolvedValueOnce(listResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    render(<BlogsPage />);
    await screen.findByText('Eye Care');
    await user.click(screen.getByRole('button', { name: /Restore/ }));
    expect(screen.getByText('Restore blog article?')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Restore article' }).at(-1)!);
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/blogs/7/restore'), expect.objectContaining({ method: 'POST' }));
  });

  it('opens the full article preview from the card image', async () => {
    const user = userEvent.setup();
    const detail = {
      ...blog,
      draft_version: {
        id: '10',
        version_number: 1,
        version_type: 'draft',
        title: 'Eye Care Preview',
        excerpt: 'Preview excerpt',
        content_html: '<p>Preview body</p>',
        seo_title: 'Eye Care SEO',
        seo_description: 'SEO description',
        created_at: '2026-07-22T00:00:00Z',
      },
      published_version: null,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse([blog]))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: detail }));
    vi.stubGlobal('fetch', fetchMock);
    render(<BlogsPage />);

    await screen.findByText('Eye Care');
    await user.click(screen.getByRole('button', { name: 'Preview Eye Care' }));

    expect(await screen.findByText('Admin Article Preview')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Eye Care Preview' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/blogs/7'), expect.objectContaining({ method: 'GET' }));
  });});
