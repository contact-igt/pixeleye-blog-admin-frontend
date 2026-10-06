import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelatedBlogsPicker } from './related-blogs-picker';
import { CustomTemplateBlockEditor, findRelatedBlogsSettings } from './custom-template-block-editor';
import { createDefaultBlogBlocks } from '@/types/blog-blocks';

const listBlogs = vi.fn();
vi.mock('@/services/blog.service', () => ({ listBlogs: (...args: unknown[]) => listBlogs(...args) }));

const item = (id: string, title: string) => ({ id, title, slug: title.toLowerCase(), status: 'published', published_at: '2026-09-01T00:00:00Z' });

beforeEach(() => {
  listBlogs.mockResolvedValue({ items: [item('1', 'Current blog'), item('2', 'Glaucoma guide'), item('3', 'Cataract surgery types'), item('4', 'Dry eye relief')] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function Harness({ max = 2, initial = [] as string[] }) {
  const [ids, setIds] = useState<string[]>(initial);
  return <><RelatedBlogsPicker value={ids} onChange={setIds} max={max} currentBlogId="1" /><output>{JSON.stringify(ids)}</output></>;
}

describe('RelatedBlogsPicker', () => {
  it('asks for published blogs and never offers the blog being edited', async () => {
    render(<Harness />);
    expect(await screen.findByText('Glaucoma guide')).toBeInTheDocument();
    expect(listBlogs).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
    expect(screen.queryByText('Current blog')).not.toBeInTheDocument();
  });

  it('keeps the picked order and enforces the maximum', async () => {
    const user = userEvent.setup();
    render(<Harness max={2} />);
    await user.click(await screen.findByLabelText(/Dry eye relief/));
    await user.click(screen.getByLabelText(/Glaucoma guide/));
    expect(screen.getByText('["4","2"]')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByLabelText(/Cataract surgery types/)).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remove Dry eye relief' }));
    expect(screen.getByText('["2"]')).toBeInTheDocument();
    expect(screen.getByLabelText(/Cataract surgery types/)).toBeEnabled();
  });

  it('filters by search text', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByText('Glaucoma guide');
    await user.type(screen.getByLabelText('Search published blogs'), 'cataract');
    expect(screen.getByText('Cataract surgery types')).toBeInTheDocument();
    expect(screen.queryByText('Glaucoma guide')).not.toBeInTheDocument();
  });

  it('shows a retry when the list cannot be loaded', async () => {
    listBlogs.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<Harness />);
    expect(await screen.findByText('Published blogs could not be loaded.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Glaucoma guide')).toBeInTheDocument());
  });
});

describe('Related Blogs section in the Custom Template blog editor', () => {
  const layout = (mode: string, enabled = true) => ({
    schemaVersion: 1 as const,
    layoutId: 'rr',
    metadata: { name: 'RR', description: 'Test.' },
    page: { contentWidth: 'full' as const, background: 'white' as const, spacing: 'normal' as const, typography: 'editorial' as const },
    sections: [{
      id: 'sec', layout: 'content_sidebar' as const, responsiveStrategy: 'sidebar_below_on_tablet' as const, enabled: true,
      slots: [
        { id: 'main', name: 'Main', components: [] },
        { id: 'side', name: 'Sidebar', components: [{ id: 'rr', componentKey: 'recent_related_blogs' as const, enabled, settings: { heading: '', mode: mode as 'tabs', maxItems: 3, showImage: true, showDate: true } }] }
      ]
    }]
  });

  it('is offered for tabs/related modes (capped by the component maximum) but not for recent-only or disabled components', () => {
    expect(findRelatedBlogsSettings(layout('tabs'))).toEqual({ maxItems: 3 });
    expect(findRelatedBlogsSettings(layout('related'))).toEqual({ maxItems: 3 });
    expect(findRelatedBlogsSettings(layout('recent'))).toBeNull();
    expect(findRelatedBlogsSettings(layout('tabs', false))).toBeNull();
  });

  it('stores the picks on blocks_json.related_blog_ids', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomTemplateBlockEditor layoutConfig={layout('tabs')} value={createDefaultBlogBlocks()} onChange={onChange} currentBlogId="1" />);
    expect(screen.getByText('Related Blogs')).toBeInTheDocument();
    await user.click(await screen.findByLabelText(/Glaucoma guide/));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ related_blog_ids: ['2'] }));
  });

  it('does not show the picker for a recent-only component', () => {
    render(<CustomTemplateBlockEditor layoutConfig={layout('recent')} value={createDefaultBlogBlocks()} onChange={() => undefined} currentBlogId="1" />);
    expect(screen.queryByText('Related Blogs')).not.toBeInTheDocument();
  });
});
