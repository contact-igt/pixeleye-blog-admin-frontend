import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlogDetail, BlogVersion } from '@/types/blog';
import { createDefaultBlogBlocks } from '@/types/blog-blocks';
import { BlogForm } from './blog-form';

const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock, refresh: refreshMock }) }));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => ({ admin: { id: '1', name: 'Admin', role: 'editor' } }) }));

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function component(componentKey: string, blockId: string, id: string) {
  const settings = componentKey === 'key_takeaways'
    ? { variant: 'soft', columns: 'one' }
    : componentKey === 'numbered_list'
      ? { style: 'circle' }
      : { layout: 'accordion', defaultOpen: 'first' };
  return { id, componentKey, blockId, enabled: true, settings };
}

function layout(layoutId: string, components: Array<Record<string, unknown>>) {
  return {
    schemaVersion: 1,
    layoutId,
    metadata: { name: layoutId, description: '' },
    page: { contentWidth: 'standard', background: 'white', spacing: 'normal', typography: 'editorial' },
    sections: [{
      id: `${layoutId}-section`,
      layout: 'full_width',
      responsiveStrategy: 'stack_on_mobile',
      enabled: true,
      background: 'white',
      slots: [{ id: `${layoutId}-slot`, name: 'Main', components }]
    }]
  };
}

const layoutA = layout('layout-a', [
  component('key_takeaways', 'shared_takeaways', 'a-shared'),
  component('numbered_list', 'only_a', 'a-numbered')
]);
const layoutB = layout('layout-b', [
  component('key_takeaways', 'shared_takeaways', 'b-shared'),
  component('faq', 'only_b', 'b-faq')
]);

function templateList() {
  return jsonResponse([
    { key: 'template_1', version: 2, name: 'Template 1', description: '', layout: 'single_column' },
    { key: 'template_2', version: 1, name: 'Template 2', description: '', layout: 'article_sidebar' }
  ]);
}

function customTemplateList(currentVersionId = '30', versionNumber = 1) {
  return jsonResponse({
    items: [
      { id: '12', name: 'Custom A', status: 'active', current_version: { id: currentVersionId, version_number: versionNumber }, owner: { id: '1', name: 'Admin' } },
      { id: '13', name: 'Custom B', status: 'active', current_version: { id: '40', version_number: 1 }, owner: { id: '1', name: 'Admin' } }
    ],
    pagination: { page: 1, limit: 100, total_items: 2, total_pages: 1, has_next_page: false, has_previous_page: false }
  });
}

function customDetail(id: '12' | '13', currentLayout: unknown, versionId: string, versionNumber: number) {
  return jsonResponse({
    id,
    name: id === '12' ? 'Custom A' : 'Custom B',
    status: 'active',
    current_version: { id: versionId, version_number: versionNumber },
    current_version_detail: { id: versionId, version_number: versionNumber, layout_config_json: currentLayout }
  });
}

function emptyMediaList() {
  return jsonResponse({ items: [], pagination: { page: 1, limit: 12, total_items: 0, total_pages: 0, has_next_page: false, has_previous_page: false } });
}

function version(overrides: Partial<BlogVersion>): BlogVersion {
  return {
    id: '10',
    version_number: 1,
    version_type: 'draft',
    title: 'Frozen custom article',
    excerpt: 'A saved excerpt',
    content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Saved content' }] }] },
    content_html: '<p>Saved content</p>',
    blocks_json: createDefaultBlogBlocks(),
    featured_media_id: null,
    template_key: 'custom_template',
    template_version: 1,
    template: { key: 'custom_template', version: 1, name: 'Custom Template', layout: 'single_column' },
    custom_template_id: '12',
    custom_template_version_id: '30',
    template_config_json: layoutA,
    created_at: '2026-07-29T00:00:00Z',
    ...overrides
  };
}

