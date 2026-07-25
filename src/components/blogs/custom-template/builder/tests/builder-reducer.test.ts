import { describe, it, expect } from 'vitest';
import { builderReducer, collectAllIds } from '../builder-reducer';
import { initialState } from '../builder-state';
import { sampleFrontendCustomTemplateConfig } from '../../custom-template-sample';

describe('builderReducer tests', () => {
  it('should support replace_layout', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    const nextState = builderReducer(initialState, { type: 'replace_layout', layout });
    expect(nextState.layout.layoutId).toBe(layout.layoutId);
    expect(nextState.isDirty).toBe(true);
  });

  it('should support add_section', () => {
    const nextState = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    expect(nextState.layout.sections.length).toBe(1);
    expect(nextState.layout.sections[0].layout).toBe('full_width');
    expect(nextState.selectedElement).toEqual({ type: 'section', sectionId: nextState.layout.sections[0].id });
  });

  it('should prevent adding more than 20 sections', () => {
    let state = initialState;
    for (let i = 0; i < 20; i++) {
      state = builderReducer(state, { type: 'add_section', layoutType: 'full_width' });
    }
    expect(state.layout.sections.length).toBe(20);
    const overflowState = builderReducer(state, { type: 'add_section', layoutType: 'full_width' });
    expect(overflowState.layout.sections.length).toBe(20);
    expect(overflowState.validationMessage).toContain('limit (20) reached');
  });

  it('should support duplicate_section', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    const sectionId = state.layout.sections[0].id;
    state = builderReducer(state, { type: 'duplicate_section', sectionId });
    expect(state.layout.sections.length).toBe(2);
    // ensure unique IDs
    const ids = Array.from(collectAllIds(state.layout));
    const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
    expect(duplicates.length).toBe(0);
  });

  it('should support move_section', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    state = builderReducer(state, { type: 'add_section', layoutType: 'two_column' });
    const firstId = state.layout.sections[0].id;
    state = builderReducer(state, { type: 'move_section', sectionId: firstId, direction: 'down' });
    expect(state.layout.sections[1].id).toBe(firstId);
  });

  it('should support select_element without pushing history', () => {
    const state = builderReducer(initialState, { type: 'select_element', element: { type: 'section', sectionId: 'test' } });
    expect(state.selectedElement).toEqual({ type: 'section', sectionId: 'test' });
    expect(state.history.length).toBe(0);
  });

  it('should handle layout reduction with pending state and merge components', () => {
    // Add two_column section
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'two_column' });
    const sectionId = state.layout.sections[0].id;
    const slot0Id = state.layout.sections[0].slots[0].id;
    const slot1Id = state.layout.sections[0].slots[1].id;

    // Select slot 0 and add component
    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId: slot0Id } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'divider' });

    // Select slot 1 and add component
    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId: slot1Id } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'spacer' });

    // Reduce to full_width (1 slot)
    state = builderReducer(state, { type: 'update_section', sectionId, updates: { layout: 'full_width' } });
    expect(state.pendingLayoutReduction).not.toBeNull();
    expect(state.pendingLayoutReduction?.newLayout).toBe('full_width');

    // Confirm reduction
    state = builderReducer(state, { type: 'apply_pending_layout_reduction' });
    expect(state.pendingLayoutReduction).toBeNull();
    expect(state.layout.sections[0].layout).toBe('full_width');
    expect(state.layout.sections[0].slots[0].components.length).toBe(2);
    expect(state.layout.sections[0].slots[0].components[0].componentKey).toBe('divider');
    expect(state.layout.sections[0].slots[0].components[1].componentKey).toBe('spacer');
  });

  it('should handle move_component_to_slot', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'two_column' });
    const sectionId = state.layout.sections[0].id;
    const slot0Id = state.layout.sections[0].slots[0].id;
    const slot1Id = state.layout.sections[0].slots[1].id;

    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId: slot0Id } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'spacer' });
    const compId = state.layout.sections[0].slots[0].components[0].id;

    // move cross slot
    state = builderReducer(state, {
      type: 'move_component_to_slot',
      componentId: compId,
      fromSectionId: sectionId,
      fromSlotId: slot0Id,
      toSectionId: sectionId,
      toSlotId: slot1Id
    });

    expect(state.layout.sections[0].slots[0].components.length).toBe(0);
    expect(state.layout.sections[0].slots[1].components.length).toBe(1);
    expect(state.layout.sections[0].slots[1].components[0].id).toBe(compId);
  });

  it('should reject move_component_to_slot if zone is incompatible', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'content_sidebar' });
    const sectionId = state.layout.sections[0].id;
    const slot0Id = state.layout.sections[0].slots[0].id; // main
    const slot1Id = state.layout.sections[0].slots[1].id; // sidebar

    // add faq component (allowed only in main/full)
    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId: slot0Id } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'faq' });
    const compId = state.layout.sections[0].slots[0].components[0].id;

    // move to sidebar (slot 1)
    state = builderReducer(state, {
      type: 'move_component_to_slot',
      componentId: compId,
      fromSectionId: sectionId,
      fromSlotId: slot0Id,
      toSectionId: sectionId,
      toSlotId: slot1Id
    });

    expect(state.layout.sections[0].slots[0].components.length).toBe(1);
    expect(state.layout.sections[0].slots[1].components.length).toBe(0);
    expect(state.validationMessage).toContain('not allowed in a sidebar zone');
  });

  it('should support undo and redo', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    expect(state.history.length).toBe(1);

    state = builderReducer(state, { type: 'undo' });
    expect(state.layout.sections.length).toBe(0);
    expect(state.future.length).toBe(1);

    state = builderReducer(state, { type: 'redo' });
    expect(state.layout.sections.length).toBe(1);
  });

  it('should preserve the article_content sentinel when duplicating a rich_article_content component', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    const sectionId = state.layout.sections[0].id;
    const slotId = state.layout.sections[0].slots[0].id;

    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'rich_article_content' });
    const originalId = state.layout.sections[0].slots[0].components[0].id;
    expect((state.layout.sections[0].slots[0].components[0] as { blockId?: string }).blockId).toBe('article_content');

    state = builderReducer(state, { type: 'duplicate_component', sectionId, slotId, componentId: originalId });
    const [original, duplicate] = state.layout.sections[0].slots[0].components;
    expect((original as { blockId?: string }).blockId).toBe('article_content');
    expect((duplicate as { blockId?: string }).blockId).toBe('article_content');
    expect(duplicate.id).not.toBe(original.id);
  });

  it('should preserve the article_content sentinel when duplicating a section containing rich_article_content', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    const sectionId = state.layout.sections[0].id;
    const slotId = state.layout.sections[0].slots[0].id;

    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'rich_article_content' });

    state = builderReducer(state, { type: 'duplicate_section', sectionId });
    expect(state.layout.sections.length).toBe(2);
    const duplicatedComponent = state.layout.sections[1].slots[0].components[0] as { blockId?: string };
    expect(duplicatedComponent.blockId).toBe('article_content');
  });

  it('should give a duplicated non-sentinel content component a fresh, unique blockId', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    const sectionId = state.layout.sections[0].id;
    const slotId = state.layout.sections[0].slots[0].id;

    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'key_takeaways' });
    const originalId = state.layout.sections[0].slots[0].components[0].id;
    const originalBlockId = (state.layout.sections[0].slots[0].components[0] as { blockId?: string }).blockId;

    state = builderReducer(state, { type: 'duplicate_component', sectionId, slotId, componentId: originalId });
    const [original, duplicate] = state.layout.sections[0].slots[0].components as Array<{ id: string; blockId?: string }>;
    expect(original.blockId).toBe(originalBlockId);
    expect(duplicate.blockId).toBeTruthy();
    expect(duplicate.blockId).not.toBe(originalBlockId);
    expect(duplicate.id).not.toBe(original.id);

    // duplicated section/slot/component IDs remain globally unique
    const ids = Array.from(collectAllIds(state.layout));
    const duplicateIds = ids.filter((item, index) => ids.indexOf(item) !== index);
    expect(duplicateIds.length).toBe(0);
  });

  it('should not assign a blockId to duplicated system/structural components', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    const sectionId = state.layout.sections[0].id;
    const slotId = state.layout.sections[0].slots[0].id;

    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'divider' });
    const originalId = state.layout.sections[0].slots[0].components[0].id;
    expect((state.layout.sections[0].slots[0].components[0] as { blockId?: string }).blockId).toBeUndefined();

    state = builderReducer(state, { type: 'duplicate_component', sectionId, slotId, componentId: originalId });
    const duplicate = state.layout.sections[0].slots[0].components[1] as { blockId?: string };
    expect(duplicate.blockId).toBeUndefined();
  });

  it('should enforce 50 limit on history', () => {
    let state = initialState;
    for (let i = 0; i < 60; i++) {
      const newLayout = {
        ...state.layout,
        layoutId: `layout-${i}`
      };
      state = builderReducer(state, { type: 'replace_layout', layout: newLayout });
    }
    expect(state.history.length).toBe(50);
  });
});
