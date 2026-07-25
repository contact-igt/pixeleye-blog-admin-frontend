'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Copy, Eye, LayoutTemplate, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  activateCustomTemplate,
  archiveCustomTemplate,
  duplicateCustomTemplate,
  listCustomTemplates,
  permanentlyDeleteCustomTemplate,
  restoreCustomTemplate
} from '@/services/custom-templates.service';
import { ApiClientError } from '@/services/api-client';
import type { AdminRole } from '@/types/auth';
import { CUSTOM_TEMPLATE_IN_USE, type CustomTemplateSummary } from '@/types/custom-templates';

type LifecycleAction = 'activate' | 'archive' | 'restore' | 'delete' | 'duplicate';

function canManageAll(role?: AdminRole | null) { return role === 'super_admin' || role === 'editor'; }
function canCreate(role?: AdminRole | null) { return role === 'super_admin' || role === 'editor' || role === 'author'; }
function canEdit(role: AdminRole | null | undefined, template: CustomTemplateSummary, adminId?: string) {
  return canManageAll(role) || (role === 'author' && template.owner?.id === adminId);
}
function canView(role: AdminRole | null | undefined, template: CustomTemplateSummary, adminId?: string) {
  if (canManageAll(role) || role === 'viewer') return true;
  return role === 'author' && template.owner?.id === adminId;
}
function usageLabel(template: CustomTemplateSummary) {
  const distinct = template.usage?.distinct_blogs ?? 0;
  return distinct ? `Used by ${distinct} ${distinct === 1 ? 'Blog' : 'Blogs'}` : 'Not used by any Blogs yet';
}

