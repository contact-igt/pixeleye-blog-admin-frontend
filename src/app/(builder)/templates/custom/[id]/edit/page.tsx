'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CustomTemplateBuilder from '@/components/blogs/custom-template/builder/custom-template-builder';
import { persistedCustomTemplateDraftKey, clearLocalDraft, loadLocalDraft, saveLocalDraft, type LocalDraftPayload } from '@/components/blogs/custom-template/builder/local-draft';
import { getCustomTemplate, saveCustomTemplateVersion } from '@/services/custom-templates.service';
import { ApiClientError } from '@/services/api-client';
import { CUSTOM_TEMPLATE_VERSION_CONFLICT, type CustomTemplateDetail } from '@/types/custom-templates';
import type { CustomTemplateLayoutConfigV1 } from '@/components/blogs/custom-template/custom-template.types';
import { Alert } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { exportLayout } from '@/components/blogs/custom-template/builder/layout-import-export';

export default function EditCustomTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params.id;
  const [template, setTemplate] = useState<CustomTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<CustomTemplateLayoutConfigV1 | null>(null);
  
  const [draftRecovery, setDraftRecovery] = useState<LocalDraftPayload | null>(null);
  const [recoveredLayout, setRecoveredLayout] = useState<CustomTemplateLayoutConfigV1 | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const templateData = await getCustomTemplate(templateId);
      setTemplate(templateData);
      
      const draft = loadLocalDraft(persistedCustomTemplateDraftKey(templateId));
      if (draft) {
        setDraftRecovery(draft);
      }
    } catch (caught) {
      setLoadError(caught instanceof ApiClientError ? caught.message : 'The Custom Template could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    // Loading is intentionally initiated when this protected workspace mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleSave(layout: CustomTemplateLayoutConfigV1) {
    if (!template) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await saveCustomTemplateVersion(templateId, { layout_config_json: layout, expected_lock_version: template.lock_version });
      setTemplate(updated);
      clearLocalDraft(persistedCustomTemplateDraftKey(templateId));
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409 && caught.data?.code === CUSTOM_TEMPLATE_VERSION_CONFLICT) {
        setPendingLayout(layout);
        setConflict(true);
      } else {
        setSaveError(caught instanceof ApiClientError ? caught.message : 'The Custom Template version could not be saved.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="grid min-h-screen place-items-center text-sm font-semibold text-slate-600">Loading Custom Template…</div>;
  if (loadError || !template) return <div className="grid min-h-screen place-items-center p-8"><Alert variant="error" action={<button type="button" className="text-xs font-semibold underline" onClick={() => void load()}>Retry</button>}>{loadError ?? 'The Custom Template was not found.'}</Alert></div>;

  const serverLayout = template.current_version_detail?.layout_config_json;
  const layout = recoveredLayout || serverLayout;
  const readOnly = template.status === 'archived';

  function handleAutoSave(newLayout: CustomTemplateLayoutConfigV1) {
    if (readOnly) return;
    saveLocalDraft(newLayout, persistedCustomTemplateDraftKey(templateId));
  }

  const draftRecoveryBanner = draftRecovery ? (
    <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 flex items-center justify-between text-xs text-sky-800 font-semibold shrink-0 z-10">
      <span>Found saved local draft ({draftRecovery.localDraftLabel}). Do you want to restore it?</span>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setRecoveredLayout(draftRecovery.layoutConfig);
            setDraftRecovery(null);
          }}
          className="bg-sky-600 hover:bg-sky-700 text-white rounded px-2.5 py-1"
        >
          Restore Draft
        </button>
        <button
          onClick={() => {
            clearLocalDraft(persistedCustomTemplateDraftKey(templateId));
            setDraftRecovery(null);
          }}
          className="bg-white hover:bg-slate-50 border border-sky-300 rounded px-2.5 py-1 text-slate-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex h-screen flex-col">
      {layout ? (
        <div className="flex-1 overflow-hidden">
          <CustomTemplateBuilder
            mode="edit"
            metadata={{
              name: template.name,
              description: template.description || '',
              status: template.status,
              version: template.current_version?.version_number
            }}
            initialLayout={layout}
            saveLabel="Save Version"
            saving={saving}
            saveError={saveError}
            onSave={handleSave}
            onBack={() => router.push('/templates')}
            onAutoSave={handleAutoSave}
            readOnly={readOnly}
            draftRecoveryBanner={draftRecoveryBanner}
          />
        </div>
      ) : (
        <div className="p-8"><Alert variant="error">This Custom Template has no valid stored layout to edit.</Alert></div>
      )}

      <ConfirmationDialog
        isOpen={conflict}
        title="Someone else saved a newer version"
        message={
          <div className="space-y-3">
            <p>This Custom Template was changed by another user since you loaded it. Export your current layout to keep a local copy, then reload the latest server version before saving again. Your in-progress work is not discarded automatically.</p>
            {pendingLayout && (
              <button type="button" className="text-xs font-semibold text-sky-700 underline" onClick={() => exportLayout(pendingLayout)}>
                Export current local layout as JSON
              </button>
            )}
          </div>
        }
        confirmText="Reload latest version"
        cancelText="Keep editing"
        variant="warning"
        onClose={() => setConflict(false)}
        onConfirm={() => {
          setConflict(false);
          setPendingLayout(null);
          void load();
        }}
      />
    </div>
  );
}
