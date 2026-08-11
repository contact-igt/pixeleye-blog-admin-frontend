import {
  CUSTOM_TEMPLATE_LIMITS,
  CUSTOM_TEMPLATE_SCHEMA_VERSION,
  type CustomTemplateComponentInstance,
  type CustomTemplateLayoutConfigV1
} from './custom-template.types';
import { getComponentDefinition, isRegisteredComponentKey } from './component-registry';
import type { BlogBlocksDocument } from '@/types/blog-blocks';
import {
  normalizeCustomTemplateSettings,
  PAGE_SETTING_OPTIONS,
  SECTION_SETTING_OPTIONS
} from './custom-template-settings';

export interface FrontendValidationError {
  path: string;
  message: string;
}

// Mirrors backend/src/modules/blogs/custom-templates/custom-template.schema.ts exactly so a
// layout accepted here is guaranteed to pass backend validation too.

const KNOWN_SECTION_LAYOUTS = SECTION_SETTING_OPTIONS.layout.map((option) => option.value);
const KNOWN_RESPONSIVE_STRATEGIES = SECTION_SETTING_OPTIONS.responsiveStrategy.map((option) => option.value);
const KNOWN_SECTION_BACKGROUNDS = SECTION_SETTING_OPTIONS.backgroundStyle.map((option) => option.value);
const KNOWN_CONTENT_WIDTHS = PAGE_SETTING_OPTIONS.contentWidth.map((option) => option.value);
const KNOWN_PAGE_BACKGROUNDS = PAGE_SETTING_OPTIONS.background.map((option) => option.value);
const KNOWN_SECTION_SPACINGS = PAGE_SETTING_OPTIONS.spacing.map((option) => option.value);
const KNOWN_TYPOGRAPHY_VARIANTS = PAGE_SETTING_OPTIONS.typography.map((option) => option.value);

const EXPECTED_SLOT_COUNTS: Record<string, number> = {
  full_width: 1,
  content_sidebar: 2,
  two_column: 2,
  three_column: 3
};

const MAX_LAYOUT_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_ID_LENGTH = 64;
const MAX_SLOT_NAME_LENGTH = 64;
const MAX_BLOCK_ID_LENGTH = 64;
const MAX_URL_LENGTH = 2048;
const SAFE_URL_PATTERN = /^(https?:\/\/|tel:|mailto:|\/)/i;
export const SAFE_BLOCK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string';
}

function checkText(value: unknown, maxLength: number, path: string, label: string, errors: FrontendValidationError[]): void {
  if (typeof value !== 'string') {
    errors.push({ path, message: `${label} must be a string.` });
    return;
  }
  if (value.trim().length > maxLength) {
    errors.push({ path, message: `${label} must be ${maxLength} characters or fewer.` });
  }
}

function checkEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
  label: string,
  errors: FrontendValidationError[]
): void {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    errors.push({ path, message: `${label} must be one of: ${allowed.join(', ')}.` });
  }
}

function checkBoolean(value: unknown, path: string, label: string, errors: FrontendValidationError[]): void {
  if (typeof value !== 'boolean') {
    errors.push({ path, message: `${label} must be a boolean.` });
  }
}

function checkSafeUrl(value: unknown, path: string, label: string, errors: FrontendValidationError[]): void {
  if (typeof value !== 'string') {
    errors.push({ path, message: `${label} must be a string.` });
    return;
  }
  if (value === '') return;
  if (value.trim().length > MAX_URL_LENGTH || !SAFE_URL_PATTERN.test(value.trim())) {
    errors.push({ path, message: `${label} must use HTTP, HTTPS, tel, mailto, or relative path (/) protocols.` });
  }
}

function checkNoUnknownKeys(
  obj: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  label: string,
  errors: FrontendValidationError[]
): void {
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.includes(key)) {
      errors.push({ path: `${path}.${key}`, message: `${label} contains unsupported field '${key}'.` });
    }
  }
}

// Component settings schemas: [allowed keys, per-key validator]
type SettingsValidator = (settings: Record<string, unknown>, path: string, errors: FrontendValidationError[]) => void;

