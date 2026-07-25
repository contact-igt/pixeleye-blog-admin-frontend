'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Columns2, Eye, FilePlus2, Info, LockKeyhole, Rows3 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { CustomTemplatesPanel } from '@/components/blogs/custom-template/custom-templates-panel';
import { TemplatePreviewRenderer } from '@/components/blogs/templates/template-preview-renderer';
import { templateTwoSampleBlocks, templateTwoSampleContent, templateTwoSampleHtml } from '@/components/blogs/templates/template-two-sample';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, SectionCard } from '@/components/ui/card';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { getTemplate, listTemplates } from '@/services/template.service';
import type { BlogTemplateKey, TipTapDocument } from '@/types/blog';
import type { TemplateDetail, TemplateLibraryItem } from '@/types/template';

const sampleContent: TipTapDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Understanding your eye health' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Regular eye examinations can identify changes early and help your care team recommend appropriate next steps.' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'When to arrange a review' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Contact your clinician if you notice sudden vision changes, persistent discomfort, or new flashes and floaters.' }] }
  ]
};
const sampleHtml = '<h2>Understanding your eye health</h2><p>Regular eye examinations can identify changes early and help your care team recommend appropriate next steps.</p><h3>When to arrange a review</h3><p>Contact your clinician if you notice sudden vision changes, persistent discomfort, or new flashes and floaters.</p>';
const templateOneSampleProps = {
  image: null,
  showFeaturedImagePlaceholder: true,
  title: 'A practical guide to protecting your vision',
  excerpt: 'Learn the everyday habits and warning signs that can support lifelong eye health.',
  author: 'Pixel Eye clinical team',
  reviewer: 'Dr. Aanya Nair, MBBS, DNB Ophthalmology',
  readingTime: '6 min read',
  breadcrumb: ['Home', 'Health Library', 'Vision care'],
  category: 'Eye health',
  keyTakeaways: ['Routine checks help detect changes early.', 'Protective habits reduce the risk of strain and irritation.', 'Urgent symptoms should be evaluated promptly.'],
  comparisonCards: [
    { title: 'Routine review', description: 'Useful for preventive check-ins and ongoing monitoring.', image: null },
    { title: 'Urgent review', description: 'A shorter follow-up route for new or worsening symptoms.', image: null },
    { title: 'Emergency care', description: 'For sudden vision loss or severe discomfort, seek urgent care now.', image: null }
  ],
  numberedList: [
    { title: 'Cloudy or blurry vision', description: 'This can reflect changing focus, dryness or an underlying eye condition that deserves review.' },
    { title: 'Difficulty with night vision', description: 'A drop in night comfort can appear before a person notices broader symptoms.' },
    { title: 'Sensitivity to light and glare', description: 'This commonly accompanies inflammation, dryness, or changes in the eye surface.' }
  ],
  expertQuote: {
    quote: 'The most important step is to notice meaningful changes early, especially when they affect your daily routine.',
    name: 'Dr. Aanya Nair',
    role: 'Consultant Ophthalmologist'
  },
  medicalCta: {
    heading: 'Need urgent clinical guidance?',
    description: 'If your symptoms are sudden, severe, or affecting safety, reach out to your care team or local emergency support right away.',
    primaryLabel: 'Book urgent screen',
    secondaryLabel: 'Emergency contacts'
  },
  faqItems: [
    { question: 'How often should I schedule an eye review?', answer: 'Most people benefit from periodic eye checks according to age, symptoms and risk factors.' },
    { question: 'When should I seek urgent help?', answer: 'Seek immediate care if you notice sudden blurred vision, flashes, double vision, or severe pain.' }
  ],
  disclaimer: 'The information is for educational purposes and does not replace professional medical advice, diagnosis or treatment.'
};

