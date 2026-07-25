'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, LayoutTemplate } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { listCustomTemplates } from '@/services/custom-templates.service';
import { ApiClientError } from '@/services/api-client';
import type { CustomTemplateSummary } from '@/types/custom-templates';

export function CustomTemplateSelector({ value, onChange, disabled = false }: { value: string | null; onChange: (id: string, template: CustomTemplateSummary) => void; disabled?: boolean }) {
  const [templates, setTemplates] = useState<CustomTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listCustomTemplates({ status: 'active', limit: 100, sort_by: 'name', sort_order: 'asc' });
      setTemplates(result.items ?? []);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Custom Templates could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading is intentionally initiated when this selector mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) return <div aria-label="Loading Custom Templates" className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  if (error) return <Alert variant="error" action={<Button type="button" size="sm" variant="outline" onClick={() => void load()}>Retry</Button>}>{error}</Alert>;
  if (templates.length === 0) return <p className="text-xs text-slate-500">No active Custom Templates are available yet.</p>;

  return (
    <div role="radiogroup" aria-label="Custom template" className="grid gap-2">
      {templates.map((template) => {
        const selected = value === template.id;
        return (
          <label key={template.id} className={`relative flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${selected ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-200' : 'border-slate-200 bg-white hover:border-sky-300'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
            <input type="radio" name="custom-article-template" value={template.id} checked={selected} aria-checked={selected} disabled={disabled} onChange={() => onChange(template.id, template)} className="sr-only" />
            <span className="flex min-w-0 items-center gap-2">
              <LayoutTemplate size={16} className="shrink-0 text-sky-600" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-slate-900">{template.name}</span>
                <span className="block text-[11px] text-slate-500">v{template.current_version?.version_number ?? '—'}{template.owner ? ` · ${template.owner.name}` : ''}</span>
              </span>
            </span>
            {selected && <CheckCircle2 size={17} className="shrink-0 text-sky-600" aria-hidden="true" />}
          </label>
        );
      })}
    </div>
  );
}
