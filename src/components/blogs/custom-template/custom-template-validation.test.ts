import { describe, it, expect } from 'vitest';
import { validateFrontendCustomTemplateLayout } from './custom-template-validation';
import { sampleFrontendBlocksDoc, sampleFrontendCustomTemplateConfig } from './custom-template-sample';
import type { CustomTemplateLayoutConfigV1, CustomTemplateComponentInstance } from './custom-template.types';

function cloneSample(): CustomTemplateLayoutConfigV1 {
  return JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
}

function asComponent(value: Record<string, unknown>): CustomTemplateComponentInstance {
  return value as unknown as CustomTemplateComponentInstance;
}

function asMutable(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function makeComponent(overrides: Record<string, unknown> & { id: string }): Record<string, unknown> {
  return {
    componentKey: 'divider',
    enabled: true,
    settings: { style: 'solid' },
    ...overrides
  };
}

describe('validateFrontendCustomTemplateLayout - parity with backend', () => {
  it('accepts the sample config unmodified', () => {
    const result = validateFrontendCustomTemplateLayout(cloneSample());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a full_width section with more than one slot', () => {
    const layout = cloneSample();
    layout.sections[0].slots.push({ id: 'slot-extra', name: 'Extra', components: [] });
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('slots') && e.message.includes('exactly 1 slot'))).toBe(true);
  });

  it('rejects a content_sidebar section with the wrong slot count', () => {
    const layout = cloneSample();
    // sec-body is content_sidebar with 2 slots; remove one
    layout.sections[1].slots.pop();
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("exactly 2 slot"))).toBe(true);
  });

  it('rejects a two_column section with the wrong slot count', () => {
    const layout = cloneSample();
    layout.sections.push({
      id: 'sec-two-col',
      layout: 'two_column',
      responsiveStrategy: 'equal_columns',
      enabled: true,
      background: 'white',
      slots: [{ id: 'slot-only-one', name: 'Only', components: [] }]
    });
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("exactly 2 slot"))).toBe(true);
  });

  it('rejects a three_column section with the wrong slot count', () => {
    const layout = cloneSample();
    layout.sections.push({
      id: 'sec-three-col',
      layout: 'three_column',
      responsiveStrategy: 'three_to_two_to_one',
      enabled: true,
      background: 'white',
      slots: [
        { id: 'slot-tc-1', name: 'Col 1', components: [] },
        { id: 'slot-tc-2', name: 'Col 2', components: [] }
      ]
    });
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("exactly 3 slot"))).toBe(true);
  });

  it('rejects more than 20 sections', () => {
    const layout = cloneSample();
    layout.sections = [];
    for (let i = 0; i < 21; i++) {
      layout.sections.push({
        id: `sec-${i}`,
        layout: 'full_width',
        responsiveStrategy: 'stack_on_mobile',
        enabled: true,
        background: 'white',
        slots: [{ id: `slot-${i}`, name: 'Full', components: [] }]
      });
    }
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('exceeds maximum allowed (20)'))).toBe(true);
  });

  it('rejects more than 3 slots in a section', () => {
    const layout = cloneSample();
    layout.sections[1].slots.push(
      { id: 'slot-x1', name: 'Extra 1', components: [] },
      { id: 'slot-x2', name: 'Extra 2', components: [] }
    );
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('exceeds maximum allowed (3)'))).toBe(true);
  });

  it('rejects more than 10 components in a slot', () => {
    const layout = cloneSample();
    const slot = layout.sections[0].slots[0];
    slot.components = Array.from({ length: 11 }, (_, i) =>
      asComponent(makeComponent({ id: `comp-many-${i}`, componentKey: 'divider', settings: { style: 'solid' } }))
    );
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('exceeds maximum allowed per slot (10)'))).toBe(true);
  });

  it('rejects more than 60 total components', () => {
    const layout = cloneSample();
    layout.sections = [];
    for (let i = 0; i < 10; i++) {
      layout.sections.push({
        id: `sec-load-${i}`,
        layout: 'full_width',
        responsiveStrategy: 'stack_on_mobile',
        enabled: true,
        background: 'white',
        slots: [
          {
            id: `slot-load-${i}`,
            name: 'Full',
            components: Array.from({ length: 7 }, (_, j) => asComponent(makeComponent({ id: `comp-load-${i}-${j}` })))
          }
        ]
      });
    }
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Total components (70) exceeds maximum limit'))).toBe(true);
  });

  it('rejects a component placed in a disallowed zone', () => {
    const layout = cloneSample();
    // sidebar slot (slot-sidebar) only allows sidebar-zone-compatible components; faq is main/full only
    layout.sections[1].slots[1].components.push(
      asComponent(makeComponent({ id: 'comp-bad-zone', componentKey: 'faq', settings: { layout: 'accordion', defaultOpen: 'none' } }))
    );
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('not allowed in zone'))).toBe(true);
  });

  it('rejects a duplicate section ID', () => {
    const layout = cloneSample();
    layout.sections[1].id = layout.sections[0].id;
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate section ID'))).toBe(true);
  });

  it('rejects a duplicate slot ID', () => {
    const layout = cloneSample();
    layout.sections[1].slots[1].id = layout.sections[1].slots[0].id;
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate slot ID'))).toBe(true);
  });

  it('rejects a duplicate component ID', () => {
    const layout = cloneSample();
    layout.sections[1].slots[0].components[1].id = layout.sections[1].slots[0].components[0].id;
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate component ID'))).toBe(true);
  });

  it('rejects an unknown component key', () => {
    const layout = cloneSample();
    layout.sections[0].slots[0].components.push(
      asComponent(makeComponent({ id: 'comp-unknown', componentKey: 'not_a_real_component' }))
    );
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Unknown component key'))).toBe(true);
  });

  it('rejects invalid settings (bad enum value)', () => {
    const layout = cloneSample();
    asMutable(asMutable(layout.sections[0].slots[0].components[0]).settings).height = 'gigantic';
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('settings.height'))).toBe(true);
  });

  it('rejects settings with unsupported fields', () => {
    const layout = cloneSample();
    asMutable(asMutable(layout.sections[0].slots[0].components[0]).settings).extraField = 'nope';
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unsupported field'))).toBe(true);
  });

  it('rejects a non-content component that specifies a blockId', () => {
    const layout = cloneSample();
    asMutable(layout.sections[1].slots[1].components[0]).blockId = 'should-not-exist';
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('must not specify a blockId'))).toBe(true);
  });

  it('rejects a content component missing a blockId', () => {
    const layout = cloneSample();
    asMutable(layout.sections[0].slots[0].components[0]).blockId = '';
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('requires a blockId'))).toBe(true);
  });

  it('rejects an unknown top-level field', () => {
    const layout = asMutable(cloneSample());
    layout.unexpectedField = 'nope';
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unsupported field'))).toBe(true);
  });

  it('rejects an unknown section layout type', () => {
    const layout = cloneSample();
    asMutable(layout.sections[0]).layout = 'four_column';
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('.layout'))).toBe(true);
  });

  it('rejects an unknown responsive strategy', () => {
    const layout = cloneSample();
    asMutable(layout.sections[0]).responsiveStrategy = 'teleport';
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('.responsiveStrategy'))).toBe(true);
  });

  it('rejects duplicate non-sentinel block IDs with the first placement path', () => {
    const layout = cloneSample();
    layout.sections[0].slots[0].components.push(asComponent({
      id: 'comp-hero-copy', componentKey: 'hero', blockId: 'hero', enabled: true,
      settings: { height: 'standard', alignment: 'left', overlay: 'medium' }
    }));
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("Duplicate blockId 'hero'") && error.message.includes('First used at'))).toBe(true);
  });

  it('allows the intentional article_content sentinel on repeated Rich Article Content placements', () => {
    const layout = cloneSample();
    layout.sections[1].slots[0].components.push(asComponent({
      id: 'comp-article-copy', componentKey: 'rich_article_content', blockId: 'article_content', enabled: true,
      settings: { fontSize: 'medium', lineHeight: 'relaxed' }
    }));
    expect(validateFrontendCustomTemplateLayout(layout).valid).toBe(true);
  });

  it('allows repeated Rich Article Content with a matching custom instance', () => {
    const layout = cloneSample();
    layout.sections[1].slots[0].components.push(asComponent({
      id: 'comp-article-extra', componentKey: 'rich_article_content', blockId: 'article_extra', enabled: true,
      settings: { fontSize: 'medium', lineHeight: 'relaxed' }
    }));
    const blocks = JSON.parse(JSON.stringify(sampleFrontendBlocksDoc));
    blocks.custom_instances.article_extra = {
      componentKey: 'rich_article_content',
      enabled: true,
      content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
      html: '<p>Second body</p>'
    };
    expect(validateFrontendCustomTemplateLayout(layout, blocks).valid).toBe(true);
  });

  it('rejects unsafe and reserved block IDs', () => {
    const unsafe = cloneSample();
    asMutable(unsafe.sections[0].slots[0].components[0]).blockId = 'hero block';
    expect(validateFrontendCustomTemplateLayout(unsafe).errors.some((error) => error.message.includes('letters, numbers'))).toBe(true);

    const reserved = cloneSample();
    asMutable(reserved.sections[1].slots[0].components[0]).blockId = 'article_content';
    expect(validateFrontendCustomTemplateLayout(reserved).errors.some((error) => error.message.includes('reserved'))).toBe(true);
  });

  it('does not require Blog content for disabled placements', () => {
    const layout = cloneSample();
    layout.sections[1].slots[0].components[0].enabled = false;
    const blocks = JSON.parse(JSON.stringify(sampleFrontendBlocksDoc));
    delete blocks.custom_instances.key_takeaways;
    expect(validateFrontendCustomTemplateLayout(layout, blocks).valid).toBe(true);
  });

  it('restores documented defaults and historical element aliases without hiding unsupported values', () => {
    const layout = cloneSample();
    delete asMutable(layout).page;
    delete asMutable(layout.sections[0]).enabled;
    delete asMutable(layout.sections[0]).responsiveStrategy;
    delete asMutable(layout.sections[0]).background;
    layout.sections[0].slots[0].components.push(asComponent({
      id: 'legacy-spacer', componentKey: 'spacer', settings: { height: 'small' }
    }));
    const result = validateFrontendCustomTemplateLayout(layout);
    expect(result.valid).toBe(true);
    expect(result.config?.page).toEqual({ contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' });
    expect(result.config?.sections[0]).toMatchObject({ enabled: true, responsiveStrategy: 'stack_on_mobile' });
    expect(result.config?.sections[0].slots[0].components.at(-1)?.settings).toEqual({ size: 'small' });

    asMutable(layout).page = { contentWidth: 'teleport', background: 'white', spacing: 'normal', typography: 'editorial' };
    expect(validateFrontendCustomTemplateLayout(layout).errors.some((error) => error.path === 'page.contentWidth')).toBe(true);
  });
});

