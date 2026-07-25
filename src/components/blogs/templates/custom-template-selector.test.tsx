import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomTemplateSelector } from './custom-template-selector';
import type { CustomTemplateSummary } from '@/types/custom-templates';

function response(data: unknown) { return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }

const activeTemplate: CustomTemplateSummary = {
  id: '30', name: 'Healthcare Layout', description: null, status: 'active', status_before_archive: null,
  owner: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'super_admin' },
  current_version: { id: '50', version_number: 2 }, schema_version: 1, lock_version: 2,
  activated_at: '2026-07-24T00:00:00Z', archived_at: null, restored_at: null,
  created_at: '2026-07-24T00:00:00Z', updated_at: '2026-07-24T00:00:00Z', usage: null
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('CustomTemplateSelector', () => {
  it('lists only active Custom Templates returned by the server and calls onChange on selection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [activeTemplate], pagination: { page: 1, limit: 100, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false } })));
    const change = vi.fn();
    const user = userEvent.setup();
    render(<CustomTemplateSelector value={null} onChange={change} />);
    const radios = await screen.findAllByRole('radio');
    expect(radios).toHaveLength(1);
    await user.click(screen.getByRole('radio', { name: /Healthcare Layout/ }));
    expect(change).toHaveBeenCalledWith('30', activeTemplate);
    const [, requestInit] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
    expect(String((fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]![0])).toContain('status=active');
    void requestInit;
  });

  it('shows an empty state when there are no active Custom Templates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [], pagination: { page: 1, limit: 100, total_items: 0, total_pages: 0, has_next_page: false, has_previous_page: false } })));
    render(<CustomTemplateSelector value={null} onChange={() => undefined} />);
    expect(await screen.findByText('No active Custom Templates are available yet.')).toBeInTheDocument();
  });

  it('shows an API error with retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Custom Templates offline')));
    render(<CustomTemplateSelector value={null} onChange={() => undefined} />);
    expect(await screen.findByText('Unable to connect to the backend API')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
