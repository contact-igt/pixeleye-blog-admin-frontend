import type { BlogTemplateKey } from '@/types/blog';

export const defaultTemplateKey: BlogTemplateKey = 'template_1';
export const supportedTemplateVersions: Readonly<Record<BlogTemplateKey, readonly number[]>> = {
  template_1: [1, 2],
  template_2: [1],
};

export function isSupportedTemplate(key: string, version: number): key is BlogTemplateKey {
  return (key === 'template_1' || key === 'template_2') && supportedTemplateVersions[key].includes(version);
}
