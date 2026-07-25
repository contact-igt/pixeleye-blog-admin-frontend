'use client';

import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import type { BlogTemplateKey, TipTapDocument } from '@/types/blog';
import type { BlogBlocksDocument } from '@/types/blog-blocks';
import type { MediaAsset } from '@/types/media';
import { TemplatePreviewRenderer } from './templates/template-preview-renderer';

export function ConfirmDialog({ open, title, message, confirmLabel, busy, onCancel, onConfirm }: { open: boolean; title: string; message: string; confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Drawer isOpen={open} onClose={onCancel} size="sm" title={title} footer={<><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</Button></>}><p className="text-sm font-semibold leading-6 text-slate-600">{message}</p></Drawer>;
}

export function PreviewDialog({ open, onClose, image, imageAlt, title, excerpt, html, content, blocks, blockMedia, seoTitle, seoDescription, slug, templateKey, templateVersion = 1, customTemplateConfig, author, updatedAt }: {
  open: boolean;
  onClose: () => void;
  image?: string | null;
  imageAlt?: string | null;
  title: string;
  excerpt: string;
  html: string;
  content?: TipTapDocument | null;
  blocks?: BlogBlocksDocument;
  blockMedia?: Record<string, Partial<MediaAsset>>;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  templateKey: BlogTemplateKey | string;
  templateVersion?: number;
  customTemplateConfig?: unknown;
  author?: string | null;
  updatedAt?: string | null;
}) {
  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      size="xl"
      title={<div><h2 className="font-bold text-slate-900">Admin Article Preview</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">Admin Preview — final public website styling may differ.</p></div>}
      footer={<Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-8">
        <TemplatePreviewRenderer templateKey={templateKey} templateVersion={templateVersion} content={content} customTemplateConfig={customTemplateConfig} blocks={blocks} blockMedia={blockMedia} image={image} imageAlt={imageAlt} title={title} excerpt={excerpt} html={html} author={author} updatedAt={updatedAt} />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">SEO Preview Summary</p>
          <p className="mt-2 text-base font-bold text-sky-700">{seoTitle || title || 'Untitled Blog'}</p>
          <p className="font-mono text-xs font-semibold text-emerald-700">pixeleye.com/blog/{slug || 'your-slug'}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{seoDescription || excerpt || 'No SEO description provided.'}</p>
        </div>
      </div>
    </Drawer>
  );
}