const SETTINGS_VALIDATORS: Record<string, SettingsValidator> = {
  hero: (s, path, errors) => {
    checkNoUnknownKeys(s, ['height', 'alignment', 'overlay'], path, 'Hero settings', errors);
    checkEnum(s.height, ['compact', 'standard', 'tall'] as const, `${path}.height`, 'height', errors);
    checkEnum(s.alignment, ['left', 'center'] as const, `${path}.alignment`, 'alignment', errors);
    checkEnum(s.overlay, ['light', 'medium', 'strong'] as const, `${path}.overlay`, 'overlay', errors);
  },
  rich_article_content: (s, path, errors) => {
    checkNoUnknownKeys(s, ['fontSize', 'lineHeight'], path, 'Rich Article Content settings', errors);
    checkEnum(s.fontSize, ['small', 'medium', 'large'] as const, `${path}.fontSize`, 'fontSize', errors);
    checkEnum(s.lineHeight, ['normal', 'relaxed'] as const, `${path}.lineHeight`, 'lineHeight', errors);
  },
  key_takeaways: (s, path, errors) => {
    checkNoUnknownKeys(s, ['variant', 'columns'], path, 'Key Takeaways settings', errors);
    checkEnum(s.variant, ['soft', 'bordered'] as const, `${path}.variant`, 'variant', errors);
    checkEnum(s.columns, ['one', 'two'] as const, `${path}.columns`, 'columns', errors);
  },
  image_comparison: (s, path, errors) => {
    checkNoUnknownKeys(s, ['columns', 'imageRatio'], path, 'Image Comparison settings', errors);
    checkEnum(s.columns, ['one', 'two', 'three'] as const, `${path}.columns`, 'columns', errors);
    checkEnum(s.imageRatio, ['square', 'landscape'] as const, `${path}.imageRatio`, 'imageRatio', errors);
  },
  numbered_list: (s, path, errors) => {
    checkNoUnknownKeys(s, ['style'], path, 'Numbered List settings', errors);
    checkEnum(s.style, ['circle', 'simple'] as const, `${path}.style`, 'style', errors);
  },
  expert_quote: (s, path, errors) => {
    checkNoUnknownKeys(s, ['orientation', 'background'], path, 'Expert Quote settings', errors);
    checkEnum(s.orientation, ['horizontal', 'stacked'] as const, `${path}.orientation`, 'orientation', errors);
    checkEnum(s.background, ['soft', 'white'] as const, `${path}.background`, 'background', errors);
  },
  medical_cta: (s, path, errors) => {
    checkNoUnknownKeys(s, ['style', 'buttonLayout'], path, 'Medical CTA settings', errors);
    checkEnum(s.style, ['navy', 'blue'] as const, `${path}.style`, 'style', errors);
    checkEnum(s.buttonLayout, ['inline', 'stacked'] as const, `${path}.buttonLayout`, 'buttonLayout', errors);
  },
  faq: (s, path, errors) => {
    checkNoUnknownKeys(s, ['layout', 'defaultOpen'], path, 'FAQ settings', errors);
    checkEnum(s.layout, ['accordion', 'image_accordion'] as const, `${path}.layout`, 'layout', errors);
    checkEnum(s.defaultOpen, ['first', 'none'] as const, `${path}.defaultOpen`, 'defaultOpen', errors);
  },
  feedback: (s, path, errors) => {
    checkNoUnknownKeys(s, ['showPrompt'], path, 'Feedback settings', errors);
    checkBoolean(s.showPrompt, `${path}.showPrompt`, 'showPrompt', errors);
  },
  share: (s, path, errors) => {
    checkNoUnknownKeys(s, ['alignment'], path, 'Share settings', errors);
    checkEnum(s.alignment, ['left', 'center', 'right'] as const, `${path}.alignment`, 'alignment', errors);
  },
  medical_disclaimer: (s, path, errors) => {
    checkNoUnknownKeys(s, ['variant'], path, 'Medical Disclaimer settings', errors);
    checkEnum(s.variant, ['standard', 'prominent'] as const, `${path}.variant`, 'variant', errors);
  },
  article_table_of_contents: (s, path, errors) => {
    checkNoUnknownKeys(s, ['headingLevels', 'sticky'], path, 'Table of Contents settings', errors);
    if (!Array.isArray(s.headingLevels) || s.headingLevels.length < 1 || s.headingLevels.some((v) => v !== 2 && v !== 3 && v !== 4)) {
      errors.push({ path: `${path}.headingLevels`, message: 'headingLevels must be a non-empty array containing only 2, 3, or 4.' });
    }
    checkBoolean(s.sticky, `${path}.sticky`, 'sticky', errors);
  },
  appointment_card: (s, path, errors) => {
    checkNoUnknownKeys(s, ['heading', 'buttonLabel', 'targetUrl'], path, 'Appointment Card settings', errors);
    checkText(s.heading, MAX_NAME_LENGTH, `${path}.heading`, 'heading', errors);
    checkText(s.buttonLabel, 60, `${path}.buttonLabel`, 'buttonLabel', errors);
    checkSafeUrl(s.targetUrl, `${path}.targetUrl`, 'targetUrl', errors);
  },
  newsletter_card: (s, path, errors) => {
    checkNoUnknownKeys(s, ['heading', 'description', 'buttonLabel'], path, 'Newsletter Card settings', errors);
    checkText(s.heading, MAX_NAME_LENGTH, `${path}.heading`, 'heading', errors);
    checkText(s.description, 240, `${path}.description`, 'description', errors);
    checkText(s.buttonLabel, 60, `${path}.buttonLabel`, 'buttonLabel', errors);
  },
  spacer: (s, path, errors) => {
    checkNoUnknownKeys(s, ['size'], path, 'Spacer settings', errors);
    checkEnum(s.size, ['small', 'medium', 'large'] as const, `${path}.size`, 'size', errors);
  },
  divider: (s, path, errors) => {
    checkNoUnknownKeys(s, ['style'], path, 'Divider settings', errors);
    checkEnum(s.style, ['solid', 'dashed'] as const, `${path}.style`, 'style', errors);
  }
};

