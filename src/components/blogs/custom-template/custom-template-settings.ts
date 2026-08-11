import { isRegisteredComponentKey } from './component-registry';
import type {
  CustomTemplateLayoutConfigV1,
  CustomTemplateContentWidth,
  CustomTemplatePageSettings,
  CustomTemplateResponsiveStrategy,
  CustomTemplateSectionLayout,
  RegisteredComponentKey
} from './custom-template.types';

export const PAGE_SETTING_OPTIONS = Object.freeze({
  contentWidth: [
    { label: 'Narrow (max-w-2xl)', value: 'narrow' },
    { label: 'Standard (max-w-4xl)', value: 'standard' },
    { label: 'Wide (max-w-6xl)', value: 'wide' },
    { label: 'Full Width (100%)', value: 'full' }
  ],
  background: [
    { label: 'White Plain', value: 'white' },
    { label: 'Soft Slated Gray', value: 'soft_gray' },
    { label: 'Brand Tinted Blue', value: 'brand_tint' }
  ],
  spacing: [
    { label: 'Compact Spacing', value: 'compact' },
    { label: 'Normal Standard Spacing', value: 'normal' },
    { label: 'Spacious Paddings', value: 'spacious' }
  ],
  typography: [
    { label: 'Editorial (Serif Content)', value: 'editorial' },
    { label: 'Modern Sans', value: 'modern' },
    { label: 'Clinical Monospace accents', value: 'clinical' }
  ]
} as const);

export const SECTION_SETTING_OPTIONS = Object.freeze({
  enabled: [
    { label: 'Enabled (active)', value: 'true' },
    { label: 'Disabled (hidden)', value: 'false' }
  ],
  layout: [
    { label: 'Full Width Row (1 Slot)', value: 'full_width' },
    { label: 'Split Content + Sidebar (2 Slots)', value: 'content_sidebar' },
    { label: 'Two Equal Columns (2 Slots)', value: 'two_column' },
    { label: 'Three Equal Columns (3 Slots)', value: 'three_column' }
  ],
  responsiveStrategy: [
    { label: 'Stack items vertically on mobile screen', value: 'stack_on_mobile' },
    { label: 'Push Sidebar below content grid on tablets', value: 'sidebar_below_on_tablet' },
    { label: 'Keep Equal column widths always', value: 'equal_columns' },
    { label: 'Main flow + Side section grid', value: 'main_sidebar' },
    { label: 'Adapt 3-cols to 2-cols to 1-col grids', value: 'three_to_two_to_one' }
  ],
  width: [
    { label: 'Inherit (Use Page Default)', value: 'inherit' },
    ...PAGE_SETTING_OPTIONS.contentWidth
  ],
  backgroundStyle: [
    { label: 'Inherit (Use Page Default)', value: 'inherit' },
    { label: 'Plain White', value: 'white' },
    { label: 'Soft Slate Block', value: 'slate' },
    { label: 'Clean Blue Sky Tint', value: 'sky' }
  ],
  paddingTop: [
    { label: 'Inherit (Use Page Default)', value: 'inherit' },
    ...PAGE_SETTING_OPTIONS.spacing
  ],
  paddingBottom: [
    { label: 'Inherit (Use Page Default)', value: 'inherit' },
    ...PAGE_SETTING_OPTIONS.spacing
  ]
} as const);

export const DEFAULT_CUSTOM_TEMPLATE_PAGE_SETTINGS: Readonly<CustomTemplatePageSettings> = Object.freeze({
  contentWidth: 'full',
  background: 'white',
  spacing: 'normal',
  typography: 'editorial'
});

const DEFAULT_COMPONENT_SETTINGS: Record<RegisteredComponentKey, Record<string, unknown>> = {
  hero: { height: 'standard', alignment: 'left', overlay: 'medium' },
  rich_article_content: { fontSize: 'medium', lineHeight: 'relaxed' },
  key_takeaways: { variant: 'soft', columns: 'one' },
  image_comparison: { columns: 'two', imageRatio: 'landscape' },
  numbered_list: { style: 'circle' },
  expert_quote: { orientation: 'horizontal', background: 'soft' },
  medical_cta: { style: 'navy', buttonLayout: 'inline' },
  faq: { layout: 'accordion', defaultOpen: 'none' },
  feedback: { showPrompt: true },
  share: { alignment: 'center' },
  medical_disclaimer: { variant: 'standard' },
  article_table_of_contents: { headingLevels: [2, 3, 4], sticky: true },
  appointment_card: { heading: 'Book an Appointment', buttonLabel: 'Schedule Now', targetUrl: 'https://example.com/appointments' },
  newsletter_card: { heading: 'Subscribe to Newsletter', description: 'Get health tips.', buttonLabel: 'Subscribe' },
  spacer: { size: 'medium' },
  divider: { style: 'solid' }
};

export function getDefaultComponentSettings(componentKey: RegisteredComponentKey): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_COMPONENT_SETTINGS[componentKey]));
}