describe('Table settings validation', () => {
  function layoutWithTable(settings: Record<string, unknown>): CustomTemplateLayoutConfigV1 {
    return {
      schemaVersion: 1,
      layoutId: 'table-settings',
      metadata: { name: 'Table Settings', description: 'Test.' },
      page: { contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' },
      sections: [{
        id: 'sec-table',
        layout: 'full_width',
        responsiveStrategy: 'stack_on_mobile',
        enabled: true,
        slots: [{
          id: 'slot-table',
          name: 'Main',
          components: [asComponent({ id: 'comp-table', componentKey: 'table', blockId: 'table_1', enabled: true, settings })]
        }]
      }]
    };
  }

  it('accepts valid table settings within the global 1-50 row / 1-10 column limits', () => {
    const result = validateFrontendCustomTemplateLayout(layoutWithTable({ variant: 'striped', headerStyle: 'brand_sky', alignment: 'left', maxRows: 4, maxColumns: 4 }));
    expect(result.valid).toBe(true);
  });

  it('rejects maxRows above the global limit of 50', () => {
    const result = validateFrontendCustomTemplateLayout(layoutWithTable({ variant: 'striped', headerStyle: 'brand_sky', alignment: 'left', maxRows: 51, maxColumns: 4 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path.includes('maxRows'))).toBe(true);
  });

  it('rejects maxColumns above the global limit of 10', () => {
    const result = validateFrontendCustomTemplateLayout(layoutWithTable({ variant: 'striped', headerStyle: 'brand_sky', alignment: 'left', maxRows: 4, maxColumns: 11 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path.includes('maxColumns'))).toBe(true);
  });

  it('rejects an unknown variant, headerStyle, or alignment value', () => {
    expect(validateFrontendCustomTemplateLayout(layoutWithTable({ variant: 'rainbow', headerStyle: 'brand_sky', alignment: 'left', maxRows: 4, maxColumns: 4 })).valid).toBe(false);
    expect(validateFrontendCustomTemplateLayout(layoutWithTable({ variant: 'striped', headerStyle: 'neon', alignment: 'left', maxRows: 4, maxColumns: 4 })).valid).toBe(false);
    expect(validateFrontendCustomTemplateLayout(layoutWithTable({ variant: 'striped', headerStyle: 'brand_sky', alignment: 'right', maxRows: 4, maxColumns: 4 })).valid).toBe(false);
  });
});
