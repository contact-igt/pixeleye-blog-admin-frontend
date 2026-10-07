import { describe, expect, it } from 'vitest';
import { normalizeCustomTemplateSettings } from './custom-template-settings';

describe('normalizeCustomTemplateSettings', () => {
  it('reserves article_content for the first Rich Article Content placement', () => {
    const config = {
      page: {},
      sections: [{
        id: 'section-main', layout: 'full_width', slots: [{ id: 'slot-main', components: [
          { id: 'article-main', componentKey: 'rich_article_content', blockId: 'legacy_article_id', settings: {} },
          { id: 'article-extra', componentKey: 'rich_article_content', blockId: 'article_extra', settings: {} }
        ] }]
      }]
    };

    const components = (normalizeCustomTemplateSettings(config) as any).sections[0].slots[0].components;
    expect(components.map((component: any) => component.blockId)).toEqual(['article_content', 'article_extra']);
  });
});
