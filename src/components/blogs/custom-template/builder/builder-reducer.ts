import type { BuilderState, SelectedElement } from './builder-state';
import type {
  CustomTemplateLayoutConfigV1,
  CustomTemplateSection,
  CustomTemplateComponentInstance,
  CustomTemplateSectionLayout,
  RegisteredComponentKey,
  CustomTemplatePageSettings
} from '../custom-template.types';
import type { FrontendValidationError } from '../custom-template-validation';
import { generateId, createDefaultSlots, createDefaultSettings, resolveDuplicateBlockId } from './builder-id-utils';
import { getComponentDefinition } from '../component-registry';

const HISTORY_LIMIT = 50;

export type BuilderAction =
  | { type: 'replace_layout'; layout: CustomTemplateLayoutConfigV1; pushHistory?: boolean }
  | { type: 'add_section'; layoutType: CustomTemplateSectionLayout }
  | { type: 'remove_section'; sectionId: string }
  | { type: 'duplicate_section'; sectionId: string }
  | { type: 'move_section'; sectionId: string; direction: 'up' | 'down' }
  | { type: 'update_section'; sectionId: string; updates: Partial<Omit<CustomTemplateSection, 'id' | 'slots' | 'settings'>> }
  | { type: 'update_section_settings'; sectionId: string; updates: Partial<NonNullable<CustomTemplateSection['settings']>> }
  | { type: 'apply_pending_layout_reduction' }
  | { type: 'remove_pending_layout_overflow' }
  | { type: 'cancel_pending_layout_reduction' }
  | { type: 'add_component'; componentKey: RegisteredComponentKey }
  | { type: 'remove_component'; sectionId: string; slotId: string; componentId: string }
  | { type: 'duplicate_component'; sectionId: string; slotId: string; componentId: string }
  | { type: 'move_component'; sectionId: string; slotId: string; componentId: string; direction: 'up' | 'down' }
  | {
      type: 'move_component_to_slot';
      componentId: string;
      fromSectionId: string;
      fromSlotId: string;
      toSectionId: string;
      toSlotId: string;
      toIndex?: number;
    }
  | { type: 'select_element'; element: SelectedElement }
  | { type: 'update_component'; sectionId: string; slotId: string; componentId: string; updates: { enabled?: boolean; settings?: Record<string, unknown> } }
  | { type: 'update_page_settings'; updates: Partial<CustomTemplatePageSettings> }
  | { type: 'update_metadata'; updates: Partial<{ name: string; description: string }> }
  | { type: 'set_preview_device'; device: 'desktop' | 'tablet' | 'mobile' }
  | { type: 'set_validation_result'; result: { valid: boolean; errors: FrontendValidationError[] } }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset_sample'; sampleConfig: CustomTemplateLayoutConfigV1 }
  | { type: 'clear_canvas' }
  | { type: 'clear_validation_message' };

export function collectAllIds(layout: CustomTemplateLayoutConfigV1): Set<string> {
  const ids = new Set<string>();
  ids.add(layout.layoutId);
  for (const section of layout.sections) {
    ids.add(section.id);
    for (const slot of section.slots) {
      ids.add(slot.id);
      for (const comp of slot.components) {
        ids.add(comp.id);
      }
    }
  }
  return ids;
}

function hasMainArticleContent(layout: CustomTemplateLayoutConfigV1): boolean {
  return layout.sections.some((section) =>
    section.slots.some((slot) =>
      slot.components.some((component) => component.componentKey === 'rich_article_content' && (component as { blockId?: string }).blockId === 'article_content')
    )
  );
}