export function defaultResponsiveStrategy(layout: CustomTemplateSectionLayout): CustomTemplateResponsiveStrategy {
  return layout === 'content_sidebar' ? 'sidebar_below_on_tablet' : 'stack_on_mobile';
}

/** Supplies defaults while retaining unsupported values so strict validation can report them. */
export function normalizeCustomTemplateSettings(rawConfig: unknown): unknown {
  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) return rawConfig;
  const config = JSON.parse(JSON.stringify(rawConfig)) as Record<string, any>;
  const page = config.page && typeof config.page === 'object' && !Array.isArray(config.page) ? config.page : {};
  config.page = { ...DEFAULT_CUSTOM_TEMPLATE_PAGE_SETTINGS, ...page };

  if (!Array.isArray(config.sections)) return config;
  let hasMainArticleContent = false;
  config.sections = config.sections.map((rawSection: unknown) => {
    if (!rawSection || typeof rawSection !== 'object' || Array.isArray(rawSection)) return rawSection;
    const section = rawSection as Record<string, any>;
    const normalizedSection: Record<string, any> = {
      ...section,
      enabled: section.enabled ?? true,
      responsiveStrategy: section.responsiveStrategy ?? defaultResponsiveStrategy(section.layout),
    };
    
    // Legacy support: read background into settings if settings.backgroundStyle is missing
    const legacyBackground = section.background || 'white';
    
    normalizedSection.settings = {
      width: 'inherit',
      backgroundStyle: legacyBackground,
      paddingTop: 'inherit',
      paddingBottom: 'inherit',
      ...(section.settings || {})
    };
    
    // Delete legacy background property from normalized output to avoid storing duplicates
    delete normalizedSection.background;

    if (!Array.isArray(section.slots)) return normalizedSection;
    normalizedSection.slots = section.slots.map((rawSlot: unknown) => {
      if (!rawSlot || typeof rawSlot !== 'object' || Array.isArray(rawSlot)) return rawSlot;
      const slot = rawSlot as Record<string, any>;
      if (!Array.isArray(slot.components)) return slot;
      return {
        ...slot,
        components: slot.components.map((rawComponent: unknown) => {
          if (!rawComponent || typeof rawComponent !== 'object' || Array.isArray(rawComponent)) return rawComponent;
          const component = rawComponent as Record<string, any>;
          if (typeof component.componentKey !== 'string' || !isRegisteredComponentKey(component.componentKey)) return component;
          const settings = component.settings && typeof component.settings === 'object' && !Array.isArray(component.settings)
            ? { ...component.settings }
            : {};
          if (component.componentKey === 'spacer' && settings.size === undefined && settings.height !== undefined) {
            settings.size = settings.height;
            delete settings.height;
          }
          if (component.componentKey === 'divider' && settings.style === undefined && settings.variant !== undefined) {
            settings.style = settings.variant === 'dots' ? 'dashed' : settings.variant;
            delete settings.variant;
          }
          let blockId = component.blockId;
          if (component.componentKey === 'rich_article_content') {
            if (!hasMainArticleContent) {
              hasMainArticleContent = true;
              blockId = blockId || 'article_content';
            } else if (!blockId || blockId === 'article_content') {
              blockId = component.id ? `article_${component.id}` : `rich_article_extra_${Math.random().toString(36).slice(2, 8)}`;
            }
          }
          return {
            ...component,
            ...(blockId ? { blockId } : {}),
            enabled: component.enabled ?? true,
            settings: { ...getDefaultComponentSettings(component.componentKey), ...settings }
          };
        })
      };
    });
    return normalizedSection;
  });
  return config;
}

export function pageWidthClass(value: CustomTemplatePageSettings['contentWidth']): string {
  return value === 'narrow' ? 'max-w-2xl' : value === 'standard' ? 'max-w-4xl' : value === 'wide' ? 'max-w-6xl' : 'max-w-none';
}

export function defaultSectionContentWidth(layout?: CustomTemplateSectionLayout): CustomTemplateContentWidth {
  return layout === 'full_width' ? 'full' : 'wide';
}

export function pageSpacingClasses(value: CustomTemplatePageSettings['spacing']): { gap: string; padding: string } {
  if (value === 'compact') return { gap: 'space-y-6', padding: 'py-5' };
  if (value === 'spacious') return { gap: 'space-y-16', padding: 'py-12' };
  return { gap: 'space-y-10', padding: 'py-8' };
}

export function pageTypographyClass(value: CustomTemplatePageSettings['typography']): string {
  const headings = value === 'editorial'
    ? '[&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_h4]:font-serif'
    : value === 'clinical'
      ? '[&_h1]:font-mono [&_h2]:font-mono [&_h3]:font-mono [&_h4]:font-mono'
      : '[&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_h4]:font-sans';
  return value === 'editorial'
    ? `font-serif ${headings}`
    : value === 'clinical'
      ? `font-mono tracking-wide ${headings}`
      : `font-sans tracking-tight ${headings}`;
}