function canCreate(role?: string) { return role === 'super_admin' || role === 'editor' || role === 'author'; }
function layoutLabel(layout: TemplateLibraryItem['layout']) { return layout === 'article_sidebar' ? 'Article + sidebar' : 'Single column'; }
function usageLabel(template: TemplateLibraryItem) { return template.usage.total_blog_count ? `Used by ${template.usage.total_blog_count} ${template.usage.total_blog_count === 1 ? 'Blog' : 'Blogs'}` : 'Not used by any Blogs yet'; }

function TemplateDiagram({ templateKey }: { templateKey: BlogTemplateKey }) {
  if (templateKey === 'template_1') return <div aria-hidden="true" className="grid h-40 grid-cols-[minmax(0,1fr)_28%] gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50 p-4"><div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><span className="block h-9 rounded bg-sky-100" /><span className="block h-2 w-4/5 rounded bg-slate-300" /><span className="block h-1.5 rounded bg-slate-200" /><span className="block h-1.5 w-5/6 rounded bg-slate-200" /><span className="block h-1.5 rounded bg-slate-200" /><span className="block h-1.5 w-3/4 rounded bg-slate-200" /></div><div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3"><span className="block h-2 w-3/4 rounded bg-sky-300" /><span className="block h-1.5 rounded bg-sky-200" /><span className="block h-1.5 w-5/6 rounded bg-sky-200" /><span className="block h-1.5 rounded bg-sky-200" /></div></div>;
  return <div aria-hidden="true" className="grid h-40 grid-cols-[minmax(0,1fr)_30%] gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50 p-5"><div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><span className="block h-10 rounded bg-sky-100" /><span className="block h-2 w-4/5 rounded bg-slate-300" /><span className="block h-1.5 rounded bg-slate-200" /><span className="block h-1.5 w-5/6 rounded bg-slate-200" /></div><div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3"><span className="block h-2 w-4/5 rounded bg-sky-300" /><span className="block h-1.5 rounded bg-sky-200" /><span className="block h-1.5 w-3/4 rounded bg-sky-200" /><span className="block h-1.5 w-5/6 rounded bg-sky-200" /></div></div>;
}