function customBlog(): BlogDetail {
  const blocks = createDefaultBlogBlocks();
  blocks.custom_instances = {
    shared_takeaways: { componentKey: 'key_takeaways', enabled: true, heading: 'Saved takeaways', items: ['Keep this'] },
    only_a: { componentKey: 'numbered_list', enabled: true, heading: 'A only', items: [{ title: 'A', description: 'A' }] }
  };
  return {
    id: '7',
    title: 'Frozen custom article',
    slug: 'frozen-custom-article',
    excerpt: 'A saved excerpt',
    status: 'published',
    previous_status: null,
    featured_media: null,
    author: { id: '1', name: 'Admin' },
    published_at: '2026-07-29T00:00:00Z',
    updated_at: '2026-07-29T00:00:00Z',
    created_at: '2026-07-29T00:00:00Z',
    has_unpublished_changes: false,
    draft_version: version({ blocks_json: blocks }),
    published_version: version({ id: '9', version_type: 'published', blocks_json: blocks })
  };
}

describe('BlogForm Custom Template switching and upgrades', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    replaceMock.mockReset();
    refreshMock.mockReset();
  });

  it('cancels A to B without changing layout, then loads B immediately and preserves compatible content', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates/12')) return customDetail('12', layoutA, '30', 1);
      if (url.includes('/custom-templates/13')) return customDetail('13', layoutB, '40', 1);
      if (url.includes('/custom-templates')) return customTemplateList();
      if (url.includes('/media/assets')) return emptyMediaList();
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<BlogForm />);

    await user.click(await screen.findByRole('radio', { name: /Custom A/ }));
    expect(screen.getByText(/Changing the Custom Template updates this Blog/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change Template' }));
    const takeawayDetails = (await screen.findByText('Key Takeaways')).closest('details');
    expect(takeawayDetails).not.toBeNull();
    await user.click(within(takeawayDetails!).getByRole('checkbox', { name: 'Enable' }));
    const sharedHeading = within(takeawayDetails!).getByLabelText('Heading');
    await user.clear(sharedHeading);
    await user.type(sharedHeading, 'Preserved heading');
    expect(screen.getByText('Numbered List')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Custom B/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('radio', { name: /Custom A/ })).toBeChecked();
    expect(screen.getByText('Numbered List')).toBeInTheDocument();
    expect(screen.queryByText('Frequently Asked Questions')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Custom B/ }));
    await user.click(screen.getByRole('button', { name: 'Change Template' }));
    expect(await screen.findByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.queryByText('Numbered List')).not.toBeInTheDocument();
    const preservedDetails = screen.getByText('Key Takeaways').closest('details');
    expect(within(preservedDetails!).getByLabelText('Heading')).toHaveValue('Preserved heading');
  });

  it('keeps the frozen version on load and upgrades only after explicit confirmation', async () => {
    const original = customBlog();
    const upgraded = {
      ...original,
      draft_version: version({ custom_template_version_id: '31', template_config_json: layoutB, blocks_json: original.draft_version?.blocks_json })
    };
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/blogs/templates')) return templateList();
      if (url.includes('/custom-templates/12')) return customDetail('12', layoutB, '31', 4);
      if (url.includes('/custom-templates')) return customTemplateList('31', 4);
      if (url.includes('/media/assets')) return emptyMediaList();
      if (url.endsWith('/blogs/7/upgrade-custom-template') && init?.method === 'POST') return jsonResponse(upgraded);
      return jsonResponse(original);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<BlogForm blog={original} />);

    expect(await screen.findByText('Numbered List')).toBeInTheDocument();
    const upgradeButton = await screen.findByRole('button', { name: 'Upgrade to v4' });
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('upgrade-custom-template'))).toBe(false);
    await user.click(upgradeButton);
    expect(screen.getByText('Upgrade Custom Template Version?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upgrade Draft' }));

    await waitFor(() => expect(fetchMock.mock.calls.some((call) =>
      String(call[0]).endsWith('/blogs/7/upgrade-custom-template') && call[1]?.method === 'POST'
    )).toBe(true));
    expect(await screen.findByText(/Custom Template upgraded to version 4/)).toBeInTheDocument();
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(original.published_version?.custom_template_version_id).toBe('30');
  });
});
