import { describe, expect, it } from 'vitest';
import { createDefaultBlogBlocks } from '@/types/blog-blocks';
import { sampleFrontendCustomTemplateConfig } from './custom-template-sample';
import { collectActiveContentReferences, reconcileCustomTemplateBlocks } from './custom-template-reconciliation';

function cloneLayout() {
  return JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
}

describe('Custom Template Blog block reconciliation', () => {
  it('collects only enabled Blog-editable placements', () => {
    const layout = cloneLayout();
    layout.sections[1].slots[0].components[0].enabled = false;
    const refs = collectActiveContentReferences(layout);
    expect(refs.map((reference) => reference.blockId)).toEqual(['hero', 'disclaimer']);
  });

  it('preserves matching content, initializes missing blocks, and keeps orphans in Drafts', () => {
    const layout = cloneLayout();
    const blocks = createDefaultBlogBlocks();
    blocks.custom_instances = {
      hero: { componentKey: 'hero', category: 'Retina', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: 4 },
      old_faq: { componentKey: 'faq', enabled: true, heading: 'Old FAQ', items: [{ question: 'Q', answer: 'A' }] }
    };
    const result = reconcileCustomTemplateBlocks(layout, blocks, { keepOrphans: true });
    expect(result.document.custom_instances?.hero).toMatchObject({ componentKey: 'hero', category: 'Retina' });
    expect(result.document.custom_instances?.key_takeaways?.componentKey).toBe('key_takeaways');
    expect(result.document.custom_instances?.old_faq?.componentKey).toBe('faq');
    expect(result.orphanBlockIds).toContain('old_faq');
  });

  it('removes orphan recovery data from the published snapshot', () => {
    const layout = cloneLayout();
    const blocks = createDefaultBlogBlocks();
    blocks.custom_instances = { old_faq: { componentKey: 'faq', enabled: false, heading: '', items: [] } };
    const result = reconcileCustomTemplateBlocks(layout, blocks, { keepOrphans: false });
    expect(result.document.custom_instances).not.toHaveProperty('old_faq');
  });

  it('initializes repeated Rich Article Content custom instances', () => {
    const layout = cloneLayout();
    layout.sections[1].slots[0].components.push({
      id: 'article-extra',
      componentKey: 'rich_article_content',
      blockId: 'article_extra',
      enabled: true,
      settings: { fontSize: 'medium', lineHeight: 'relaxed' }
    });
    const result = reconcileCustomTemplateBlocks(layout, createDefaultBlogBlocks());
    expect(result.document.custom_instances?.article_extra).toMatchObject({ componentKey: 'rich_article_content', html: '' });
  });

  it('initializes Image Comparison with editable before and after rows', () => {
    const layout = cloneLayout();
    layout.sections[1].slots[0].components.push({
      id: 'comparison',
      componentKey: 'image_comparison',
      blockId: 'comparison',
      enabled: true,
      settings: { columns: 'two', imageRatio: 'landscape' }
    });

    const result = reconcileCustomTemplateBlocks(layout, createDefaultBlogBlocks());

    expect(result.document.custom_instances?.comparison).toMatchObject({
      componentKey: 'image_comparison',
      enabled: true,
      heading: 'Treatment Comparison',
      items: [
        { media_id: null, title: 'Before Treatment', description: '' },
        { media_id: null, title: 'After Treatment', description: '' }
      ]
    });
  });
});