export function CustomTemplatesPanel() {
  const { admin } = useAuth();
  const [items, setItems] = useState<CustomTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ template: CustomTemplateSummary; action: LifecycleAction } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listCustomTemplates({ limit: 50, sort_by: 'updated_at', sort_order: 'desc' });
      setItems(result.items ?? []);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Custom Templates could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading is intentionally initiated when this protected workspace mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function runAction() {
    if (!pending) return;
    setActionLoading(true);
    setError('');
    try {
      const { template, action } = pending;
      if (action === 'activate') await activateCustomTemplate(template.id, { expected_lock_version: template.lock_version });
      if (action === 'archive') await archiveCustomTemplate(template.id, { expected_lock_version: template.lock_version });
      if (action === 'restore') await restoreCustomTemplate(template.id, { expected_lock_version: template.lock_version });
      if (action === 'delete') await permanentlyDeleteCustomTemplate(template.id);
      if (action === 'duplicate') await duplicateCustomTemplate(template.id);
      setPending(null);
      await load();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409 && caught.data?.code === CUSTOM_TEMPLATE_IN_USE) {
        setError('This Custom Template cannot be permanently deleted because it is referenced by one or more Blog versions. Archive it instead.');
      } else {
        setError(caught instanceof ApiClientError ? caught.message : 'That action could not be completed.');
      }
    } finally {
      setActionLoading(false);
    }
  }

  const dialogCopy: Record<LifecycleAction, { title: string; message: string; confirmText: string; variant: 'info' | 'warning' | 'destructive' }> = {
    activate: { title: 'Activate Custom Template?', message: 'Activating makes this Custom Template selectable for new Blogs.', confirmText: 'Activate', variant: 'info' },
    archive: {
      title: 'Delete Custom Template?',
      message: 'This Template will be moved to Archive. It will no longer be available for new Blogs, but existing Blog snapshots will continue to work. You can restore it later.',
      confirmText: 'Move to Archive',
      variant: 'destructive'
    },
    restore: { title: 'Restore Custom Template?', message: 'Restoring returns this Custom Template to its previous status so it can be edited again.', confirmText: 'Restore', variant: 'info' },
    delete: {
      title: 'Permanently Delete Custom Template?',
      message: 'This action cannot be undone. The Template and its version history will be permanently deleted. Templates referenced by Blogs cannot be deleted.',
      confirmText: 'Delete Permanently',
      variant: 'destructive'
    },
    duplicate: { title: 'Duplicate Custom Template?', message: 'This creates a new draft Custom Template that is a copy of the current version.', confirmText: 'Duplicate', variant: 'info' }
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}

      {canCreate(admin?.role) && (
        <div className="flex justify-end">
          <Link href="/templates/custom/new" className="focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700">
            <Plus size={15} aria-hidden="true" />Create Custom Template
          </Link>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<LayoutTemplate className="h-10 w-10 text-slate-400" aria-hidden="true" />} title="No Custom Templates yet" description="Create a Custom Template using the Builder to make it available for Blogs." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((template) => (
            <Card key={template.id} as="article" className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap gap-2">
                    <StatusBadge status={template.status} size="sm" />
                  </div>
                  <h3 className="truncate text-lg font-bold text-slate-950">{template.name}</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">v{template.current_version?.version_number ?? '—'}</span>
              </div>
              {template.description && <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{template.description}</p>}
              <p className="text-xs text-slate-500">Owner: {template.owner?.name ?? 'Unknown'}</p>
              <p className="text-sm font-bold text-slate-800">{usageLabel(template)}</p>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {canView(admin?.role, template, admin?.id) && (
                  <Link
                    href={`/templates/custom/${template.id}/view`}
                    aria-label={`View ${template.name}`}
                    className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <Eye size={14} aria-hidden="true" />
                    <span>View</span>
                  </Link>
                )}
                {canEdit(admin?.role, template, admin?.id) && template.status !== 'archived' && (
                  <Link
                    href={`/templates/custom/${template.id}/edit`}
                    aria-label={`Edit ${template.name}`}
                    className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <Pencil size={14} aria-hidden="true" />
                    <span>Edit</span>
                  </Link>
                )}
                {canEdit(admin?.role, template, admin?.id) && template.status === 'draft' && (
                  <Button variant="outline" size="sm" disabled={actionLoading && pending?.template.id === template.id} onClick={() => setPending({ template, action: 'activate' })}>
                    <span>Activate</span>
                  </Button>
                )}
                {canEdit(admin?.role, template, admin?.id) && template.status === 'archived' && (
                  <Button variant="outline" size="sm" disabled={actionLoading && pending?.template.id === template.id} onClick={() => setPending({ template, action: 'restore' })}>
                    <RotateCcw size={14} aria-hidden="true" />
                    <span>Restore</span>
                  </Button>
                )}
                {canCreate(admin?.role) && (
                  <Button variant="outline" size="sm" disabled={actionLoading && pending?.template.id === template.id} onClick={() => setPending({ template, action: 'duplicate' })}>
                    <Copy size={14} aria-hidden="true" />
                    <span>Duplicate</span>
                  </Button>
                )}
                {canEdit(admin?.role, template, admin?.id) && (template.status === 'draft' || template.status === 'active') && (
                  <Button variant="outline" size="sm" disabled={actionLoading && pending?.template.id === template.id} onClick={() => setPending({ template, action: 'archive' })}>
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Delete</span>
                  </Button>
                )}
                {admin?.role === 'super_admin' && template.status === 'archived' && (
                  <Button variant="outline" size="sm" disabled={actionLoading && pending?.template.id === template.id} onClick={() => setPending({ template, action: 'delete' })}>
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Delete Permanently</span>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={Boolean(pending)}
        title={pending ? dialogCopy[pending.action].title : ''}
        message={pending ? dialogCopy[pending.action].message : ''}
        confirmText={pending ? dialogCopy[pending.action].confirmText : 'Confirm'}
        variant={pending ? dialogCopy[pending.action].variant : 'warning'}
        isLoading={actionLoading}
        onClose={() => setPending(null)}
        onConfirm={() => void runAction()}
      />
    </div>
  );
}
