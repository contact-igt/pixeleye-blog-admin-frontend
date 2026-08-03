'use client';

import React, { useReducer, useEffect, useState } from 'react';
import { builderReducer } from './builder-reducer';
import { initialState } from './builder-state';
import BuilderToolbar from './builder-toolbar';
import SectionPalette from './section-palette';
import ComponentPalette from './component-palette';
import SettingsPanel from './settings-panel';
import DevicePreview from './device-preview';
import { validateFrontendCustomTemplateLayout } from '../custom-template-validation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Modal } from '@/components/ui/modal';
import { sampleFrontendCustomTemplateConfig } from '../custom-template-sample';
import type { CustomTemplateLayoutConfigV1 } from '../custom-template.types';
import { getComponentDefinition } from '../component-registry';
import { asNormalizedCustomTemplateConfig } from '../custom-template-settings';
import { useToast } from '@/contexts/toast-context';

export interface CustomTemplateBuilderProps {
  mode: 'create' | 'edit';
  metadata: {
    name: string;
    description: string;
    status?: string;
    version?: string | number;
  };
  initialLayout: CustomTemplateLayoutConfigV1;
  saveLabel: string;
  saving?: boolean;
  saveError?: string | null;
  readOnly?: boolean;
  onSave: (layout: CustomTemplateLayoutConfigV1) => void;
  onBack: () => void;
  onEditDetails?: (name: string, description: string) => void;
  onAutoSave?: (layout: CustomTemplateLayoutConfigV1) => void;
  draftRecoveryBanner?: React.ReactNode;
}