function staticLayoutClass(layout: CustomTemplateSectionLayout, equal = false): string {
  if (layout === 'full_width') return 'grid grid-cols-1 gap-6';
  if (layout === 'three_column') return 'grid grid-cols-3 gap-6';
  if (layout === 'content_sidebar' && !equal) return 'grid grid-cols-[minmax(0,1fr)_minmax(260px,340px)] gap-8';
  return 'grid grid-cols-2 gap-6';
}

export function sectionGridClass(
  layout: CustomTemplateSectionLayout,
  strategy: CustomTemplateResponsiveStrategy,
  previewDevice?: 'desktop' | 'tablet' | 'mobile'
): string {
  if (previewDevice === 'mobile') return 'grid grid-cols-1 gap-6';
  if (previewDevice === 'tablet') {
    if (strategy === 'sidebar_below_on_tablet' || strategy === 'main_sidebar') return 'grid grid-cols-1 gap-6';
    if (strategy === 'three_to_two_to_one') return 'grid grid-cols-2 gap-6';
    return staticLayoutClass(layout, strategy === 'equal_columns');
  }
  if (strategy === 'main_sidebar') return 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] gap-8';
  if (strategy === 'three_to_two_to_one') return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  if (strategy === 'sidebar_below_on_tablet') {
    if (layout === 'full_width') return 'grid grid-cols-1 gap-6';
    if (layout === 'three_column') return 'grid grid-cols-1 lg:grid-cols-3 gap-6';
    if (layout === 'content_sidebar') return 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] gap-8';
    return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
  }
  if (strategy === 'equal_columns') {
    if (layout === 'full_width') return 'grid grid-cols-1 gap-6';
    if (layout === 'three_column') return 'grid grid-cols-1 md:grid-cols-3 gap-6';
    return 'grid grid-cols-1 md:grid-cols-2 gap-6';
  }
  if (layout === 'full_width') return 'grid grid-cols-1 gap-6';
  if (layout === 'content_sidebar') return 'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] gap-8';
  if (layout === 'three_column') return 'grid grid-cols-1 md:grid-cols-3 gap-6';
  return 'grid grid-cols-1 md:grid-cols-2 gap-6';
}

export function asNormalizedCustomTemplateConfig(rawConfig: unknown): CustomTemplateLayoutConfigV1 {
  return normalizeCustomTemplateSettings(rawConfig) as CustomTemplateLayoutConfigV1;
}

export function resolveSectionSettings(
  pageSettings: CustomTemplatePageSettings,
  sectionSettings?: { width?: string; backgroundStyle?: string; paddingTop?: string; paddingBottom?: string; },
  sectionLayout?: CustomTemplateSectionLayout
) {
  const inheritedWidth = pageSettings.contentWidth === 'full' ? defaultSectionContentWidth(sectionLayout) : pageSettings.contentWidth;
  return {
    width: sectionSettings?.width && sectionSettings.width !== 'inherit' ? sectionSettings.width : inheritedWidth,
    backgroundStyle: sectionSettings?.backgroundStyle && sectionSettings.backgroundStyle !== 'inherit' ? sectionSettings.backgroundStyle : pageSettings.background,
    paddingTop: sectionSettings?.paddingTop && sectionSettings.paddingTop !== 'inherit' ? sectionSettings.paddingTop : pageSettings.spacing,
    paddingBottom: sectionSettings?.paddingBottom && sectionSettings.paddingBottom !== 'inherit' ? sectionSettings.paddingBottom : pageSettings.spacing,
  };
}

export function sectionWidthClass(width: string): string {
  return width === 'narrow' ? 'max-w-2xl' : width === 'standard' ? 'max-w-4xl' : width === 'wide' ? 'max-w-6xl' : 'max-w-none';
}

export function sectionBackgroundClass(bg: string): string {
  if (bg === 'sky') return 'bg-sky-50/80';
  if (bg === 'slate' || bg === 'soft_gray') return 'bg-slate-100';
  if (bg === 'brand_tint') return 'bg-sky-50/40';
  return 'bg-white';
}

export function sectionPaddingClass(paddingTop: string, paddingBottom: string, previewDevice?: 'desktop' | 'tablet' | 'mobile'): string {
  if (previewDevice === 'mobile') return 'py-4';
  
  let pt = 'pt-6';
  if (paddingTop === 'compact') pt = 'pt-5';
  else if (paddingTop === 'spacious') pt = 'pt-12';
  else if (paddingTop === 'normal') pt = 'pt-8';

  let pb = 'pb-6';
  if (paddingBottom === 'compact') pb = 'pb-5';
  else if (paddingBottom === 'spacious') pb = 'pb-12';
  else if (paddingBottom === 'normal') pb = 'pb-8';

  return `${pt} ${pb}`;
}
