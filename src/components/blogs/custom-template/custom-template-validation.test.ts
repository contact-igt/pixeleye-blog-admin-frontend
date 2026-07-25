import { describe, it, expect } from 'vitest';
import { validateFrontendCustomTemplateLayout } from './custom-template-validation';
import { sampleFrontendCustomTemplateConfig } from './custom-template-sample';
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
});
