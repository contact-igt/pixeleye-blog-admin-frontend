import type { BlogBlocksDocument, CustomBlockInstanceContent } from '@/types/blog-blocks';
import { createDefaultCustomInstanceContent } from '@/types/blog-blocks';
import type { CustomTemplateLayoutConfigV1 } from './custom-template.types';
import { getComponentDefinition, isRegisteredComponentKey } from './component-registry';

export const sampleFrontendCustomTemplateConfig: CustomTemplateLayoutConfigV1 = {
  schemaVersion: 1,
  layoutId: 'frontend_sample_custom_layout_v1',
  metadata: {
    name: 'Sample Eye Care Custom Template',
    description: 'An internal frontend sample layout configuration for testing.'
  },
  page: {
    contentWidth: 'standard',
    background: 'white',
    spacing: 'normal',
    typography: 'editorial'
  },
  sections: [
    {
      id: 'sec-hero',
      layout: 'full_width',
      responsiveStrategy: 'stack_on_mobile',
      enabled: true,
      background: 'white',
      slots: [
        {
          id: 'slot-hero',
          name: 'Hero Slot',
          components: [
            {
              id: 'comp-hero-1',
              componentKey: 'hero',
              blockId: 'hero',
              settings: {
                height: 'standard',
                alignment: 'left',
                overlay: 'medium'
              },
              enabled: true
            }
          ]
        }
      ]
    },
    {
      id: 'sec-body',
      layout: 'content_sidebar',
      responsiveStrategy: 'sidebar_below_on_tablet',
      enabled: true,
      background: 'white',
      slots: [
        {
          id: 'slot-main',
          name: 'Main Content Slot',
          components: [
            {
              id: 'comp-takeaways-1',
              componentKey: 'key_takeaways',
              blockId: 'key_takeaways',
              settings: {
                variant: 'soft',
                columns: 'one'
              },
              enabled: true
            },
            {
              id: 'comp-body-1',
              componentKey: 'rich_article_content',
              blockId: 'article_content',
              settings: {
                fontSize: 'medium',
                lineHeight: 'relaxed'
              },
              enabled: true
            },
            {
              id: 'comp-disclaimer-1',
              componentKey: 'medical_disclaimer',
              blockId: 'disclaimer',
              settings: {
                variant: 'standard'
              },
              enabled: true
            }
          ]
        },
        {
          id: 'slot-sidebar',
          name: 'Sidebar Slot',
          components: [
            {
              id: 'comp-toc-1',
              componentKey: 'article_table_of_contents',
              settings: {
                headingLevels: [2, 3, 4],
                sticky: true
              },
              enabled: true
            }
          ]
        }
      ]
    }
  ]
};

export const sampleFrontendBlocksDoc: BlogBlocksDocument = {
  schema_version: 1,
  blocks: {
    hero: { category: 'Vision Care', breadcrumb: ['Home', 'Eye Health'], reviewer: { name: 'Dr. Nair', credentials: 'MD' }, reading_time_minutes: 5 },
    key_takeaways: { enabled: true, heading: 'Key Takeaways', items: ['Regular checks protect vision.', 'Early diagnosis improves outcomes.'] },
    image_comparison: { enabled: false, heading: '', items: [] },
    numbered_list: { enabled: false, heading: '', items: [] },
    expert_quote: { enabled: false, quote: '', name: '', role: '', media_id: null, profile_url: '' },
    medical_cta: { enabled: false, heading: '', description: '', primary: { label: '', url: '' }, secondary: { label: '', url: '' } },
    faq: { enabled: false, heading: '', items: [] },
    feedback: { enabled: true, prompt: 'Was this helpful?' },
    share: { enabled: true },
    disclaimer: { enabled: true, text: 'Medical information is for educational purposes only.' }
  },
  custom_instances: {
    hero: { componentKey: 'hero', category: 'Vision Care', breadcrumb: ['Home', 'Eye Health'], reviewer: { name: 'Dr. Nair', credentials: 'MD' }, reading_time_minutes: 5 },
    key_takeaways: { componentKey: 'key_takeaways', enabled: true, heading: 'Key Takeaways', items: ['Regular checks protect vision.', 'Early diagnosis improves outcomes.'] },
    disclaimer: { componentKey: 'medical_disclaimer', enabled: true, text: 'Medical information is for educational purposes only.' }
  }
};

/**
 * The template builder's Live Preview has no real article content to show — it only has
 * whatever blocks a fixed sample doc happens to define. Any content component the admin adds
 * on the canvas gets a freshly generated blockId that the static sample can never contain, so
 * validation would fail on every new block. This synthesizes a preview-only blocks doc that
 * guarantees a (sample or default) instance for every content component actually in the layout.
 */
export function buildPreviewBlocksDoc(layout: CustomTemplateLayoutConfigV1): BlogBlocksDocument {
  const customInstances = { ...sampleFrontendBlocksDoc.custom_instances };

  for (const section of layout.sections) {
    for (const slot of section.slots) {
      for (const component of slot.components) {
        if (!isRegisteredComponentKey(component.componentKey)) continue;
        const def = getComponentDefinition(component.componentKey);
        if (def.category !== 'content' || def.requiredBlockKey === 'article_content') continue;
        const blockId = (component as { blockId?: string }).blockId;
        if (!blockId || customInstances[blockId]) continue;
        customInstances[blockId] = createDefaultCustomInstanceContent(component.componentKey as CustomBlockInstanceContent['componentKey']);
      }
    }
  }

  return { ...sampleFrontendBlocksDoc, custom_instances: customInstances };
}
