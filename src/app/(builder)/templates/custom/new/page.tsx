'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  loadNewCustomTemplateDraft, 
  saveNewCustomTemplateDraft, 
  clearLocalDraft, 
  NEW_CUSTOM_TEMPLATE_DRAFT_KEY 
} from '@/components/blogs/custom-template/builder/local-draft';
import { initialPageSettings, initialLayout } from '@/components/blogs/custom-template/builder/builder-state';
import { generateId, createDefaultSlots } from '@/components/blogs/custom-template/builder/builder-id-utils';
import { sampleFrontendCustomTemplateConfig } from '@/components/blogs/custom-template/custom-template-sample';
import { Alert } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { CustomTemplateLayoutConfigV1, CustomTemplateSection } from '@/components/blogs/custom-template/custom-template.types';
import Link from 'next/link';

type StarterLayout = 'blank' | 'full_width' | 'content_sidebar' | 'sample';

export default function NewCustomTemplateSetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [starter, setStarter] = useState<StarterLayout>('blank');
  
  const [draftLayout, setDraftLayout] = useState<CustomTemplateLayoutConfigV1 | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [pendingStarter, setPendingStarter] = useState<StarterLayout | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = loadNewCustomTemplateDraft();
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(draft.templateName);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription(draft.description);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStarter((draft.selectedStarter as StarterLayout) || 'blank');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftLayout(draft.layoutConfig);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowRecovery(true);
    }
  }, []);

  function handleContinue() {
    if (!name.trim()) {
      setError('Template Name is required.');
      return;
    }
    setError(null);

    let layoutToSave: CustomTemplateLayoutConfigV1 = initialLayout;

    // Use existing draft layout if we haven't changed the starter, or if we already confirmed overwrite
    if (draftLayout && starter === loadNewCustomTemplateDraft()?.selectedStarter) {
      layoutToSave = draftLayout;
    } else {
      // Build a fresh layout based on the starter
      if (starter === 'sample') {
        layoutToSave = sampleFrontendCustomTemplateConfig;
      } else {
        const sections: CustomTemplateSection[] = [];
        if (starter === 'full_width') {
          sections.push({
            id: generateId('section'),
            layout: 'full_width' as const,
            slots: createDefaultSlots('full_width'),
            enabled: true,
            responsiveStrategy: 'stack_on_mobile'
          });
        } else if (starter === 'content_sidebar') {
          sections.push({
            id: generateId('section'),
            layout: 'content_sidebar' as const,
            slots: createDefaultSlots('content_sidebar'),
            enabled: true,
            responsiveStrategy: 'sidebar_below_on_tablet'
          });
        }
        
        layoutToSave = {
          schemaVersion: 1,
          layoutId: generateId('custom_layout'),
          metadata: { name: name.trim(), description: description.trim() },
          page: initialPageSettings,
          sections
        };
      }
    }

    saveNewCustomTemplateDraft({
      templateName: name.trim(),
      description: description.trim(),
      selectedStarter: starter,
      layoutConfig: layoutToSave
    });

    router.push('/templates/custom/new/builder');
  }

  function handleStarterChange(newStarter: StarterLayout) {
    if (draftLayout && draftLayout.sections.length > 0 && newStarter !== starter) {
      setPendingStarter(newStarter);
      setShowOverwriteWarning(true);
    } else {
      setStarter(newStarter);
    }
  }

  function confirmOverwrite() {
    if (pendingStarter) {
      setStarter(pendingStarter);
      setDraftLayout(null); // Clear the existing layout to start fresh
    }
    setPendingStarter(null);
    setShowOverwriteWarning(false);
  }

  function handleStartOver() {
    clearLocalDraft(NEW_CUSTOM_TEMPLATE_DRAFT_KEY);
    setName('');
    setDescription('');
    setStarter('blank');
    setDraftLayout(null);
    setShowRecovery(false);
  }

  return (
    <div className="flex h-screen flex-col items-center bg-slate-50 py-12 font-sans overflow-y-auto">
      <div className="w-full max-w-4xl px-4">
        
        {showRecovery && (
          <div className="mb-8">
            <Alert variant="warning">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Unsaved Custom Template found</p>
                  <p className="text-sm mt-1">You have a draft in progress. Do you want to continue editing or start over?</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowRecovery(false)} className="text-sm font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50">
                    Continue Editing
                  </button>
                  <button onClick={handleStartOver} className="text-sm font-semibold px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100">
                    Start Over
                  </button>
                </div>
              </div>
            </Alert>
          </div>
        )}

        <div className="mb-8">
          <Link href="/templates" className="text-sm font-semibold text-sky-600 hover:underline">
            &larr; Back to Templates
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">Create Custom Template</h1>
          <p className="text-slate-600 mt-2">Set the basic Template details and choose how you want to begin.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
          
          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Clinical Deep Dive Layout"
                maxLength={191}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <p className="text-xs text-slate-500 mt-1">Use a clear internal name that helps editors identify this layout.</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-1">
                Description <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Eye-care article layout with a main reading column and supporting sidebar."
                maxLength={2000}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Start With</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="radiogroup">
              
              <button 
                type="button"
                role="radio"
                aria-checked={starter === 'blank'}
                onClick={() => handleStarterChange('blank')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 text-center transition-colors ${starter === 'blank' ? 'border-sky-600 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="w-12 h-12 mb-3 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400">
                  <span className="text-xs font-bold">+</span>
                </div>
                <span className="font-semibold text-slate-900 text-sm">Blank Canvas</span>
                <span className="text-xs text-slate-500 mt-1">Start from scratch</span>
              </button>

              <button 
                type="button"
                role="radio"
                aria-checked={starter === 'full_width'}
                onClick={() => handleStarterChange('full_width')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 text-center transition-colors ${starter === 'full_width' ? 'border-sky-600 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="w-12 h-12 mb-3 border-2 border-slate-200 bg-slate-100 rounded"></div>
                <span className="font-semibold text-slate-900 text-sm">Full Width</span>
                <span className="text-xs text-slate-500 mt-1">Single column</span>
              </button>

              <button 
                type="button"
                role="radio"
                aria-checked={starter === 'content_sidebar'}
                onClick={() => handleStarterChange('content_sidebar')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 text-center transition-colors ${starter === 'content_sidebar' ? 'border-sky-600 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="w-12 h-12 mb-3 flex gap-1">
                  <div className="flex-[2] border-2 border-slate-200 bg-slate-100 rounded"></div>
                  <div className="flex-1 border-2 border-slate-200 bg-slate-100 rounded"></div>
                </div>
                <span className="font-semibold text-slate-900 text-sm">Content + Sidebar</span>
                <span className="text-xs text-slate-500 mt-1">2/3 and 1/3 split</span>
              </button>

              <button 
                type="button"
                role="radio"
                aria-checked={starter === 'sample'}
                onClick={() => handleStarterChange('sample')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 text-center transition-colors ${starter === 'sample' ? 'border-sky-600 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="w-12 h-12 mb-3 flex flex-col gap-1">
                  <div className="h-3 border-2 border-slate-200 bg-slate-100 rounded"></div>
                  <div className="flex-1 flex gap-1">
                    <div className="flex-[2] border-2 border-slate-200 bg-slate-100 rounded"></div>
                    <div className="flex-1 border-2 border-slate-200 bg-slate-100 rounded"></div>
                  </div>
                </div>
                <span className="font-semibold text-slate-900 text-sm">Sample Layout</span>
                <span className="text-xs text-slate-500 mt-1">Pre-built eye care</span>
              </button>

            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Link href="/templates" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </Link>
            <button 
              type="button"
              onClick={handleContinue}
              className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm"
            >
              Continue to Builder &rarr;
            </button>
          </div>

        </div>
      </div>

      <ConfirmationDialog
        isOpen={showOverwriteWarning}
        title="Discard Canvas Work?"
        message="Changing the starter layout will discard the sections currently on your canvas. Are you sure you want to continue?"
        onClose={() => { setPendingStarter(null); setShowOverwriteWarning(false); }}
        onConfirm={confirmOverwrite}
        confirmText="Yes, replace layout"
        variant="warning"
      />
    </div>
  );
}
