import type { CustomTemplateSection } from './custom-template.types';

export const HERO_LIMIT_MESSAGE = 'Only one Hero Banner is allowed per template. Remove or disable the existing Hero Banner first.';

/** Hero placements that actually produce Blog content (enabled component in an enabled section). */
export function countActiveHeroes(sections: Pick<CustomTemplateSection, 'enabled' | 'slots'>[]): number {
  let count = 0;
  for (const section of sections) {
    if (section.enabled === false) continue;
    for (const slot of section.slots) {
      for (const component of slot.components) {
        if (component.componentKey === 'hero' && component.enabled !== false) count += 1;
      }
    }
  }
  return count;
}