export default function CustomTemplateBuilder({
  mode,
  metadata,
  initialLayout,
  saveLabel,
  saving,
  saveError,
  onSave,
  onBack,
  onEditDetails,
  onAutoSave,
  draftRecoveryBanner
}: CustomTemplateBuilderProps) {
  const [state, dispatch] = useReducer(
    builderReducer,
    initialLayout ? { ...initialState, layout: asNormalizedCustomTemplateConfig(initialLayout) } : initialState
  );
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [importPendingJson, setImportPendingJson] = useState<string | null>(null);
  
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [editName, setEditName] = useState(metadata.name);
  const [editDesc, setEditDesc] = useState(metadata.description);

  const [activeTab, setActiveTab] = useState<'element' | 'page' | 'validate'>('element');

  const { showToast } = useToast();



  // Sync Level 2 strict validation errors to state
  useEffect(() => {
    const validation = validateFrontendCustomTemplateLayout(state.layout);
    dispatch({
      type: 'set_validation_result',
      result: { valid: validation.valid, errors: validation.errors }
    });
  }, [state.layout]);

  // Debounced auto-save local draft
  useEffect(() => {
    if (!state.isDirty || !onAutoSave) return;
    const timer = setTimeout(() => {
      onAutoSave(state.layout);
    }, 1000);
    return () => clearTimeout(timer);
  }, [state.layout, state.isDirty, onAutoSave]);

  // Prevent accidental unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved template builder changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  // Global Keyboard Shortcuts (Undo / Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement).tagName
      );
      if (isInput) return;

      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if (ctrlOrCmd && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        dispatch({ type: 'redo' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);



  const handleImportFile = (fileContent: string) => {
    setImportPendingJson(fileContent);
    setShowConfirmImport(true);
  };

  const confirmImport = () => {
    if (!importPendingJson) return;
    try {
      const parsed = JSON.parse(importPendingJson);
      dispatch({ type: 'replace_layout', layout: asNormalizedCustomTemplateConfig(parsed) });
    } catch {
      showToast({ type: 'error', message: 'Corrupt JSON file.' });
    }
    setImportPendingJson(null);
    setShowConfirmImport(false);
  };

  const pendingSection = state.pendingLayoutReduction
    ? state.layout.sections.find((section) => section.id === state.pendingLayoutReduction?.sectionId)
    : undefined;
  const pendingComponents = pendingSection?.slots.flatMap((slot) => slot.components) ?? [];
  const affectedComponents = state.pendingLayoutReduction && pendingSection
    ? pendingSection.slots.slice(state.pendingLayoutReduction.newSlotCount).flatMap((slot) => slot.components)
    : [];
  const pendingCapacity = (state.pendingLayoutReduction?.newSlotCount ?? 0) * 10;
  const pendingOverflowCount = Math.max(0, pendingComponents.length - pendingCapacity);

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Compact Global Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 relative z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            &larr; {mode === 'create' ? 'Setup' : 'Templates'}
          </button>
          
          <div className="h-4 w-px bg-slate-300"></div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-900 truncate max-w-[200px] md:max-w-[400px]" title={metadata.name}>
              {metadata.name}
            </span>
            {metadata.status && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                {metadata.status}
              </span>
            )}
            {metadata.version && (
              <span className="text-xs text-slate-500 hidden sm:inline-block">
                Version {metadata.version}
              </span>
            )}
            <span className="text-xs text-sky-600 font-medium ml-2 hidden sm:inline-block">
              {state.isDirty ? 'Unsaved changes' : 'Local layout saved'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BuilderToolbar
            state={state}
            dispatch={dispatch}
            onResetClick={() => setShowConfirmReset(true)}
            onClearClick={() => setShowConfirmClear(true)}
            onImportFile={handleImportFile}
            compact={true}
          />
          
          {mode === 'create' && onEditDetails && (
            <button
              onClick={() => setShowEditDetails(true)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 hidden md:inline-block"
            >
              Edit Details
            </button>
          )}

          <div className="h-4 w-px bg-slate-300 hidden md:block"></div>

          <button
            type="button"
            onClick={() => onSave(state.layout)}
            disabled={Boolean(saving) || !state.validationResult.valid}
            className="focus-ring inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm transition-colors"
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </header>

      {saveError && (
        <div className="shrink-0 px-4 py-2 bg-white border-b border-red-100">
          <Alert variant="error">{saveError}</Alert>
        </div>
      )}

      {draftRecoveryBanner}



      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Panel: Palette */}
        <aside className="w-[320px] border-r border-slate-200 bg-white/95 backdrop-blur-md flex flex-col shrink-0 overflow-y-auto z-10 shadow-xs relative">
          <SectionPalette dispatch={dispatch} sectionCount={state.layout.sections.length} />
          <ComponentPalette
            dispatch={dispatch}
            selectedElement={state.selectedElement}
            sections={state.layout.sections}
          />
        </aside>

        {/* Center Panel: Canvas & Preview switcher */}
        <main className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          {/* Validation Notice Banner */}
          {state.validationMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 animate-in slide-in-from-top-4 fade-in duration-300">
              <Alert
                variant="warning"
                onDismiss={() => dispatch({ type: 'clear_validation_message' })}
              >
                {state.validationMessage}
              </Alert>
            </div>
          )}

          {/* Canvas Viewport */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            <DevicePreview
              device={state.previewDevice}
              layout={state.layout}
              dispatch={dispatch}
              selectedElement={state.selectedElement}
            />
          </div>
        </main>

        {/* Right Panel: Settings / Validation */}
        <aside className="w-[320px] border-l border-slate-200 bg-white/95 backdrop-blur-md flex flex-col shrink-0 overflow-y-auto z-10 shadow-xs relative">
          <SettingsPanel
            state={state}
            dispatch={dispatch}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </aside>
      </div>

      {/* Confirmations */}
      <ConfirmationDialog
        isOpen={showConfirmReset}
        title="Reset layout?"
        message="This will discard your current layout configuration and reload the default healthcare sample template config. This action can be undone."
        onClose={() => setShowConfirmReset(false)}
        onConfirm={() => {
          dispatch({ type: 'reset_sample', sampleConfig: sampleFrontendCustomTemplateConfig });
          setShowConfirmReset(false);
        }}
        variant="warning"
        confirmText="Reset to Sample"
      />

      <ConfirmationDialog
        isOpen={showConfirmClear}
        title="Clear canvas?"
        message="This will completely clear all sections and components from your layout canvas. This action can be undone."
        onClose={() => setShowConfirmClear(false)}
        onConfirm={() => {
          dispatch({ type: 'clear_canvas' });
          setShowConfirmClear(false);
        }}
        variant="destructive"
        confirmText="Clear Canvas"
      />

      <ConfirmationDialog
        isOpen={showConfirmImport}
        title="Import Layout JSON?"
        message="Importing will replace your entire canvas layout. This action can be undone."
        onClose={() => {
          setImportPendingJson(null);
          setShowConfirmImport(false);
        }}
        onConfirm={confirmImport}
        variant="warning"
        confirmText="Replace Layout"
      />

      <Modal
        isOpen={state.pendingLayoutReduction !== null}
        title="Reduce section slots?"
        description="Review every affected component before changing this section layout."
        onClose={() => dispatch({ type: 'cancel_pending_layout_reduction' })}
        footer={<>
          <Button type="button" variant="outline" onClick={() => dispatch({ type: 'cancel_pending_layout_reduction' })}>Cancel</Button>
          <Button type="button" variant="secondary" disabled={pendingOverflowCount > 0} onClick={() => dispatch({ type: 'apply_pending_layout_reduction' })}>Move overflow</Button>
          <Button type="button" variant="destructive" onClick={() => dispatch({ type: 'remove_pending_layout_overflow' })}>Remove overflow</Button>
        </>}
      >
        <div className="space-y-4 text-sm text-slate-700">
          <p>Components are moved in their current order. Nothing is removed by <strong>Move overflow</strong>.</p>
          {pendingOverflowCount > 0 ? <Alert variant="warning">The new layout is over capacity by {pendingOverflowCount} component(s). Move overflow is unavailable until capacity is freed; Remove overflow is an explicit destructive choice.</Alert> : null}
          <div>
            <p className="font-semibold text-slate-900">Affected components ({affectedComponents.length})</p>
            {affectedComponents.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5">
              {affectedComponents.map((component) => <li key={component.id}>{getComponentDefinition(component.componentKey).displayName} <span className="text-slate-400">({component.id})</span></li>)}
            </ul> : <p className="mt-1 text-slate-500">No components are currently in the slots being removed.</p>}
          </div>
        </div>
      </Modal>

      {/* Edit Details Modal */}
      {mode === 'create' && onEditDetails && (
        <Modal
          isOpen={showEditDetails}
          onClose={() => setShowEditDetails(false)}
          title="Edit Template Details"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-semibold text-slate-900 mb-1">
                Template Name
              </label>
              <input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="edit-desc" className="block text-sm font-semibold text-slate-900 mb-1">
                Description
              </label>
              <textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditName(metadata.name);
                  setEditDesc(metadata.description);
                  setShowEditDetails(false);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editName.trim()) {
                    onEditDetails(editName.trim(), editDesc.trim());
                    setShowEditDetails(false);
                  }
                }}
                disabled={!editName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50"
              >
                Save Details
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
