'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Columns2, Rows3 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { listBlogTemplates } from '@/services/blog.service';
import type { BlogTemplate, BlogTemplateKey } from '@/types/blog';
import { supportedTemplateVersions } from './template-registry';

function Diagram({ templateKey }: { templateKey: BlogTemplateKey }) {
  return templateKey === 'template_1' ? (
    <div aria-hidden="true" className="grid h-16 place-items-center rounded-lg border border-slate-200 bg-slate-50"><div className="h-11 w-1/2 space-y-1 rounded bg-white p-2 shadow-xs"><span className="block h-1.5 w-3/4 rounded bg-slate-300" /><span className="block h-1 w-full rounded bg-slate-200" /><span className="block h-1 w-5/6 rounded bg-slate-200" /><span className="block h-1 w-full rounded bg-slate-200" /></div></div>
  ) : (
    <div aria-hidden="true" className="grid h-16 grid-cols-[1fr_32%] gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5"><div className="space-y-1 rounded bg-white p-2 shadow-xs"><span className="block h-1.5 w-3/4 rounded bg-slate-300" /><span className="block h-1 w-full rounded bg-slate-200" /><span className="block h-1 w-5/6 rounded bg-slate-200" /></div><div className="space-y-1 rounded bg-sky-50 p-2"><span className="block h-1 w-full rounded bg-sky-200" /><span className="block h-1 w-3/4 rounded bg-sky-200" /><span className="block h-1 w-5/6 rounded bg-sky-200" /></div></div>
  );
}

export function TemplateSelector({ value, onChange, disabled = false }: { value: BlogTemplateKey; onChange: (key: BlogTemplateKey) => void; disabled?: boolean }) {
  const [templates, setTemplates] = useState<BlogTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await listBlogTemplates();
      const supported = result.filter((template) => supportedTemplateVersions[template.key]?.includes(template.version));
      if (supported.length !== 2) throw new Error('The two required system templates are unavailable.');
      setTemplates(supported);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Templates could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    listBlogTemplates()
      .then((result) => {
        if (!active) return;
        const supported = result.filter((template) => supportedTemplateVersions[template.key]?.includes(template.version));
        if (supported.length !== 2) throw new Error('The two required system templates are unavailable.');
        setTemplates(supported);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Templates could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div aria-label="Loading article templates" className="grid grid-cols-2 gap-2"><div className="h-36 animate-pulse rounded-xl bg-slate-100" /><div className="h-36 animate-pulse rounded-xl bg-slate-100" /></div>;
  if (error) return <Alert variant="error" action={<Button type="button" size="sm" variant="outline" onClick={() => void load()}>Retry</Button>}>{error}</Alert>;

  return (
    <div role="radiogroup" aria-label="Article template" className="grid gap-3">
      {templates.map((template) => {
        const selected = value === template.key;
        return (
          <label
            key={template.key}
            className={`relative block cursor-pointer rounded-xl border p-3 text-left transition focus-within:ring-4 focus-within:ring-sky-100 ${selected ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-200' : 'border-slate-200 bg-white hover:border-sky-300'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input type="radio" name="article-template" value={template.key} checked={selected} aria-checked={selected} disabled={disabled} onChange={() => onChange(template.key)} className="sr-only" />
            <Diagram templateKey={template.key} />
            <span className="mt-3 flex items-start justify-between gap-2"><span><span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">{template.key === 'template_1' ? <Rows3 size={14} /> : <Columns2 size={14} />}{template.name}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{template.description}</span></span>{selected && <CheckCircle2 size={17} className="shrink-0 text-sky-600" aria-hidden="true" />}</span>
          </label>
        );
      })}
    </div>
  );
}


