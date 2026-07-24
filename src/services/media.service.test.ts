import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from './auth-token';
import { deleteMediaAsset, getMediaAsset, listMediaAssets, listTrashedMediaAssets, uploadMediaAsset } from './media.service';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'Content-Type': 'application/json' } });
}

const media = { id: '1', purpose: 'hero', alt_text: 'Alt', original_file_name: 'hero.jpg', storage_provider: 'cloudflare_r2', original_url: 'https://media.example.com/hero.webp', variants: {}, width: 100, height: 80, file_size: 500, output_mime_type: 'image/webp', status: 'active', uploaded_by: { id: '1', name: 'Admin' }, created_at: '2026-07-22T00:00:00Z', updated_at: '2026-07-22T00:00:00Z' };

describe('media service', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); clearAccessToken(); });

  it('lists media with typed query parameters', async () => {
    setAccessToken('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { items: [media], pagination: { page: 1, limit: 24, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listMediaAssets({ search: 'hero', purpose: 'hero' })).resolves.toMatchObject({ items: [expect.objectContaining({ id: '1' })] });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/media/assets?search=hero&purpose=hero');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
    expect((fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')).toBe('Bearer token');
  });


  it('requests the static trash listing endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { items: [], pagination: { page: 1, limit: 24, total_items: 0, total_pages: 0, has_next_page: false, has_previous_page: false } } }));
    vi.stubGlobal('fetch', fetchMock);

    await listTrashedMediaAssets({ page: 1 });

    expect(String(fetchMock.mock.calls[0][0])).toContain('/media/assets/trash?page=1');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('/media/assets/trash/');
  });
  it('gets, uploads and deletes media through canonical endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: media }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: media }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: '1', status: 'deleted' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getMediaAsset('1');
    await uploadMediaAsset(new FormData());
    await deleteMediaAsset('1');

    expect(String(fetchMock.mock.calls[0][0])).toContain('/media/assets/1');
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  });
});

