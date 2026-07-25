'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomTemplateBuilder from '@/components/blogs/custom-template/builder/custom-template-builder';
import { 
  loadNewCustomTemplateDraft, 
  saveNewCustomTemplateDraft, 
  clearLocalDraft, 
  NEW_CUSTOM_TEMPLATE_DRAFT_KEY,
  type NewCustomTemplateDraftPayload
} from '@/components/blogs/custom-template/builder/local-draft';
import { createCustomTemplate } from '@/services/custom-templates.service';
import { ApiClientError } from '@/services/api-client';
import type { CustomTemplateLayoutConfigV1 } from '@/components/blogs/custom-template/custom-template.types';

export default function NewCustomTemplateBuilderPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<NewCustomTemplateDraftPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadNewCustomTemplateDraft();
    if (!loaded) {
      router.replace('/templates/custom/new');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(loaded);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }, [router]);

  async function handleSave(layout: CustomTemplateLayoutConfigV1) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCustomTemplate({ 
        name: draft.templateName, 
        description: draft.description || null, 
        layout_config_json: layout 
      });
      clearLocalDraft(NEW_CUSTOM_TEMPLATE_DRAFT_KEY);
      router.replace(`/templates/custom/${created.id}/edit`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'The Custom Template could not be saved.');
      setSaving(false);
    }
  }

  function handleAutoSave(layout: CustomTemplateLayoutConfigV1) {
    if (!draft) return;
    const newDraft = { ...draft, layoutConfig: layout };
    setDraft(newDraft);
    saveNewCustomTemplateDraft({
      templateName: newDraft.templateName,
      description: newDraft.description,
      selectedStarter: newDraft.selectedStarter,
      layoutConfig: layout
    });
  }

  function handleEditDetails(name: string, description: string) {
    if (!draft) return;
    const newDraft = { ...draft, templateName: name, description };
    setDraft(newDraft);
    saveNewCustomTemplateDraft({
      templateName: name,
      description: description,
      selectedStarter: newDraft.selectedStarter,
      layoutConfig: newDraft.layoutConfig
    });
  }

  if (loading || !draft) {
    return <div className="grid h-screen place-items-center text-sm font-semibold text-slate-600 bg-slate-50">Initializing workspace...</div>;
  }

  return (
    <CustomTemplateBuilder
      mode="create"
      metadata={{
        name: draft.templateName,
        description: draft.description,
        status: 'Draft'
      }}
      initialLayout={draft.layoutConfig}
      saveLabel="Save Draft"
      saving={saving}
      saveError={error}
      onSave={handleSave}
      onBack={() => router.push('/templates/custom/new')}
      onEditDetails={handleEditDetails}
      onAutoSave={handleAutoSave}
    />
  );
}
