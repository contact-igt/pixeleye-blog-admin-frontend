import type { RegisteredComponentKey } from './custom-template.types';

export type ComponentCategory = 'content' | 'system' | 'structural';

export interface ComponentDefinition {
  key: RegisteredComponentKey;
  displayName: string;
  category: ComponentCategory;
  requiredBlockKey: string | null;
  allowedZones: readonly ('main' | 'sidebar' | 'full')[];
  editableInBlog: boolean;
  requiresBlockId: boolean;
  allowsMultiple: boolean;
  adminEditorKey: string | null;
  adminPreviewKey: string;
  websiteRendererKey: string;
}

type DefinitionBase = Pick<ComponentDefinition, 'key' | 'displayName' | 'category' | 'requiredBlockKey' | 'allowedZones'>;

function define(base: DefinitionBase, overrides: Partial<Omit<ComponentDefinition, keyof DefinitionBase>> = {}): ComponentDefinition {
  const content = base.category === 'content';
  return {
    ...base,
    editableInBlog: content && base.requiredBlockKey !== 'article_content',
    requiresBlockId: content,
    allowsMultiple: true,
    adminEditorKey: content && base.requiredBlockKey !== 'article_content' ? base.key : null,
    adminPreviewKey: base.key,
    websiteRendererKey: base.key,
    ...overrides
  };
}

export const REGISTERED_COMPONENTS: Record<RegisteredComponentKey, ComponentDefinition> = {
  hero: define({ key: 'hero', displayName: 'Hero Banner', category: 'content', requiredBlockKey: 'hero', allowedZones: ['full', 'main'] }),
  rich_article_content: define({ key: 'rich_article_content', displayName: 'Rich Article Content', category: 'content', requiredBlockKey: 'article_content', allowedZones: ['main', 'full'] }),
  key_takeaways: define({ key: 'key_takeaways', displayName: 'Key Takeaways', category: 'content', requiredBlockKey: 'key_takeaways', allowedZones: ['main', 'full'] }),
  image_comparison: define({ key: 'image_comparison', displayName: 'Image Comparison', category: 'content', requiredBlockKey: 'image_comparison', allowedZones: ['main', 'full'] }),
  numbered_list: define({ key: 'numbered_list', displayName: 'Numbered List', category: 'content', requiredBlockKey: 'numbered_list', allowedZones: ['main', 'full'] }),
  expert_quote: define({ key: 'expert_quote', displayName: 'Expert Quote', category: 'content', requiredBlockKey: 'expert_quote', allowedZones: ['main', 'full', 'sidebar'] }),
  medical_cta: define({ key: 'medical_cta', displayName: 'Medical Call-to-Action', category: 'content', requiredBlockKey: 'medical_cta', allowedZones: ['main', 'full', 'sidebar'] }),
  faq: define({ key: 'faq', displayName: 'Frequently Asked Questions', category: 'content', requiredBlockKey: 'faq', allowedZones: ['main', 'full'] }),
  feedback: define({ key: 'feedback', displayName: 'Helpful Feedback', category: 'content', requiredBlockKey: 'feedback', allowedZones: ['main', 'full'] }),
  share: define({ key: 'share', displayName: 'Share Controls', category: 'content', requiredBlockKey: 'share', allowedZones: ['main', 'full', 'sidebar'] }),
  medical_disclaimer: define({ key: 'medical_disclaimer', displayName: 'Medical Disclaimer', category: 'content', requiredBlockKey: 'disclaimer', allowedZones: ['main', 'full'] }),
  article_table_of_contents: define({ key: 'article_table_of_contents', displayName: 'Table of Contents', category: 'system', requiredBlockKey: null, allowedZones: ['sidebar', 'main', 'full'] }),
  appointment_card: define({ key: 'appointment_card', displayName: 'Appointment Booking Card', category: 'system', requiredBlockKey: null, allowedZones: ['sidebar', 'main', 'full'] }),
  newsletter_card: define({ key: 'newsletter_card', displayName: 'Newsletter Signup Card', category: 'system', requiredBlockKey: null, allowedZones: ['sidebar', 'main', 'full'] }),
  spacer: define({ key: 'spacer', displayName: 'Vertical Spacer', category: 'structural', requiredBlockKey: null, allowedZones: ['main', 'sidebar', 'full'] }),
  divider: define({ key: 'divider', displayName: 'Section Divider', category: 'structural', requiredBlockKey: null, allowedZones: ['main', 'sidebar', 'full'] })
};

export function isRegisteredComponentKey(key: string): key is RegisteredComponentKey {
  return key in REGISTERED_COMPONENTS;
}

export function getComponentDefinition(key: RegisteredComponentKey): ComponentDefinition {
  return REGISTERED_COMPONENTS[key];
}