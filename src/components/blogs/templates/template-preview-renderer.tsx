import type { BlogTemplateKey, TipTapDocument } from '@/types/blog';
import { isSupportedTemplate } from './template-registry';
import { TemplateOnePreview, type TemplatePreviewProps } from './template-one-preview';
import { TemplateTwoPreview } from './template-two-preview';

export function TemplatePreviewRenderer({ templateKey, templateVersion, content, ...props }: TemplatePreviewProps & { templateKey: BlogTemplateKey | string; templateVersion: number; content?: TipTapDocument | null }) {
  if (!isSupportedTemplate(templateKey, templateVersion)) {
    return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This saved template version is not supported by the current Admin Preview.</div>;
  }
  return templateKey === 'template_2'
    ? <TemplateTwoPreview {...props} content={content} templateVersion={templateVersion} />
    : <TemplateOnePreview {...props} templateVersion={templateVersion} />;
}
