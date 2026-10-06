import { describe, expect, it } from 'vitest';
import { builderReducer } from '../builder-reducer';
import { initialState, type BuilderState } from '../builder-state';
import { sampleFrontendCustomTemplateConfig } from '../../custom-template-sample';
import { collectEditableInstances } from '../../custom-template-block-editor';
import { countActiveHeroes, HERO_LIMIT_MESSAGE } from '../../hero-limit';

function sampleState(): BuilderState {
  return { ...initialState, layout: JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig)) };
}

const hero = (id: string, blockId: string, enabled = true) => ({
  id, componentKey: 'hero', blockId, enabled, settings: { height: 'standard', alignment: 'left', overlay: 'medium' }
});

describe('Only one Hero Banner per template', () => {
  it('sample template starts with exactly one active Hero', () => {
    expect(countActiveHeroes(sampleState().layout.sections)).toBe(1);
  });

  it('blocks adding a second Hero from the palette', () => {
    let state = sampleState();
    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId: 'sec-body', slotId: 'slot-main' } });
    const next = builderReducer(state, { type: 'add_component', componentKey: 'hero' });
    expect(next.validationMessage).toBe(HERO_LIMIT_MESSAGE);
    expect(countActiveHeroes(next.layout.sections)).toBe(1);
  });

  it('allows adding a Hero when the template has none', () => {
    let state = sampleState();
    state = builderReducer(state, { type: 'remove_component', sectionId: 'sec-hero', slotId: 'slot-hero', componentId: 'comp-hero-1' });
    expect(countActiveHeroes(state.layout.sections)).toBe(0);
    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId: 'sec-body', slotId: 'slot-main' } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'hero' });
    expect(countActiveHeroes(state.layout.sections)).toBe(1);
  });

  it('blocks duplicating the Hero component or the section that contains it', () => {
    const state = sampleState();
    const dupComponent = builderReducer(state, { type: 'duplicate_component', sectionId: 'sec-hero', slotId: 'slot-hero', componentId: 'comp-hero-1' });
    expect(dupComponent.validationMessage).toBe(HERO_LIMIT_MESSAGE);
    const dupSection = builderReducer(state, { type: 'duplicate_section', sectionId: 'sec-hero' });
    expect(dupSection.validationMessage).toBe(HERO_LIMIT_MESSAGE);
    expect(countActiveHeroes(dupSection.layout.sections)).toBe(1);
  });

  it('blocks re-enabling a disabled Hero while another one is active', () => {
    const state = sampleState();
    state.layout.sections[1].slots[0].components.push(hero('comp-hero-2', 'hero_2', false) as never);
    const next = builderReducer(state, { type: 'update_component', sectionId: 'sec-body', slotId: 'slot-main', componentId: 'comp-hero-2', updates: { enabled: true } });
    expect(next.validationMessage).toBe(HERO_LIMIT_MESSAGE);
    expect(next.layout.sections[1].slots[0].components.find((c) => c.id === 'comp-hero-2')?.enabled).toBe(false);
  });
});

describe('Templates saved earlier with two Hero Banners', () => {
  it('shows and requires only the first Hero in the blog form, but still initialises the extra one', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.sections[1].slots[0].components.push(hero('comp-hero-2', 'hero_2'));
    const instances = collectEditableInstances(layout).filter((instance) => instance.componentKey === 'hero');
    expect(instances).toHaveLength(2);
    expect(instances[0]).toMatchObject({ blockId: 'hero', label: 'Hero Banner' });
    expect(instances[0].hidden).toBeUndefined();
    expect(instances[1]).toMatchObject({ blockId: 'hero_2', hidden: true });
  });
});
