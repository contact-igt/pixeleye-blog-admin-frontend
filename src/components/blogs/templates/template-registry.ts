import type { BlogTemplateKey, SystemBlogTemplateKey } from '@/types/blog';

export const defaultTemplateKey: BlogTemplateKey = 'template_1';
export const supportedTemplateVersions: Readonly<Record<SystemBlogTemplateKey, readonly number[]>> = {
  template_1: [1, 2],
  template_2: [1],
};

export function isSupportedTemplate(key: string, version: number): key is SystemBlogTemplateKey {
  return (key === 'template_1' || key === 'template_2') && supportedTemplateVersions[key as SystemBlogTemplateKey].includes(version);
}

export function supportedVersionsFor(key: BlogTemplateKey): readonly number[] | undefined {
  return key === 'template_1' || key === 'template_2' ? supportedTemplateVersions[key] : undefined;
}
