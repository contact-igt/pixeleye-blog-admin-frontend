import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from './auth-token';
import { createBlog, getBlog, listBlogTemplates, listBlogs, listTrashedBlogs, moveBlogToTrash, publishBlog, restoreBlog, unpublishBlog, updateBlog, upgradeBlogCustomTemplate } from './blog.service';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'Content-Type': 'application/json' } });
}

const blog = { id: '7', title: 'Eye Care', slug: 'eye-care', excerpt: 'Excerpt', status: 'draft', previous_status: null, featured_media: null, author: { id: '1', name: 'Admin' }, published_at: null, updated_at: '2026-07-22T00:00:00Z', created_at: '2026-07-22T00:00:00Z', has_unpublished_changes: false, draft_version: null, published_version: null };
const list = { items: [blog], pagination: { page: 1, limit: 20, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } };

describe('blog service', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); clearAccessToken(); });

  it('lists active and trashed blogs through canonical endpoints', async () => {
    setAccessToken('token');
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ success: true, data: list })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listBlogs({ search: 'eye', status: 'draft', page: 2 })).resolves.toMatchObject({ items: [expect.objectContaining({ id: '7' })] });
    await listTrashedBlogs({ page: 1 });

    expect(String(fetchMock.mock.calls[0][0])).toContain('/blogs?search=eye&status=draft&page=2');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/blogs/trash?page=1');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
    expect((fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')).toBe('Bearer token');
  });

  it('creates, reads, updates and changes publication lifecycle', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ success: true, data: blog })));
    vi.stubGlobal('fetch', fetchMock);

    await listBlogTemplates();
    await createBlog({ title: 'Eye Care' });
    await getBlog('7');
    await updateBlog('7', { title: 'Eye Care Updated' });
    await upgradeBlogCustomTemplate('7');
    await publishBlog('7');
    await unpublishBlog('7');
    await moveBlogToTrash('7');
    await restoreBlog('7');

    expect(fetchMock.mock.calls.map((call) => [String(call[0]), call[1].method])).toEqual([
      [expect.stringContaining('/blogs/templates'), 'GET'],
      [expect.stringContaining('/blogs'), 'POST'],
      [expect.stringContaining('/blogs/7'), 'GET'],
      [expect.stringContaining('/blogs/7'), 'PATCH'],
      [expect.stringContaining('/blogs/7/upgrade-custom-template'), 'POST'],
      [expect.stringContaining('/blogs/7/publish'), 'POST'],
      [expect.stringContaining('/blogs/7/unpublish'), 'POST'],
      [expect.stringContaining('/blogs/7'), 'DELETE'],
      [expect.stringContaining('/blogs/7/restore'), 'POST']
    ]);
  });
});