// Component keys whose instance schema must NOT carry a blockId field at all (system/structural).
const NO_BLOCK_ID_KEYS = new Set(['article_table_of_contents', 'appointment_card', 'newsletter_card', 'spacer', 'divider']);

export function validateFrontendCustomTemplateLayout(
  rawConfig: unknown,
  blocksDoc?: BlogBlocksDocument | null
): { valid: boolean; config: CustomTemplateLayoutConfigV1 | null; errors: FrontendValidationError[] } {
  const errors: FrontendValidationError[] = [];
  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    return { valid: false, config: null, errors: [{ path: 'root', message: 'Configuration must be an object.' }] };
  }

  const configObj = normalizeCustomTemplateSettings(rawConfig) as Partial<CustomTemplateLayoutConfigV1> & Record<string, unknown>;
  if (configObj.schemaVersion !== CUSTOM_TEMPLATE_SCHEMA_VERSION) {
    return {
      valid: false,
      config: null,
      errors: [{ path: 'schemaVersion', message: `Schema version ${String(configObj.schemaVersion)} is not supported.` }]
    };
  }

  checkNoUnknownKeys(configObj, ['schemaVersion', 'layoutId', 'metadata', 'page', 'sections'], 'root', 'Configuration', errors);
  checkText(configObj.layoutId, MAX_LAYOUT_ID_LENGTH, 'layoutId', 'layoutId', errors);

  if (!isPlainObject(configObj.metadata)) {
    errors.push({ path: 'metadata', message: 'metadata must be an object.' });
  } else {
    checkNoUnknownKeys(configObj.metadata, ['name', 'description'], 'metadata', 'metadata', errors);
    checkText(configObj.metadata.name, MAX_NAME_LENGTH, 'metadata.name', 'metadata.name', errors);
    checkText(configObj.metadata.description, MAX_DESCRIPTION_LENGTH, 'metadata.description', 'metadata.description', errors);
  }

  if (!isPlainObject(configObj.page)) {
    errors.push({ path: 'page', message: 'page must be an object.' });
  } else {
    checkNoUnknownKeys(configObj.page, ['contentWidth', 'background', 'spacing', 'typography'], 'page', 'page settings', errors);
    checkEnum(configObj.page.contentWidth, KNOWN_CONTENT_WIDTHS, 'page.contentWidth', 'page.contentWidth', errors);
    checkEnum(configObj.page.background, KNOWN_PAGE_BACKGROUNDS, 'page.background', 'page.background', errors);
    checkEnum(configObj.page.spacing, KNOWN_SECTION_SPACINGS, 'page.spacing', 'page.spacing', errors);
    checkEnum(configObj.page.typography, KNOWN_TYPOGRAPHY_VARIANTS, 'page.typography', 'page.typography', errors);
  }

  if (!configObj.sections || !Array.isArray(configObj.sections) || configObj.sections.length === 0) {
    errors.push({ path: 'sections', message: 'At least one section is required.' });
    return { valid: false, config: null, errors };
  }

  if (configObj.sections.length > CUSTOM_TEMPLATE_LIMITS.MAX_SECTIONS) {
    errors.push({
      path: 'sections',
      message: `Total sections (${configObj.sections.length}) exceeds maximum allowed (${CUSTOM_TEMPLATE_LIMITS.MAX_SECTIONS}).`
    });
  }

  const sectionIds = new Set<string>();
  const slotIds = new Set<string>();
  const componentIds = new Set<string>();
  const blockIdPaths = new Map<string, string>();
  let totalComponents = 0;

  configObj.sections.forEach((section: unknown, secIdx: number) => {
    const secPath = `sections[${secIdx}]`;
    if (!isPlainObject(section)) {
      errors.push({ path: secPath, message: 'Section must be an object.' });
      return;
    }

    checkNoUnknownKeys(
      section,
      ['id', 'layout', 'responsiveStrategy', 'enabled', 'background', 'settings', 'slots'],
      secPath,
      'Section',
      errors
    );
    checkText(section.id, MAX_ID_LENGTH, `${secPath}.id`, 'Section id', errors);
    if (isNonEmptyString(section.id)) {
      if (sectionIds.has(section.id)) {
        errors.push({ path: `${secPath}.id`, message: `Duplicate section ID: '${section.id}'` });
      }
      sectionIds.add(section.id);
    }

    checkEnum(section.layout, KNOWN_SECTION_LAYOUTS, `${secPath}.layout`, 'Section layout', errors);
    checkEnum(section.responsiveStrategy, KNOWN_RESPONSIVE_STRATEGIES, `${secPath}.responsiveStrategy`, 'Section responsiveStrategy', errors);
    checkBoolean(section.enabled, `${secPath}.enabled`, 'Section enabled', errors);
    if (section.background !== undefined) {
      checkEnum(section.background, KNOWN_SECTION_BACKGROUNDS, `${secPath}.background`, 'Section background', errors);
    }

    if (section.settings !== undefined) {
      if (!isPlainObject(section.settings)) {
        errors.push({ path: `${secPath}.settings`, message: 'settings must be an object.' });
      } else {
        const allowedWidths = [...KNOWN_CONTENT_WIDTHS, 'inherit'];
        const allowedBackgrounds = [...KNOWN_SECTION_BACKGROUNDS, 'inherit'];
        const allowedSpacings = [...KNOWN_SECTION_SPACINGS, 'inherit'];
        checkNoUnknownKeys(section.settings, ['width', 'backgroundStyle', 'paddingTop', 'paddingBottom'], `${secPath}.settings`, 'Section settings', errors);
        if (section.settings.width !== undefined) checkEnum(section.settings.width, allowedWidths as string[], `${secPath}.settings.width`, 'settings.width', errors);
        if (section.settings.backgroundStyle !== undefined) checkEnum(section.settings.backgroundStyle, allowedBackgrounds as string[], `${secPath}.settings.backgroundStyle`, 'settings.backgroundStyle', errors);
        if (section.settings.paddingTop !== undefined) checkEnum(section.settings.paddingTop, allowedSpacings as string[], `${secPath}.settings.paddingTop`, 'settings.paddingTop', errors);
        if (section.settings.paddingBottom !== undefined) checkEnum(section.settings.paddingBottom, allowedSpacings as string[], `${secPath}.settings.paddingBottom`, 'settings.paddingBottom', errors);
      }
    }

    if (!Array.isArray(section.slots)) {
      errors.push({ path: `${secPath}.slots`, message: 'slots must be an array.' });
      return;
    }

    const layoutKey = typeof section.layout === 'string' ? section.layout : undefined;
    const slots: unknown[] = section.slots;
    const expectedSlots = layoutKey ? EXPECTED_SLOT_COUNTS[layoutKey] : undefined;
    if (expectedSlots !== undefined && slots.length !== expectedSlots) {
      errors.push({
        path: `${secPath}.slots`,
        message: `Layout '${layoutKey}' requires exactly ${expectedSlots} slot(s), but found ${slots.length}.`
      });
    }
    if (slots.length > CUSTOM_TEMPLATE_LIMITS.MAX_SLOTS_PER_SECTION) {
      errors.push({
        path: `${secPath}.slots`,
        message: `Total slots (${slots.length}) exceeds maximum allowed (${CUSTOM_TEMPLATE_LIMITS.MAX_SLOTS_PER_SECTION}).`
      });
    }

    slots.forEach((slot: unknown, slotIdx: number) => {
      const slotPath = `${secPath}.slots[${slotIdx}]`;
      if (!isPlainObject(slot)) {
        errors.push({ path: slotPath, message: 'Slot must be an object.' });
        return;
      }

      checkNoUnknownKeys(slot, ['id', 'name', 'components'], slotPath, 'Slot', errors);
      checkText(slot.id, MAX_ID_LENGTH, `${slotPath}.id`, 'Slot id', errors);
      if (isNonEmptyString(slot.id)) {
        if (slotIds.has(slot.id)) {
          errors.push({ path: `${slotPath}.id`, message: `Duplicate slot ID: '${slot.id}'` });
        }
        slotIds.add(slot.id);
      }
      checkText(slot.name, MAX_SLOT_NAME_LENGTH, `${slotPath}.name`, 'Slot name', errors);

      if (!Array.isArray(slot.components)) {
        errors.push({ path: `${slotPath}.components`, message: 'components must be an array.' });
        return;
      }

      const components: unknown[] = slot.components;
      if (components.length > CUSTOM_TEMPLATE_LIMITS.MAX_COMPONENTS_PER_SLOT) {
        errors.push({
          path: `${slotPath}.components`,
          message: `Total components (${components.length}) exceeds maximum allowed per slot (${CUSTOM_TEMPLATE_LIMITS.MAX_COMPONENTS_PER_SLOT}).`
        });
      }

      const sectionLayoutForZone = layoutKey;
      const slotIdxForZone = slotIdx;
      components.forEach((rawComp: unknown, compIdx: number) => {
        totalComponents++;
        const compPath = `${slotPath}.components[${compIdx}]`;
        if (!isPlainObject(rawComp)) {
          errors.push({ path: compPath, message: 'Component must be an object.' });
          return;
        }
        const comp = rawComp as Partial<CustomTemplateComponentInstance> & Record<string, unknown>;

        checkText(comp.id, MAX_ID_LENGTH, `${compPath}.id`, 'Component id', errors);
        if (isNonEmptyString(comp.id)) {
          if (componentIds.has(comp.id)) {
            errors.push({ path: `${compPath}.id`, message: `Duplicate component ID: '${comp.id}'` });
          }
          componentIds.add(comp.id);
        }

        checkBoolean(comp.enabled, `${compPath}.enabled`, 'Component enabled', errors);

        if (typeof comp.componentKey !== 'string' || !isRegisteredComponentKey(comp.componentKey)) {
          errors.push({ path: `${compPath}.componentKey`, message: `Unknown component key: '${String(comp.componentKey)}'` });
          return;
        }

        const def = getComponentDefinition(comp.componentKey);
        const expectedKeys = NO_BLOCK_ID_KEYS.has(comp.componentKey)
          ? ['id', 'componentKey', 'settings', 'enabled']
          : ['id', 'componentKey', 'blockId', 'settings', 'enabled'];
        checkNoUnknownKeys(comp, expectedKeys, compPath, `Component '${comp.componentKey}'`, errors);

        // Zone validation
        const zone =
          sectionLayoutForZone === 'content_sidebar' && slotIdxForZone === 1
            ? 'sidebar'
            : sectionLayoutForZone === 'full_width'
              ? 'full'
              : 'main';
        if (!def.allowedZones.includes(zone)) {
          errors.push({
            path: `${compPath}.componentKey`,
            message: `Component '${comp.componentKey}' is not allowed in zone '${zone}'. Allowed zones: ${def.allowedZones.join(', ')}.`
          });
        }

        // Block-reference rules. IDs are generated by the builder and are immutable in the settings panel.
        if (def.requiresBlockId) {
          checkText(comp.blockId, MAX_BLOCK_ID_LENGTH, `${compPath}.blockId`, 'blockId', errors);
          const blockId = typeof comp.blockId === 'string' ? comp.blockId : '';
          if (!blockId) {
            errors.push({ path: `${compPath}.blockId`, message: `Content component '${comp.componentKey}' requires a blockId.` });
          } else {
            if (!SAFE_BLOCK_ID_PATTERN.test(blockId)) {
              errors.push({ path: `${compPath}.blockId`, message: 'blockId may contain only letters, numbers, hyphens, and underscores.' });
            }
            if (comp.componentKey !== 'rich_article_content' && blockId === 'article_content') {
              errors.push({ path: `${compPath}.blockId`, message: "The 'article_content' blockId is reserved for Rich Article Content." });
            }
            if (blockId !== 'article_content') {
              const firstPath = blockIdPaths.get(blockId);
              if (firstPath) {
                errors.push({ path: `${compPath}.blockId`, message: `Duplicate blockId '${blockId}'. First used at ${firstPath}.` });
              } else {
                blockIdPaths.set(blockId, `${compPath}.blockId`);
              }
            }
            const placementEnabled = section.enabled !== false && comp.enabled !== false;
            if (blocksDoc && placementEnabled && blockId !== 'article_content') {
              const instance = blocksDoc.custom_instances?.[blockId];
              if (!instance) {
                errors.push({ path: `${compPath}.blockId`, message: `Referenced block '${blockId}' not found in blocks_json.custom_instances.` });
              } else if (instance.componentKey !== comp.componentKey) {
                errors.push({ path: `${compPath}.blockId`, message: `Referenced block '${blockId}' contains '${instance.componentKey}', not '${comp.componentKey}'.` });
              }
            }
          }
        } else if (comp.blockId !== undefined && comp.blockId !== null) {
          errors.push({ path: `${compPath}.blockId`, message: `Non-content component '${comp.componentKey}' must not specify a blockId.` });
        }

        // Settings validation
        if (!isPlainObject(comp.settings)) {
          errors.push({ path: `${compPath}.settings`, message: 'settings must be an object.' });
        } else {
          const validator = SETTINGS_VALIDATORS[comp.componentKey];
          if (validator) {
            validator(comp.settings as Record<string, unknown>, `${compPath}.settings`, errors);
          }
        }
      });
    });
  });

  if (totalComponents > CUSTOM_TEMPLATE_LIMITS.MAX_TOTAL_COMPONENTS) {
    errors.push({ path: 'sections', message: `Total components (${totalComponents}) exceeds maximum limit.` });
  }

  const valid = errors.length === 0;
  return { valid, config: valid ? (configObj as CustomTemplateLayoutConfigV1) : null, errors };
}