export default function TemplatesPage() {
  const { admin } = useAuth();
  const [templates, setTemplates] = useState<TemplateLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<TemplateLibraryItem | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTemplates((await listTemplates()).items); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Templates could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Loading is intentionally initiated when this protected workspace mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function openDetails(template: TemplateLibraryItem) {
    setDetailLoading(true); setError('');
    try { setDetail(await getTemplate(template.key)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Template details could not be loaded.'); }
    finally { setDetailLoading(false); }
  }

  return <div className="space-y-7">
    <PageHeader title="Templates" description="Choose a controlled layout for Pixel Eye Blog articles." />
    {error && <Alert variant="error" action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}

    <section aria-labelledby="system-templates-heading">
      <div className="mb-4"><h2 id="system-templates-heading" className="text-lg font-bold text-slate-950">System Templates</h2><p className="mt-1 text-sm text-slate-500">Approved, versioned layouts available to every article.</p></div>
      {loading ? <div aria-label="Loading templates" className="grid gap-5 md:grid-cols-2"><Skeleton className="h-[480px]" /><Skeleton className="h-[480px]" /></div> : (
        <div className="grid gap-5 md:grid-cols-2">
          {templates.map((template) => <Card as="article" key={template.key} className="flex min-w-0 flex-col p-0">
            <div className="p-5 pb-0"><TemplateDiagram templateKey={template.key} /></div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex flex-wrap gap-2"><StatusBadge status="System" size="sm" /><span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"><LockKeyhole size={11} aria-hidden="true" />Read-only</span></div><h3 className="text-lg font-bold text-slate-950">{template.name}</h3></div>{template.key === 'template_1' ? <Rows3 className="text-sky-600" aria-hidden="true" /> : <Columns2 className="text-sky-600" aria-hidden="true" />}</div>
              <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{template.description}</p>
              <dl className="mt-4 rounded-xl bg-slate-50 p-3 text-xs"><div><dt className="text-slate-500">Layout</dt><dd className="mt-1 font-bold text-slate-800">{layoutLabel(template.layout)}</dd></div></dl>
              <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-sm font-bold text-slate-800">{usageLabel(template)}</p><p className="mt-1 text-xs text-slate-500">{template.usage.draft_count} Drafts | {template.usage.published_count} Published Blogs</p></div>
              <p className="mt-3 text-xs text-slate-500">This system template cannot be edited or deleted.</p>
              <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2"><Button variant="outline" size="sm" onClick={() => setPreview(template)}><Eye size={15} aria-hidden="true" />View Preview</Button><Button variant="outline" size="sm" onClick={() => void openDetails(template)} disabled={detailLoading}><Info size={15} aria-hidden="true" />View Details</Button>{canCreate(admin?.role) && <Link href={`/blogs/create?template=${template.key}`} className="focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 sm:col-span-2"><FilePlus2 size={15} aria-hidden="true" />Create Blog with this Template</Link>}</div>
            </div>
          </Card>)}
        </div>
      )}
    </section>

    <SectionCard as="section" title={<span id="custom-templates-heading">Custom Templates</span>} subtitle="Reusable, versioned article layouts your team builds and manages." aria-labelledby="custom-templates-heading">
      <CustomTemplatesPanel />
    </SectionCard>

    <Drawer isOpen={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name ?? 'Template Details'} description="System template configuration and current usage." size="md">
      {detail && <div className="space-y-6"><div className="flex flex-wrap gap-2"><StatusBadge status="System" /><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"><LockKeyhole size={13} />Read-only</span></div><p className="text-sm leading-6 text-slate-600">{detail.description}</p><dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-slate-500">Template</dt><dd className="mt-1 font-semibold text-slate-900">{detail.name}</dd></div><div><dt className="text-slate-500">Layout</dt><dd className="mt-1 font-semibold text-slate-900">{layoutLabel(detail.layout)}</dd></div><div><dt className="text-slate-500">Usage</dt><dd className="mt-1 font-semibold text-slate-900">{detail.usage.total_blog_count} Blogs</dd></div></dl><div><h3 className="text-sm font-bold text-slate-900">Fixed regions</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{detail.regions.map((region) => <li key={region} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">{region.replaceAll('_', ' ')}</li>)}</ul></div><div><h3 className="text-sm font-bold text-slate-900">Supported behavior</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">{detail.supported_behaviors.map((behavior) => <li key={behavior}>{behavior}</li>)}</ul></div><div><h3 className="text-sm font-bold text-slate-900">Current usage</h3><p className="mt-2 text-sm text-slate-600">{detail.usage.draft_count} current Drafts | {detail.usage.published_count} current Published Blogs | {detail.usage.total_blog_count} distinct active Blogs</p></div></div>}
    </Drawer>

    <Modal isOpen={Boolean(preview)} onClose={() => setPreview(null)} title="Template Preview" description="This preview demonstrates the layout structure. Actual Blog content will replace the sample content." maxWidth="4xl">
      {preview && <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-7"><TemplatePreviewRenderer
        templateKey={preview.key}
        templateVersion={preview.key === 'template_1' ? 2 : preview.version}
        content={preview.key === 'template_2' ? templateTwoSampleContent : sampleContent}
        blocks={preview.key === 'template_2' ? templateTwoSampleBlocks : undefined}
        showFeaturedImagePlaceholder
        html={preview.key === 'template_2' ? templateTwoSampleHtml : sampleHtml}
        updatedAt="2026-07-23T00:00:00Z"
        {...(preview.key === 'template_1' ? templateOneSampleProps : { title: 'A practical guide to protecting your vision', excerpt: 'Learn the everyday habits and warning signs that can support lifelong eye health.', author: 'Pixel Eye clinical team' })}
      /></div>}
    </Modal>
  </div>;
}

