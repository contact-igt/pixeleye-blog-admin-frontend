import type {
  CustomTemplateSectionLayout,
  CustomTemplateSlot,
  RegisteredComponentKey
} from '../custom-template.types';
import { getDefaultComponentSettings } from '../custom-template-settings';

export function generateId(prefix: string, existingIds?: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11);
    const shortUuid = uuid.replace(/-/g, '').substring(0, 8);
    const id = `${prefix}-${shortUuid}`;
    if (!existingIds || !existingIds.has(id)) {
      return id;
    }
    attempts++;
  }
  throw new Error(`Failed to generate a unique ID after 100 attempts for prefix: ${prefix}`);
}

export function createDefaultSlots(
  layout: CustomTemplateSectionLayout,
  existingIds?: Set<string>
): CustomTemplateSlot[] {
  const idsSet = existingIds || new Set<string>();
  
  if (layout === 'full_width') {
    return [
      { id: generateId('slot-full', idsSet), name: 'Full Width Slot', components: [] }
    ];
  }
  if (layout === 'content_sidebar') {
    return [
      { id: generateId('slot-main', idsSet), name: 'Main Slot', components: [] },
      { id: generateId('slot-sidebar', idsSet), name: 'Sidebar Slot', components: [] }
    ];
  }
  if (layout === 'two_column') {
    return [
      { id: generateId('slot-col1', idsSet), name: 'Column 1', components: [] },
      { id: generateId('slot-col2', idsSet), name: 'Column 2', components: [] }
    ];
  }
  if (layout === 'three_column') {
    return [
      { id: generateId('slot-col1', idsSet), name: 'Column 1', components: [] },
      { id: generateId('slot-col2', idsSet), name: 'Column 2', components: [] },
      { id: generateId('slot-col3', idsSet), name: 'Column 3', components: [] }
    ];
  }
  
  return [];
}

/**
 * Determines the blockId a duplicated component instance should carry. Rich Article Content
 * always uses the fixed 'article_content' sentinel (never a per-instance id, since the renderer
 * and block editor key its content off that sentinel, not off blockId). Other content components
 * get a fresh blockId so the duplicate holds independent content. Components without a blockId
 * (system/structural) stay without one.
 */
export function resolveDuplicateBlockId(
  componentKey: RegisteredComponentKey,
  originalBlockId: string | undefined,
  newComponentId: string
): string | undefined {
  if (!originalBlockId) return undefined;
  if (componentKey === 'rich_article_content') return 'article_content';
  return newComponentId;
}

export function createDefaultSettings(componentKey: RegisteredComponentKey): any {
  return getDefaultComponentSettings(componentKey);
}
