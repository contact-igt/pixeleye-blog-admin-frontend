import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MediaPage from './page';

const replaceMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => ({ admin: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' } }));
let query = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/media',
  useSearchParams: () => new URLSearchParams(query)
}));

vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => authMock }));

const media = { id: '1', purpose: 'hero', alt_text: 'Alt', original_file_name: 'hero.jpg', storage_provider: 'cloudflare_r2', original_url: 'https://media.example.com/original.webp', variants: { thumbnail: { url: 'https://media.example.com/thumb.webp', width: 200, height: 200, size_bytes: 100, mime_type: 'image/webp' }, content: { url: 'https://media.example.com/content.webp', width: 800, height: 600, size_bytes: 200, mime_type: 'image/webp' } }, width: 800, height: 600, file_size: 2048, output_mime_type: 'image/webp', status: 'active', uploaded_by: { id: '1', name: 'Admin' }, created_at: '2026-07-22T00:00:00Z', updated_at: '2026-07-22T00:00:00Z' };
const trashedMedia = { ...media, status: 'trashed', trashed_by: { id: '1', name: 'Admin' }, trashed_at: '2026-07-22T00:00:00Z', purge_after: '2026-08-21T00:00:00Z', days_remaining: 30 };
const deleteFailedMedia = { ...trashedMedia, id: '3', original_file_name: 'failed.jpg', status: 'delete_failed', delete_failure: 'Cloudflare R2 delete failed' };

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'Content-Type': 'application/json' } });
}

function listResponse(items: unknown[]) {
  return jsonResponse({ success: true, data: { items, pagination: { page: 1, limit: 24, total_items: items.length, total_pages: items.length ? 1 : 0, has_next_page: false, has_previous_page: false } } });
}

