import type {
  CustomTemplateSectionLayout,
  CustomTemplateSlot,
  RegisteredComponentKey
} from '../custom-template.types';

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
  switch (componentKey) {
    case 'hero':
      return { height: 'standard', alignment: 'left', overlay: 'medium' };
    case 'rich_article_content':
      return { fontSize: 'medium', lineHeight: 'relaxed' };
    case 'key_takeaways':
      return { variant: 'soft', columns: 'one' };
    case 'image_comparison':
      return { columns: 'two', imageRatio: 'landscape' };
    case 'numbered_list':
      return { style: 'circle' };
    case 'expert_quote':
      return { orientation: 'horizontal', background: 'soft' };
    case 'medical_cta':
      return { style: 'navy', buttonLayout: 'inline' };
    case 'faq':
      return { layout: 'accordion', defaultOpen: 'none' };
    case 'feedback':
      return { showPrompt: true };
    case 'share':
      return { alignment: 'center' };
    case 'medical_disclaimer':
      return { variant: 'standard' };
    case 'article_table_of_contents':
      return { headingLevels: [2, 3, 4], sticky: true };
    case 'appointment_card':
      return { heading: 'Book an Appointment', buttonLabel: 'Schedule Now', targetUrl: 'https://example.com/appointments' };
    case 'newsletter_card':
      return { heading: 'Subscribe to Newsletter', description: 'Get health tips.', buttonLabel: 'Subscribe' };
    case 'spacer':
      return { size: 'medium' };
    case 'divider':
      return { style: 'solid' };
    default:
      return {};
  }
}
