'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Save, Globe, CheckCircle, AlertTriangle, Info, Clock, User } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, SectionCard } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useAuth } from '@/components/auth/auth-provider';
import { createBlog, getPublishChecklist, publishBlog, unpublishBlog, updateBlog } from '@/services/blog.service';
import { ApiClientError } from '@/services/api-client';
import type { BlogDetail, BlogPayload, BlogTemplateKey, PublishChecklist, TipTapDocument } from '@/types/blog';
import type { MediaAsset } from '@/types/media';
import { normalizeBlogBlocks, type BlogBlocksDocument } from '@/types/blog-blocks';
import { RichTextEditor } from './rich-text-editor';
import { FeaturedMediaPicker } from './featured-media-picker';
import { ConfirmDialog, PreviewDialog } from './blog-dialogs';
import { TemplateSelector } from './templates/template-selector';
import { BlogBlockEditor } from './blocks/blog-block-editor';

const emptyDoc: TipTapDocument = { type: 'doc', content: [{ type: 'paragraph' }] };

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function canPublish(role?: string) {
  return role === 'super_admin' || role === 'editor';
}

function initialContent(value: unknown): TipTapDocument {
  // Backend may return content_json as a raw JSON string — parse it first
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { /* ignore, fall through */ }
  }
  if (value && typeof value === 'object' && (value as { type?: string }).type === 'doc') return value as TipTapDocument;
  const text = String((value as { text?: string } | null)?.text ?? '').trim();
  return text
    ? {
        type: 'doc',
        content: text.split(/\n{2,}/).map((paragraph) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: paragraph }],
        })),
      }
    : emptyDoc;
}

function fieldsFromError(message: string) {
  const lower = message.toLowerCase();
  const errors: Record<string, string> = {};
  for (const key of ['title', 'slug', 'excerpt', 'content', 'featured media', 'seo title', 'seo description', 'canonical', 'template']) {
    if (lower.includes(key)) {
      errors[
        key
          .replace('featured media', 'featured_media')
          .replace('seo title', 'seo_title')
          .replace('seo description', 'seo_description')
          .replace('canonical', 'canonical_url')
      ] = message;
    }
  }
  return errors;
}

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: TipTapDocument;
  featuredMediaId: string | null;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  templateKey: BlogTemplateKey;
  blocks: BlogBlocksDocument;
};

