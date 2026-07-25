'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { CustomTemplateRenderer } from '@/components/blogs/custom-template/custom-template-renderer';
import { buildPreviewBlocksDoc } from '@/components/blogs/custom-template/custom-template-sample';
import { getCustomTemplate } from '@/services/custom-templates.service';
import { ApiClientError } from '@/services/api-client';
import type { CustomTemplateDetail } from '@/types/custom-templates';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/status-badge';

const SAMPLE_TITLE = 'Understanding Your Eye Health: A Complete Guide';
const SAMPLE_EXCERPT = 'A general overview of preventive eye care, common conditions, and when to see a specialist.';
const SAMPLE_CONTENT_HTML =
  '<p>This is sample article content used to preview how this Custom Template renders a Blog post.</p>' +
  '<p>Regular eye exams help detect vision changes early and support long-term eye health.</p>';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ViewCustomTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params.id;
  const [template, setTemplate] = useState<CustomTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    setUnauthorized(false);
    try {
      setTemplate(await getCustomTemplate(templateId));
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 404) {
        setNotFound(true);
      } else if (caught instanceof ApiClientError && caught.status === 403) {
        setUnauthorized(true);
      } else {
        setLoadError(caught instanceof ApiClientError ? caught.message : 'The Custom Template could not be loaded.');
      }
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    // Loading is intentionally initiated when this protected workspace mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return <div role="status" className="grid min-h-screen place-items-center text-sm font-semibold text-slate-600">Loading Custom Template…</div>;
  }

  if (notFound) {
    return (
      <div className="grid min-h-screen place-items-center p-8">
        <Alert variant="error" action={<Link href="/templates" className="text-xs font-semibold underline">Back to Templates</Link>}>
          This Custom Template was not found.
        </Alert>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="grid min-h-screen place-items-center p-8">
        <Alert variant="error" action={<Link href="/templates" className="text-xs font-semibold underline">Back to Templates</Link>}>
          You do not have permission to view this Custom Template.
        </Alert>
      </div>
    );
  }

  if (loadError || !template) {
    return (
      <div className="grid min-h-screen place-items-center p-8">
        <Alert variant="error" action={<button type="button" className="text-xs font-semibold underline" onClick={() => void load()}>Retry</button>}>
          {loadError ?? 'The Custom Template was not found.'}
        </Alert>
      </div>
    );
  }

  const layout = template.current_version_detail?.layout_config_json;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back to Templates"
            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => router.push('/templates')}
          >
            <ArrowLeft size={14} aria-hidden="true" />Back to Templates
          </button>
          <span className="text-sm font-bold text-slate-900">{template.name}</span>
          <StatusBadge status={template.status} size="sm" />
        </div>
        {template.permissions.can_edit && (
          <Link
            href={`/templates/custom/${template.id}/edit`}
            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-2.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <Pencil size={14} aria-hidden="true" />Edit Template
          </Link>
        )}
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h1 className="text-sm font-bold text-slate-950">{template.name}</h1>
          {template.description && <p className="mt-1 text-xs text-slate-600">{template.description}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 sm:grid-cols-3">
            <div><dt className="font-semibold text-slate-500">Owner</dt><dd>{template.owner?.name ?? 'Unknown'}</dd></div>
            <div><dt className="font-semibold text-slate-500">Version</dt><dd>v{template.current_version?.version_number ?? '—'}</dd></div>
            <div><dt className="font-semibold text-slate-500">Schema Version</dt><dd>{template.schema_version ?? '—'}</dd></div>
            <div><dt className="font-semibold text-slate-500">Updated</dt><dd>{formatDate(template.updated_at)}</dd></div>
            {template.usage && (
              <div><dt className="font-semibold text-slate-500">Usage</dt><dd>{template.usage.distinct_blogs} Blog{template.usage.distinct_blogs === 1 ? '' : 's'}</dd></div>
            )}
          </dl>
        </div>

        <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-sky-800">
          Template Preview
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-4">
          {layout ? (
            <CustomTemplateRenderer
              layoutConfig={layout}
              blocksDoc={buildPreviewBlocksDoc(layout)}
              contentHtml={SAMPLE_CONTENT_HTML}
              title={SAMPLE_TITLE}
              excerpt={SAMPLE_EXCERPT}
              isPreview
            />
          ) : (
            <Alert variant="error">This Custom Template has no valid stored layout to preview.</Alert>
          )}
        </div>
      </div>
    </div>
  );
}
