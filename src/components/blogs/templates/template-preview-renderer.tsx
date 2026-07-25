import { CustomTemplateRenderer } from '@/components/blogs/custom-template/custom-template-renderer';
import type { BlogTemplateKey, TipTapDocument } from '@/types/blog';
import type { BlogBlocksDocument } from '@/types/blog-blocks';
import { isSupportedTemplate } from './template-registry';
import { TemplateOnePreview, type TemplatePreviewProps } from './template-one-preview';
import { TemplateTwoPreview } from './template-two-preview';

export function TemplatePreviewRenderer({ templateKey, templateVersion, content, customTemplateConfig, blocks, html, title, excerpt, image, imageAlt, ...props }: TemplatePreviewProps & { templateKey: BlogTemplateKey | string; templateVersion: number; content?: TipTapDocument | null; customTemplateConfig?: unknown }) {
  if (templateKey === 'custom_template') {
    if (!customTemplateConfig) {
      return <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Save the Draft to preview this Custom Template layout.</div>;
    }
    return <CustomTemplateRenderer layoutConfig={customTemplateConfig} blocksDoc={blocks as BlogBlocksDocument | null | undefined} contentHtml={html} title={title} excerpt={excerpt} image={image} imageAlt={imageAlt} isPreview />;
  }
  if (!isSupportedTemplate(templateKey, templateVersion)) {
    return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This saved template version is not supported by the current Admin Preview.</div>;
  }
  return templateKey === 'template_2'
    ? <TemplateTwoPreview {...props} content={content} blocks={blocks} html={html} title={title} excerpt={excerpt} templateVersion={templateVersion} />
    : <TemplateOnePreview {...props} blocks={blocks} html={html} title={title} excerpt={excerpt} templateVersion={templateVersion} />;
}