export function BlogForm({ blog, initialTemplateKey = 'template_1' }: { blog?: BlogDetail; initialTemplateKey?: BlogTemplateKey }) {
  const router = useRouter();
  const { admin } = useAuth();
  const draft = blog?.draft_version;
  const initial = useMemo<FormState>(
    () => ({
      title: draft?.title ?? '',
      slug: blog?.slug ?? '',
      excerpt: draft?.excerpt ?? '',
      content: initialContent(draft?.content_json),
      featuredMediaId: draft?.featured_media_id ?? blog?.featured_media?.id ?? null,
      seoTitle: draft?.seo_title ?? '',
      seoDescription: draft?.seo_description ?? '',
      canonicalUrl: draft?.canonical_url ?? '',
      templateKey: draft?.template_key ?? initialTemplateKey,
      blocks: normalizeBlogBlocks(draft?.blocks_json),
    }),
    [blog, draft, initialTemplateKey]
  );

  const [form, setForm] = useState(initial);
  const [current, setCurrent] = useState(blog);
  const [selectedMedia, setSelectedMedia] = useState<Partial<MediaAsset> | null>(blog?.featured_media ?? null);
  const [blockMedia, setBlockMedia] = useState<Record<string, Partial<MediaAsset>>>({});
  const [html, setHtml] = useState(draft?.content_html ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(blog?.slug));
  const [snapshot, setSnapshot] = useState(JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<PublishChecklist | null>(null);
  const [preview, setPreview] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const leaveAction = useRef<() => void>(() => undefined);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [savedTemplateKey, setSavedTemplateKey] = useState<BlogTemplateKey>(initial.templateKey);

  const dirty = JSON.stringify(form) !== snapshot;
  const templateSaved = current ? savedTemplateKey === form.templateKey : false;
  const selectedTemplateVersion = draft?.template_key === form.templateKey ? draft.template_version : form.templateKey === 'template_1' ? 2 : 1;
  const selectedTemplateName = form.templateKey === 'template_2' ? 'Template 2' : 'Template 1';
  const templateInstructions = form.templateKey === 'template_2'
    ? ['Add a featured image, title, excerpt, and article content.', 'Use H2, H3, or H4 headings in the editor to build the Table of Contents.', 'On desktop, content appears left and the Table of Contents appears right.']
    : ['Add a featured image, title, excerpt, and article content.', 'Use headings when helpful; this layout does not display a Table of Contents.', 'Content appears in one comfortable centered reading column.'];

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const change = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((old) => ({ ...old, [key]: value }));

  const payload = (): BlogPayload => ({
    title: form.title,
    slug: form.slug || undefined,
    excerpt: form.excerpt,
    content_json: form.content,
    featured_media_id: form.featuredMediaId,
    seo_title: form.seoTitle || null,
    seo_description: form.seoDescription || null,
    canonical_url: form.canonicalUrl || null,
    template_key: form.templateKey,
    blocks_json: form.blocks,
  });

  function confirmPersistedTemplate(saved: BlogDetail) {
    const persistedTemplate = saved.draft_version?.template_key;
    if (persistedTemplate && persistedTemplate !== form.templateKey) {
      throw new Error(`The Draft saved with ${persistedTemplate}, not the selected ${form.templateKey}. Please retry.`);
    }
    setSavedTemplateKey(persistedTemplate ?? form.templateKey);
  }
  async function saveDraft(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setFieldErrors({});
    try {
      const saved = current ? await updateBlog(current.id, payload()) : await createBlog(payload());
      confirmPersistedTemplate(saved);
      setCurrent(saved);
      const next: FormState = { ...form, slug: saved.slug || form.slug, blocks: normalizeBlogBlocks(saved.draft_version?.blocks_json) };
      setForm(next);
      setSnapshot(JSON.stringify(next));
      setSavedAt(new Date());
      setNotice(current ? 'Draft changes saved.' : 'Draft saved.');
      if (!current) router.replace(`/blogs/${saved.id}/edit`);
      return saved;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Blog save failed.';
      setError(message);
      setFieldErrors(caught instanceof ApiClientError && caught.errors.length ? Object.fromEntries(caught.errors.filter((item) => item.field).map((item) => [item.field!, item.message])) : fieldsFromError(message));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function refreshChecklist(id: string) {
    const result = await getPublishChecklist(id);
    setChecklist(result);
    return result;
  }

  async function publish() {
    setBusy(true);
    setError('');
    try {
      let target: BlogDetail | null | undefined = current;
      if (dirty) {
        target = await (async () => {
          try {
            const saved = current ? await updateBlog(current.id, payload()) : await createBlog(payload());
            confirmPersistedTemplate(saved);
            setCurrent(saved);
            setSnapshot(JSON.stringify(form));
            return saved;
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'Draft save failed.';
            setError(message);
            setFieldErrors(caught instanceof ApiClientError && caught.errors.length ? Object.fromEntries(caught.errors.filter((item) => item.field).map((item) => [item.field!, item.message])) : fieldsFromError(message));
            return null;
          }
        })();
      }
      if (!target) return;
      const checks = await refreshChecklist(target.id);
      if (!checks.ready) {
        setError('Complete the required publish checklist items.');
        return;
      }
      const published = await publishBlog(target.id);
      setCurrent(published);
      setSnapshot(JSON.stringify(form));
      setNotice(target.status === 'published' ? 'Blog updates published.' : 'Blog published.');
      setChecklist(await getPublishChecklist(target.id));
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Publish failed.';
      setError(message);
      setFieldErrors(caught instanceof ApiClientError && caught.errors.length ? Object.fromEntries(caught.errors.filter((item) => item.field).map((item) => [item.field!, item.message])) : fieldsFromError(message));
    } finally {
      setBusy(false);
    }
  }

  async function confirmUnpublish() {
    if (!current) return;
    setBusy(true);
    try {
      const result = await unpublishBlog(current.id);
      setCurrent(result);
      setNotice('Blog unpublished.');
      setUnpublishOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unpublish failed.');
    } finally {
      setBusy(false);
    }
  }

  const navigate = (action: () => void) => {
    if (!dirty) action();
    else {
      leaveAction.current = action;
      setLeaveOpen(true);
    }
  };

  const wasPublished = current?.status === 'published' || blog?.status === 'published';
  const publishLabel = wasPublished ? 'Publish Updates' : 'Publish';
  const showPublish = current && canPublish(admin?.role) && (current.status !== 'published' || dirty || current.has_unpublished_changes);

  return (
    <form onSubmit={saveDraft} className="space-y-6">
      {/* Sticky Header Action Bar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/75 p-3.5 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(() => router.push('/blogs'))}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </Button>

          <div className="hidden border-l border-slate-200 pl-3 sm:block">
            <p className="text-xs font-bold text-slate-900">{current ? 'Edit article' : 'Create article'}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <StatusBadge status={current?.status ?? 'draft'} size="sm" />
              <span className={`text-[11px] font-semibold ${dirty ? 'text-amber-700' : 'text-emerald-700'}`}>
                {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : 'Saved'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPreview(true)}>
            <Eye size={14} />
            <span>Preview</span>
          </Button>

          <Button type="submit" variant="secondary" size="sm" isLoading={busy}>
            <Save size={14} />
            <span>Save Draft</span>
          </Button>

          {showPublish && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={busy}
              disabled={current?.status === 'published' && !dirty && !current.has_unpublished_changes}
              onClick={publish}
            >
              <Globe size={14} />
              <span>{publishLabel}</span>
            </Button>
          )}

          {wasPublished && canPublish(admin?.role) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              onClick={() => setUnpublishOpen(true)}
            >
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {notice && <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert>}

      {/* Main 2-Column Grid Layout */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left Column: Title, Slug, Excerpt, Content */}
        <main className="space-y-6 min-w-0">
          <Card className="space-y-5 p-6 border border-slate-100 bg-white/80 backdrop-blur-md">
            <div>
              <p className="text-sm font-bold text-slate-800">Article basics</p>
              <p className="mt-1 text-xs text-slate-500">The information readers see before opening the article.</p>
            </div>
            <div>
              <Input
                label="Article Title"
                aria-label="Title"
                value={form.title}
                onChange={(event) => {
                  change('title', event.target.value);
                  if (!slugEdited) change('slug', slugify(event.target.value));
                }}
                placeholder="Enter clinical blog title..."
                className="text-lg font-bold"
                error={fieldErrors.title}
              />
            </div>

            <Input
              label="URL Slug"
              aria-label="Slug"
              value={form.slug}
              onChange={(event) => {
                change('slug', slugify(event.target.value));
                setSlugEdited(true);
              }}
              helperText={`URL: example.com/blog/${form.slug || 'your-slug'}`}
              error={fieldErrors.slug}
            />

            <div>
              <Textarea
                label="Summary / Excerpt"
                aria-label="Excerpt"
                value={form.excerpt}
                onChange={(event) => change('excerpt', event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Brief summary for listings and search previews..."
              />
              <span className="block text-right text-[11px] text-slate-400 mt-1">{form.excerpt.length}/500</span>
            </div>
          </Card>

          <SectionCard title="Write your article" className="border border-slate-100 bg-white/80 backdrop-blur-md">
            <RichTextEditor
              key={blog?.id ?? 'new'}
              value={form.content}
              onChange={(json, nextHtml) => {
                change('content', json);
                setHtml(nextHtml);
              }}
              error={fieldErrors.content}
            />
          </SectionCard>

          {((form.templateKey === 'template_1' && selectedTemplateVersion === 2) || form.templateKey === 'template_2') && <Card className="space-y-4 border border-slate-100 bg-white/80 p-6 backdrop-blur-md"><BlogBlockEditor value={form.blocks} onChange={(blocks) => change('blocks', blocks)} errors={fieldErrors} onMediaResolved={(id, media) => setBlockMedia((old) => media ? { ...old, [id]: media } : old)} /></Card>}
        </main>

        {/* Right Sidebar: Featured Image, SEO, Checklist, Metadata */}
        <aside aria-label="Blog settings" className="min-w-0 xl:self-start xl:sticky xl:top-36">
          <div className="flex min-w-0 flex-col gap-5">
          <SectionCard title="Article template" className="order-2 border border-slate-100 bg-white/80 backdrop-blur-md">
            <p className="mb-3 text-xs leading-5 text-slate-500">Choose one controlled layout. Both templates use the same Blog fields; only the article layout changes.</p>
            <TemplateSelector value={form.templateKey} onChange={(templateKey) => change('templateKey', templateKey)} disabled={busy} />
            <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-900">Selected: {selectedTemplateName}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${templateSaved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                  {current ? (templateSaved ? 'Saved in Draft' : 'Save Draft to apply') : 'Applies on first save'}
                </span>
              </div>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-slate-600">
                {templateInstructions.map((instruction) => <li key={instruction} className="flex gap-2"><span aria-hidden="true" className="text-sky-600">-</span><span>{instruction}</span></li>)}
              </ul>
              <p className="mt-2 border-t border-sky-100 pt-2 text-[11px] font-semibold text-slate-600">Save Draft needs a title of at least 3 characters. Publishing also requires excerpt, article content, and an active featured image with alt text.</p>
            </div>
            {current?.published_version?.template_key && current.published_version.template_key !== form.templateKey && (
              <div className="mt-3"><Alert variant="info">Template change is saved in Draft and will become public after Publish Updates.</Alert></div>
            )}
          </SectionCard>

          <SectionCard title="Featured image" className="order-3 border border-slate-100 bg-white/80 backdrop-blur-md">
            <FeaturedMediaPicker
              value={form.featuredMediaId}
              initial={selectedMedia}
              onChange={(id, media) => {
                change('featuredMediaId', id);
                setSelectedMedia(media);
              }}
              error={fieldErrors.featured_media}
            />
          </SectionCard>

          <details className="order-5 rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-xs backdrop-blur-md group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800">
              <span>Search & SEO</span>
              <span className="text-xs font-semibold text-slate-400 group-open:hidden">{[form.seoTitle, form.seoDescription, form.canonicalUrl].filter(Boolean).length}/3 complete</span>
              <span className="text-xs font-semibold text-sky-600 group-open:hidden">Configure</span>
              <span className="hidden text-xs font-semibold text-sky-600 group-open:inline">Hide</span>
            </summary>
            <p className="mt-1 pr-12 text-xs text-slate-500">Search title, description and canonical link for public search results.</p>
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
              <Input label="SEO Title" aria-label="SEO title" value={form.seoTitle} onChange={(event) => change('seoTitle', event.target.value)} maxLength={70} helperText={`${form.seoTitle.length}/60 recommended`} />
              <div>
                <Textarea label="SEO Description" aria-label="SEO description" value={form.seoDescription} onChange={(event) => change('seoDescription', event.target.value)} maxLength={170} rows={3} />
                <span className={`mt-1 block text-right text-[11px] ${form.seoDescription.length > 160 ? 'text-amber-600' : 'text-slate-400'}`}>{form.seoDescription.length}/160 recommended</span>
              </div>
              <Input label="Canonical URL" aria-label="Canonical URL" type="url" value={form.canonicalUrl} onChange={(event) => change('canonicalUrl', event.target.value)} placeholder="https://pixeleye.com/blog/..." />
              <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search preview</p>
                <p className="truncate text-xs font-bold text-sky-700">{form.seoTitle || form.title || 'Untitled Blog'}</p>
                <p className="font-mono text-[10px] font-semibold text-emerald-700">pixeleye.com/blog/{form.slug || 'your-slug'}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{form.seoDescription || form.excerpt || 'No SEO description provided yet.'}</p>
              </div>
            </div>
          </details>
          <SectionCard
            title="Publish readiness"
            className="order-1 border border-slate-100 bg-white/80 backdrop-blur-md"
            action={
              current ? (
                <button
                  type="button"
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
                  onClick={() => void refreshChecklist(current.id)}
                >
                  Refresh
                </button>
              ) : undefined
            }
          >
            {checklist ? (
              <ul className="space-y-2.5 text-xs">
                {checklist.items.map((item) => (
                  <li key={item.key} className="flex items-start gap-2.5 text-slate-600 font-semibold">
                    {item.status === 'complete' ? (
                      <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : item.status === 'warning' ? (
                      <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">{current ? 'Click refresh to validate draft status.' : 'Save draft to initialize checklist.'}</p>
            )}
          </SectionCard>

          <SectionCard title="Article details" className="order-4 border border-slate-100 bg-white/80 backdrop-blur-md">
            <div className="space-y-2.5 text-xs text-slate-600 font-semibold">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <span>Author: <strong className="text-slate-700 font-bold">{current?.author?.name ?? admin?.name ?? 'Current Admin'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span>Created: <strong className="text-slate-700 font-medium">{current?.created_at ? new Date(current.created_at).toLocaleString() : 'After first save'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span>Updated: <strong className="text-slate-700 font-medium">{current?.updated_at ? new Date(current.updated_at).toLocaleString() : 'After first save'}</strong></span>
              </div>
            </div>
          </SectionCard>
          </div>
        </aside>
      </div>

      <PreviewDialog
        open={preview}
        onClose={() => setPreview(false)}
        image={selectedMedia?.original_url}
        imageAlt={selectedMedia?.alt_text}
        title={form.title}
        excerpt={form.excerpt}
        html={html}
        seoTitle={form.seoTitle}
        seoDescription={form.seoDescription}
        slug={form.slug}
        templateKey={form.templateKey}
        templateVersion={selectedTemplateVersion}
        content={form.content}
        blocks={form.blocks}
        blockMedia={blockMedia}
        author={current?.author?.name ?? admin?.name}
        updatedAt={current?.updated_at}
      />

      <ConfirmDialog
        open={unpublishOpen}
        title="Unpublish this Blog?"
        message="The published snapshot will be retained, but the Blog status will change to Unpublished."
        confirmLabel="Unpublish"
        busy={busy}
        onCancel={() => setUnpublishOpen(false)}
        onConfirm={() => void confirmUnpublish()}
      />

      <ConfirmationDialog
        isOpen={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false);
          leaveAction.current();
        }}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this blog post. Are you sure you want to leave and lose your edits?"
        confirmText="Discard & Leave"
        variant="warning"
      />
    </form>
  );
}

