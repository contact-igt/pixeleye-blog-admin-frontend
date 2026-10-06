import type { CustomTemplateComponentInstance, CustomTemplateSection } from './custom-template.types';

/**
 * Article-header placement (mirrors the public website).
 *
 * When a blog selects the "Article header" style, the Hero is not shown as a full-width banner where the
 * template placed it. It is rendered at the top of the first column of the first multi-column section
 * (Content + Sidebar / Two / Three column), directly above the article content. Sections that only held the
 * Hero are dropped so they leave no empty gap. Returns null when there is nothing to relocate.
 */
const HOST_LAYOUTS = ['content_sidebar', 'two_column', 'three_column'];

export interface ArticleHeaderPlan {
  heroId: string;
  hostSectionId: string;
  hostSlotId: string;
  emptiedSectionIds: Set<string>;
}

export function findFirstActiveHero(sections: CustomTemplateSection[]): CustomTemplateComponentInstance | null {
  for (const section of sections) {
    if (section.enabled === false) continue;
    for (const slot of section.slots) {
      for (const component of slot.components) {
        if (component.componentKey === 'hero' && component.enabled !== false) return component;
      }
    }
  }
  return null;
}

export function planArticleHeader(sections: CustomTemplateSection[], hero: CustomTemplateComponentInstance | null): ArticleHeaderPlan | null {
  if (!hero) return null;
  const active = sections.filter((section) => section.enabled !== false);
  const host = active.find((section) => HOST_LAYOUTS.includes(section.layout) && section.slots.length >= 2);
  if (!host) return null;

  const emptiedSectionIds = new Set<string>();
  for (const section of active) {
    if (section.id === host.id) continue;
    const components = section.slots.flatMap((slot) => slot.components.filter((component) => component.enabled !== false));
    const hasHero = components.some((component) => component.id === hero.id);
    const hasOtherContent = components.some((component) => component.id !== hero.id);
    if (hasHero && !hasOtherContent) emptiedSectionIds.add(section.id);
  }

  return { heroId: hero.id, hostSectionId: host.id, hostSlotId: host.slots[0].id, emptiedSectionIds };
}