function pushToHistory(state: BuilderState): { history: CustomTemplateLayoutConfigV1[]; future: CustomTemplateLayoutConfigV1[] } {
  const newHistory = [...state.history, JSON.parse(JSON.stringify(state.layout))];
  if (newHistory.length > HISTORY_LIMIT) {
    newHistory.shift();
  }
  return {
    history: newHistory,
    future: [] // new mutation clears future/redo stack
  };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'clear_validation_message':
      return { ...state, validationMessage: null };

    case 'replace_layout': {
      const push = action.pushHistory !== false;
      const historyUpdate = push ? pushToHistory(state) : {};
      return {
        ...state,
        ...historyUpdate,
        layout: JSON.parse(JSON.stringify(action.layout)),
        isDirty: push ? true : state.isDirty,
        validationMessage: null
      };
    }

    case 'add_section': {
      if (state.layout.sections.length >= 20) {
        return { ...state, validationMessage: 'Maximum section limit (20) reached.' };
      }
      const historyUpdate = pushToHistory(state);
      const existingIds = collectAllIds(state.layout);
      const newSectionId = generateId('sec', existingIds);
      existingIds.add(newSectionId);
      
      const newSection: CustomTemplateSection = {
        id: newSectionId,
        layout: action.layoutType,
        responsiveStrategy: action.layoutType === 'content_sidebar' ? 'sidebar_below_on_tablet' : 'stack_on_mobile',
        enabled: true,
        background: 'white',
        slots: createDefaultSlots(action.layoutType, existingIds)
      };

      const updatedSections = [...state.layout.sections, newSection];
      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        selectedElement: { type: 'section', sectionId: newSectionId },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'remove_section': {
      const historyUpdate = pushToHistory(state);
      const updatedSections = state.layout.sections.filter((s) => s.id !== action.sectionId);
      const isSelectedRemoved = state.selectedElement?.type === 'section' && state.selectedElement.sectionId === action.sectionId;
      const isComponentOrSlotRemoved = state.selectedElement && state.selectedElement.sectionId === action.sectionId;
      
      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        selectedElement: isSelectedRemoved || isComponentOrSlotRemoved ? null : state.selectedElement,
        isDirty: true,
        validationMessage: null
      };
    }

    case 'duplicate_section': {
      if (state.layout.sections.length >= 20) {
        return { ...state, validationMessage: 'Cannot duplicate. Maximum section limit (20) reached.' };
      }
      const sectionToDuplicate = state.layout.sections.find((s) => s.id === action.sectionId);
      if (!sectionToDuplicate) return state;

      const historyUpdate = pushToHistory(state);
      const existingIds = collectAllIds(state.layout);
      const newSectionId = generateId('sec', existingIds);
      existingIds.add(newSectionId);

      const duplicatedSlots = sectionToDuplicate.slots.map((slot) => {
        const newSlotId = generateId('slot', existingIds);
        existingIds.add(newSlotId);
        
        const duplicatedComponents = slot.components.map((comp) => {
          const newCompId = generateId('comp', existingIds);
          existingIds.add(newCompId);
          const blockId = resolveDuplicateBlockId(comp.componentKey, (comp as { blockId?: string }).blockId, newCompId);
          return {
            ...JSON.parse(JSON.stringify(comp)),
            id: newCompId,
            ...(blockId !== undefined ? { blockId } : {})
          };
        });

        return {
          ...JSON.parse(JSON.stringify(slot)),
          id: newSlotId,
          components: duplicatedComponents
        };
      });

      const newSection: CustomTemplateSection = {
        ...JSON.parse(JSON.stringify(sectionToDuplicate)),
        id: newSectionId,
        slots: duplicatedSlots
      };

      const sectionIndex = state.layout.sections.findIndex((s) => s.id === action.sectionId);
      const updatedSections = [...state.layout.sections];
      updatedSections.splice(sectionIndex + 1, 0, newSection);

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        selectedElement: { type: 'section', sectionId: newSectionId },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'move_section': {
      const index = state.layout.sections.findIndex((s) => s.id === action.sectionId);
      if (index === -1) return state;
      const targetIndex = action.direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.layout.sections.length) return state;

      const historyUpdate = pushToHistory(state);
      const updatedSections = [...state.layout.sections];
      const [movedSection] = updatedSections.splice(index, 1);
      updatedSections.splice(targetIndex, 0, movedSection);

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'update_section': {
      const section = state.layout.sections.find((s) => s.id === action.sectionId);
      if (!section) return state;

      // Handle layout changes that reduce slot count (trigger confirmation)
      if (action.updates.layout && action.updates.layout !== section.layout) {
        const getSlotCount = (l: CustomTemplateSectionLayout) => {
          if (l === 'full_width') return 1;
          if (l === 'three_column') return 3;
          return 2;
        };
        const currentSlotCount = getSlotCount(section.layout);
        const newSlotCount = getSlotCount(action.updates.layout);

        const hasComponentsInExcessSlots = section.slots.some(
          (slot, idx) => idx >= newSlotCount && slot.components.length > 0
        );

        if (newSlotCount < currentSlotCount && hasComponentsInExcessSlots) {
          // Put in pending state for confirmation
          return {
            ...state,
            pendingLayoutReduction: {
              sectionId: action.sectionId,
              newLayout: action.updates.layout,
              currentSlotCount,
              newSlotCount
            },
            validationMessage: null
          };
        } else {
          // Safe layout transition: either growing slot count or excess slots are empty
          const historyUpdate = pushToHistory(state);
          const existingIds = collectAllIds(state.layout);
          const newSlots = createDefaultSlots(action.updates.layout, existingIds);

          // deterministic copy of elements up to new slot limit
          section.slots.forEach((oldSlot, index) => {
            if (index < newSlots.length) {
              newSlots[index].components = JSON.parse(JSON.stringify(oldSlot.components));
            }
          });

          const updatedSections = state.layout.sections.map((s) =>
            s.id === action.sectionId
              ? { ...s, layout: action.updates.layout!, slots: newSlots }
              : s
          );

          return {
            ...state,
            ...historyUpdate,
            layout: { ...state.layout, sections: updatedSections },
            isDirty: true,
            validationMessage: null
          };
        }
      }

      // Plain updates without layout changes
      const historyUpdate = pushToHistory(state);
      const updatedSections = state.layout.sections.map((s) =>
        s.id === action.sectionId ? { ...s, ...action.updates } : s
      );

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'update_section_settings': {
      const section = state.layout.sections.find((s) => s.id === action.sectionId);
      if (!section) return state;

      const historyUpdate = pushToHistory(state);
      const updatedSections = state.layout.sections.map((s) =>
        s.id === action.sectionId
          ? { ...s, settings: { ...(s.settings || {}), ...action.updates } }
          : s
      );

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'apply_pending_layout_reduction': {
      if (!state.pendingLayoutReduction) return state;
      const { sectionId, newLayout, newSlotCount } = state.pendingLayoutReduction;
      const section = state.layout.sections.find((item) => item.id === sectionId);
      if (!section) return { ...state, pendingLayoutReduction: null };

      const allComponents = section.slots.flatMap((slot) => slot.components);
      const capacity = newSlotCount * 10;
      if (allComponents.length > capacity) {
        return {
          ...state,
          validationMessage: `Cannot move all components: ${allComponents.length - capacity} component(s) exceed the new layout capacity. Choose Remove overflow explicitly or cancel.`
        };
      }

      const historyUpdate = pushToHistory(state);
      const newSlots = createDefaultSlots(newLayout, collectAllIds(state.layout));
      let componentIndex = 0;
      newSlots.forEach((slot) => {
        slot.components = JSON.parse(JSON.stringify(allComponents.slice(componentIndex, componentIndex + 10)));
        componentIndex += slot.components.length;
      });
      const updatedSections = state.layout.sections.map((item) => item.id === sectionId
        ? { ...item, layout: newLayout, slots: newSlots }
        : item);
      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        pendingLayoutReduction: null,
        isDirty: true,
        validationMessage: null
      };
    }

    case 'remove_pending_layout_overflow': {
      if (!state.pendingLayoutReduction) return state;
      const { sectionId, newLayout, newSlotCount } = state.pendingLayoutReduction;
      const section = state.layout.sections.find((item) => item.id === sectionId);
      if (!section) return { ...state, pendingLayoutReduction: null };

      const historyUpdate = pushToHistory(state);
      const allComponents = section.slots.flatMap((slot) => slot.components);
      const capacity = newSlotCount * 10;
      const keptComponents = allComponents.slice(0, capacity);
      const removedCount = allComponents.length - keptComponents.length;
      const newSlots = createDefaultSlots(newLayout, collectAllIds(state.layout));
      let componentIndex = 0;
      newSlots.forEach((slot) => {
        slot.components = JSON.parse(JSON.stringify(keptComponents.slice(componentIndex, componentIndex + 10)));
        componentIndex += slot.components.length;
      });
      const updatedSections = state.layout.sections.map((item) => item.id === sectionId
        ? { ...item, layout: newLayout, slots: newSlots }
        : item);
      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        pendingLayoutReduction: null,
        isDirty: true,
        validationMessage: removedCount > 0 ? `${removedCount} overflow component(s) were explicitly removed during the layout change.` : null
      };
    }

    case 'cancel_pending_layout_reduction':
      return {
        ...state,
        pendingLayoutReduction: null,
        validationMessage: null
      };

    case 'add_component': {
      if (state.selectedElement?.type !== 'slot') {
        return { ...state, validationMessage: 'You must select a slot in the canvas to add a component.' };
      }
      
      const { sectionId, slotId } = state.selectedElement;
      const section = state.layout.sections.find((s) => s.id === sectionId);
      const slot = section?.slots.find((sl) => sl.id === slotId);
      if (!slot) return state;

      if (slot.components.length >= 10) {
        return { ...state, validationMessage: 'Maximum component limit (10) for this slot reached.' };
      }

      // Check overall complexity limit
      let totalComponents = 0;
      state.layout.sections.forEach((sec) => {
        sec.slots.forEach((sl) => {
          totalComponents += sl.components.length;
        });
      });
      if (totalComponents >= 60) {
        return { ...state, validationMessage: 'Maximum total component limit (60) reached.' };
      }

      // Verify zone permission
      const getSlotZone = (secLayout: CustomTemplateSectionLayout, slotIndex: number): 'full' | 'main' | 'sidebar' => {
        if (secLayout === 'full_width') return 'full';
        if (secLayout === 'content_sidebar') return slotIndex === 1 ? 'sidebar' : 'main';
        return 'main';
      };
      const slotIdx = section!.slots.findIndex((sl) => sl.id === slotId);
      const zone = getSlotZone(section!.layout, slotIdx);
      const definition = getComponentDefinition(action.componentKey);

      if (!definition.allowedZones.includes(zone)) {
        return {
          ...state,
          validationMessage: `Component '${definition.displayName}' is not allowed in a ${zone} zone.`
        };
      }

      const historyUpdate = pushToHistory(state);
      const existingIds = collectAllIds(state.layout);
      const newComponentId = generateId('comp', existingIds);

      const baseComponent = {
        id: newComponentId,
        componentKey: action.componentKey,
        enabled: true,
        settings: createDefaultSettings(action.componentKey)
      } as unknown as CustomTemplateComponentInstance;

      if (definition.category === 'content') {
        // Each content component instance gets its own unique blockId so repeated placements
        // of the same componentKey (e.g. two Numbered List sections) hold independent content.
        baseComponent.blockId = action.componentKey === 'rich_article_content' && !hasMainArticleContent(state.layout) ? 'article_content' : newComponentId;
      }

      const updatedSections = state.layout.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== slotId) return sl;
            return {
              ...sl,
              components: [...sl.components, baseComponent]
            };
          })
        };
      });

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        selectedElement: { type: 'component', sectionId, slotId, componentId: newComponentId },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'remove_component': {
      const historyUpdate = pushToHistory(state);
      const updatedSections = state.layout.sections.map((s) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== action.slotId) return sl;
            return {
              ...sl,
              components: sl.components.filter((c) => c.id !== action.componentId)
            };
          })
        };
      });

      const isSelectedRemoved =
        state.selectedElement?.type === 'component' &&
        state.selectedElement.componentId === action.componentId;

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        selectedElement: isSelectedRemoved ? null : state.selectedElement,
        isDirty: true,
        validationMessage: null
      };
    }

    case 'duplicate_component': {
      let totalComponents = 0;
      state.layout.sections.forEach((sec) => {
        sec.slots.forEach((sl) => {
          totalComponents += sl.components.length;
        });
      });
      if (totalComponents >= 60) {
        return { ...state, validationMessage: 'Cannot duplicate component. Maximum total component limit (60) reached.' };
      }

      const section = state.layout.sections.find((s) => s.id === action.sectionId);
      const slot = section?.slots.find((sl) => sl.id === action.slotId);
      const component = slot?.components.find((c) => c.id === action.componentId);
      if (!slot || !component) return state;

      if (slot.components.length >= 10) {
        return { ...state, validationMessage: 'Cannot duplicate. Target slot component limit (10) reached.' };
      }

      const historyUpdate = pushToHistory(state);
      const existingIds = collectAllIds(state.layout);
      const newComponentId = generateId('comp', existingIds);

      const duplicateBlockId = resolveDuplicateBlockId(component.componentKey, (component as { blockId?: string }).blockId, newComponentId);
      const duplicatedComponent = {
        ...JSON.parse(JSON.stringify(component)),
        id: newComponentId,
        // Give the duplicate its own blockId so it gets independent content, not the original's.
        ...(duplicateBlockId !== undefined ? { blockId: duplicateBlockId } : {})
      };

      const compIdx = slot.components.findIndex((c) => c.id === action.componentId);
      const updatedComponents = [...slot.components];
      updatedComponents.splice(compIdx + 1, 0, duplicatedComponent);

      const updatedSections = state.layout.sections.map((s) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== action.slotId) return sl;
            return {
              ...sl,
              components: updatedComponents
            };
          })
        };
      });

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        selectedElement: {
          type: 'component',
          sectionId: action.sectionId,
          slotId: action.slotId,
          componentId: newComponentId
        },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'move_component': {
      const section = state.layout.sections.find((s) => s.id === action.sectionId);
      const slot = section?.slots.find((sl) => sl.id === action.slotId);
      if (!slot) return state;

      const idx = slot.components.findIndex((c) => c.id === action.componentId);
      if (idx === -1) return state;

      const targetIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= slot.components.length) return state;

      const historyUpdate = pushToHistory(state);
      const updatedComponents = [...slot.components];
      const [movedComp] = updatedComponents.splice(idx, 1);
      updatedComponents.splice(targetIdx, 0, movedComp);

      const updatedSections = state.layout.sections.map((s) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== action.slotId) return sl;
            return { ...sl, components: updatedComponents };
          })
        };
      });

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'move_component_to_slot': {
      const fromSection = state.layout.sections.find((s) => s.id === action.fromSectionId);
      const fromSlot = fromSection?.slots.find((sl) => sl.id === action.fromSlotId);
      const component = fromSlot?.components.find((c) => c.id === action.componentId);
      
      const toSection = state.layout.sections.find((s) => s.id === action.toSectionId);
      const toSlot = toSection?.slots.find((sl) => sl.id === action.toSlotId);

      if (!component || !toSlot) return state;

      // target slot limits check
      if (toSlot.components.length >= 10 && action.fromSlotId !== action.toSlotId) {
        return { ...state, validationMessage: 'Target slot is at full capacity (10 components).' };
      }

      // Zone compatibility check
      const getSlotZone = (secLayout: CustomTemplateSectionLayout, slotIndex: number): 'full' | 'main' | 'sidebar' => {
        if (secLayout === 'full_width') return 'full';
        if (secLayout === 'content_sidebar') return slotIndex === 1 ? 'sidebar' : 'main';
        return 'main';
      };
      const toSlotIdx = toSection!.slots.findIndex((sl) => sl.id === action.toSlotId);
      const targetZone = getSlotZone(toSection!.layout, toSlotIdx);
      const definition = getComponentDefinition(component.componentKey);

      if (!definition.allowedZones.includes(targetZone)) {
        return {
          ...state,
          validationMessage: `Component '${definition.displayName}' is not allowed in a ${targetZone} zone.`
        };
      }

      const historyUpdate = pushToHistory(state);

      // Perform transaction
      let updatedSections = state.layout.sections.map((s) => {
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (s.id === action.fromSectionId && sl.id === action.fromSlotId) {
              return {
                ...sl,
                components: sl.components.filter((c) => c.id !== action.componentId)
              };
            }
            return sl;
          })
        };
      });

      // Insert into target slot
      updatedSections = updatedSections.map((s) => {
        if (s.id !== action.toSectionId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== action.toSlotId) return sl;
            const updatedComponents = [...sl.components];
            const insertIdx = action.toIndex !== undefined ? action.toIndex : updatedComponents.length;
            updatedComponents.splice(insertIdx, 0, JSON.parse(JSON.stringify(component)));
            return {
              ...sl,
              components: updatedComponents
            };
          })
        };
      });

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        selectedElement: {
          type: 'component',
          sectionId: action.toSectionId,
          slotId: action.toSlotId,
          componentId: action.componentId
        },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'select_element':
      return {
        ...state,
        selectedElement: action.element,
        validationMessage: null
      };

    case 'update_component': {
      const historyUpdate = pushToHistory(state);
      const updatedSections = state.layout.sections.map((s) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== action.slotId) return sl;
            return {
              ...sl,
              components: sl.components.map((c) => {
                if (c.id !== action.componentId) return c;
                return {
                  ...c,
                  ...action.updates,
                  settings: { ...c.settings, ...action.updates.settings }
                } as CustomTemplateComponentInstance;
              })
            };
          })
        };
      });

      return {
        ...state,
        ...historyUpdate,
        layout: { ...state.layout, sections: updatedSections },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'update_page_settings': {
      const historyUpdate = pushToHistory(state);
      return {
        ...state,
        ...historyUpdate,
        layout: {
          ...state.layout,
          page: { ...state.layout.page, ...action.updates }
        },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'update_metadata': {
      return {
        ...state,
        layout: {
          ...state.layout,
          metadata: { ...state.layout.metadata, ...action.updates }
        },
        isDirty: true,
        validationMessage: null
      };
    }

    case 'set_preview_device':
      return {
        ...state,
        previewDevice: action.device,
        validationMessage: null
      };

    case 'set_validation_result':
      return {
        ...state,
        validationResult: action.result,
        validationMessage: null
      };

    case 'undo': {
      if (state.history.length === 0) return state;
      const previousLayout = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      const newFuture = [JSON.parse(JSON.stringify(state.layout)), ...state.future];

      return {
        ...state,
        layout: previousLayout,
        history: newHistory,
        future: newFuture,
        isDirty: true,
        validationMessage: null
      };
    }

    case 'redo': {
      if (state.future.length === 0) return state;
      const nextLayout = state.future[0];
      const newFuture = state.future.slice(1);
      const newHistory = [...state.history, JSON.parse(JSON.stringify(state.layout))];

      return {
        ...state,
        layout: nextLayout,
        history: newHistory,
        future: newFuture,
        isDirty: true,
        validationMessage: null
      };
    }

    case 'reset_sample': {
      const historyUpdate = pushToHistory(state);
      return {
        ...state,
        ...historyUpdate,
        layout: JSON.parse(JSON.stringify(action.sampleConfig)),
        selectedElement: null,
        isDirty: true,
        validationMessage: null
      };
    }

    case 'clear_canvas': {
      const historyUpdate = pushToHistory(state);
      return {
        ...state,
        ...historyUpdate,
        layout: {
          ...state.layout,
          sections: []
        },
        selectedElement: null,
        isDirty: true,
        validationMessage: null
      };
    }

    default:
      return state;
  }
}
