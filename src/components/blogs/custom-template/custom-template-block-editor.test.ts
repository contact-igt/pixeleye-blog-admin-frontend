import { describe, expect, it } from 'vitest';
import { sampleFrontendCustomTemplateConfig } from './custom-template-sample';
import { collectEditableInstances } from './custom-template-block-editor';

describe('collectEditableInstances', () => {
  it('excludes disabled sections, disabled components, rich global content, system, and structural placements', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.sections[0].enabled = false;
    layout.sections[1].slots[0].components[0].enabled = false;
    expect(collectEditableInstances(layout).map((instance) => instance.componentKey)).toEqual(['medical_disclaimer']);
  });

  it('deduplicates malformed repeated block IDs defensively', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.sections[1].slots[0].components.push({
      id: 'comp-copy', componentKey: 'key_takeaways', blockId: 'key_takeaways', enabled: true,
      settings: { variant: 'soft', columns: 'one' }
    });
    expect(collectEditableInstances(layout).filter((instance) => instance.blockId === 'key_takeaways')).toHaveLength(1);
  });

  it('includes enabled sidebar content while excluding Newsletter, structural, and global article placements', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.sections[1].slots[0].components.push(
      { id: 'spacer', componentKey: 'spacer', enabled: true, settings: { size: 'medium' } },
      { id: 'divider', componentKey: 'divider', enabled: true, settings: { style: 'solid' } }
    );
    layout.sections[1].slots[1].components.push(
      { id: 'quote', componentKey: 'expert_quote', blockId: 'sidebar_quote', enabled: true, settings: { orientation: 'stacked', background: 'soft' } },
      { id: 'newsletter', componentKey: 'newsletter_card', enabled: true, settings: { heading: 'Updates', description: 'News', buttonLabel: 'Join' } }
    );

    const instances = collectEditableInstances(layout);
    expect(instances.map((instance) => instance.blockId)).toEqual(['hero', 'key_takeaways', 'disclaimer', 'sidebar_quote']);
    expect(instances.find((instance) => instance.blockId === 'sidebar_quote')?.label).toBe('Expert Quote');
    expect(instances.some((instance) => ['article_content', 'newsletter', 'spacer', 'divider'].includes(instance.blockId))).toBe(false);
  });
});