describe('MediaPage', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); replaceMock.mockReset(); authMock.admin = { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' }; query = ''; });

  it('renders active media list and opens preview', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([media])));
    render(<MediaPage />);

    expect(screen.getByText('Media Library')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active Media' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trash' })).toBeInTheDocument();
    await screen.findByText('hero.jpg');
    expect(screen.getByRole('button', { name: /Edit/ })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /^View$/ }));
    expect(screen.getByRole('dialog', { name: /Media Asset Details/ })).toBeInTheDocument();
  });

  it('lists trash media with retention details and delete-failed retry state', async () => {
    query = 'tab=trash';
    const fetchMock = vi.fn().mockResolvedValue(listResponse([trashedMedia, deleteFailedMedia]));
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPage />);

    await screen.findByText('hero.jpg');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/media/assets/trash?'), expect.anything());
    expect(screen.getAllByText(/30 days left/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Delete failed:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry delete/ })).toBeInTheDocument();
  });

  it('shows empty and API error states', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(listResponse([])));
    render(<MediaPage />);
    await screen.findByText('No media assets found');
    cleanup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<MediaPage />);
    await screen.findByRole('alert');
  });

  it('debounces search and resets page', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { items: [], pagination: { page: 2, limit: 24, total_items: 0, total_pages: 0, has_next_page: false, has_previous_page: true } } })));
    query = 'page=2';
    render(<MediaPage />);
    fireEvent.change(screen.getByLabelText('Search media'), { target: { value: 'eye' } });
    await vi.advanceTimersByTimeAsync(450);
    expect(replaceMock).toHaveBeenCalledWith('/media?page=1&search=eye');
  });

  it('hides upload, trash and permanent delete controls for viewer role', async () => {
    authMock.admin = { id: '9', name: 'Viewer', email: 'viewer@example.com', role: 'viewer' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([media])));
    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    expect(screen.queryByRole('button', { name: /Upload Image/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move hero.jpg to trash/ })).not.toBeInTheDocument();
    cleanup();
    query = 'tab=trash';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([trashedMedia])));
    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    expect(screen.queryByRole('button', { name: /Delete hero.jpg/ })).not.toBeInTheDocument();
  });

  it('uploads, reloads the canonical list, and moves media to trash with confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const uploadedMedia = { ...media, id: '2', original_file_name: 'uploaded-hero.jpg' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse([media]))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: uploadedMedia }, { status: 201 }))
      .mockResolvedValueOnce(listResponse([uploadedMedia, media]))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...media, status: 'trashed' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: /Upload Image/ }));
    await user.upload(screen.getByLabelText(/Image file/), new File(['abc'], 'hero.png', { type: 'image/png' }));
    await user.click(screen.getAllByRole('button', { name: /^Upload image$/i }).at(-1)!);
    await screen.findByText('Image uploaded successfully.');
    await screen.findByText('uploaded-hero.jpg');
    expect(screen.queryByRole('dialog', { name: /Upload Media Asset/ })).not.toBeInTheDocument();
    const uploadBody = fetchMock.mock.calls[1][1].body as FormData;
    expect(uploadBody.get('purpose')).toBe('hero');
    expect(uploadBody.get('client_id')).toMatch(/^\d{19}$/);
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('/media/assets?page=1&limit=24&sort_by=created_at&sort_order=desc'), expect.anything());
    await user.click(screen.getByRole('button', { name: /Move hero.jpg to trash/ }));
    expect(screen.getByText('Move media asset to Trash?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Move to Trash$/ }));
    await screen.findByText('Media asset moved to Trash and can be restored.');
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/media/assets/1'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('resets list filters after upload so the new media is visible after refresh', async () => {
    query = 'page=2&search=old&purpose=card&sort_order=asc';
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse([media]))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...media, id: '2', original_file_name: 'uploaded-hero.jpg' } }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: /Upload Image/ }));
    await user.upload(screen.getByLabelText(/Image file/), new File(['abc'], 'hero.png', { type: 'image/png' }));
    await user.click(screen.getAllByRole('button', { name: /^Upload image$/i }).at(-1)!);

    await screen.findByText('Image uploaded successfully.');
    expect(replaceMock).toHaveBeenCalledWith('/media?page=1');
  });

  it('keeps the modal open and shows a precise storage failure', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse([media]))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'Cloudflare R2 upload failed' }, { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: /Upload Image/ }));
    await user.upload(screen.getByLabelText(/Image file/), new File(['abc'], 'hero.png', { type: 'image/png' }));
    await user.click(screen.getAllByRole('button', { name: /^Upload Image$/i }).at(-1)!);

    await screen.findByText('The image could not be stored. Please try again.');
    expect(screen.getByRole('dialog', { name: /Upload Media Asset/ })).toBeInTheDocument();
  });

  it('disables upload while pending and sends only one POST on duplicate click', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    let resolveUpload: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse([media]))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveUpload = resolve; }))
      .mockResolvedValueOnce(listResponse([media]));
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: /Upload Image/ }));
    await user.upload(screen.getByLabelText(/Image file/), new File(['abc'], 'hero.png', { type: 'image/png' }));
    const uploadButton = screen.getAllByRole('button', { name: /^Upload Image$/i }).at(-1)!;
    await user.click(uploadButton);
    const pendingButton = await screen.findByRole('button', { name: /Uploading/ });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    resolveUpload?.(jsonResponse({ success: true, data: media }, { status: 201 }));
    await screen.findByText('Image uploaded successfully.');
  });

  it('restores trashed media', async () => {
    query = 'tab=trash';
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse([trashedMedia]))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...trashedMedia, status: 'active' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: /Restore/ }));
    expect(screen.getByText('Restore media asset?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore media' }));
    await screen.findByText('Media asset restored.');
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/media/assets/1/restore'), expect.objectContaining({ method: 'POST' }));
  });

  it('permanently deletes trashed media with confirmation', async () => {
    query = 'tab=trash';
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse([trashedMedia]))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...trashedMedia, status: 'deleted', deleted_object_count: 2 } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPage />);
    await screen.findByText('hero.jpg');
    await user.click(screen.getByRole('button', { name: 'Delete hero.jpg' }));
    expect(screen.getByText('Permanently delete media asset?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByText('Media asset permanently deleted.');
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/media/assets/1/permanent'), expect.objectContaining({ method: 'DELETE' }));
  });
});

