'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Undo2, Redo2, Monitor, Tablet, Smartphone, FileUp, FileDown, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import type { BuilderState } from './builder-state';
import { exportLayout, importLayout } from './layout-import-export';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';

interface BuilderToolbarProps {
  state: BuilderState;
  dispatch: React.Dispatch<any>;
  onResetClick: () => void;
  onClearClick: () => void;
  onImportFile: (content: string) => void;
  compact?: boolean;
}

export default function BuilderToolbar({
  state,
  dispatch,
  onResetClick,
  onClearClick,
  onImportFile,
  compact
}: BuilderToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const handleExport = () => {
    const result = exportLayout(state.layout);
    if (!result.success) {
      showToast({ type: 'error', message: result.error || 'Export failed' });
    }
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Do level 2 check first to warn early
      const result = importLayout(text);
      if (!result.success) {
        showToast({ type: 'error', message: result.error || 'Import failed' });
      } else {
        onImportFile(text);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const controls = (
    <>
      {/* Center device toggle controls */}
      <div className="flex items-center bg-slate-100/80 p-1 rounded-lg border border-slate-200/50">
        <button
          onClick={() => dispatch({ type: 'set_preview_device', device: 'desktop' })}
          className={`p-1.5 rounded-md transition-all duration-200 ${state.previewDevice === 'desktop' ? 'bg-white text-sky-600 shadow-xs ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
          title="Desktop preview"
        >
          <Monitor size={15} />
        </button>
        <button
          onClick={() => dispatch({ type: 'set_preview_device', device: 'tablet' })}
          className={`p-1.5 rounded-md transition-all duration-200 ${state.previewDevice === 'tablet' ? 'bg-white text-sky-600 shadow-xs ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
          title="Tablet preview"
        >
          <Tablet size={15} />
        </button>
        <button
          onClick={() => dispatch({ type: 'set_preview_device', device: 'mobile' })}
          className={`p-1.5 rounded-md transition-all duration-200 ${state.previewDevice === 'mobile' ? 'bg-white text-sky-600 shadow-xs ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
          title="Mobile preview"
        >
          <Smartphone size={15} />
        </button>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => dispatch({ type: 'undo' })}
          disabled={state.history.length === 0}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'redo' })}
          disabled={state.future.length === 0}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-2" />

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImportChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          title="Import JSON"
        >
          <FileUp size={16} />
        </button>

        <button
          onClick={handleExport}
          disabled={!state.validationResult.valid}
          className={`p-2 rounded-lg transition-colors relative ${!state.validationResult.valid ? 'text-rose-400 hover:bg-rose-50' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}
          title={!state.validationResult.valid ? 'Export disabled until validation passes' : 'Export JSON'}
        >
          {!state.validationResult.valid && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse border-2 border-white" />
          )}
          <FileDown size={16} />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-2" />

        <button
          onClick={onResetClick}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          title="Reset to sample"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={onClearClick}
          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          title="Clear canvas"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </>
  );

  if (compact) {
    return <div className="flex items-center gap-3">{controls}</div>;
  }

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between shrink-0 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] z-20">
      <div className="flex items-center gap-4">
        <Link
          href="/templates"
          className="group flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <div className="p-1.5 bg-slate-100 rounded-md group-hover:bg-slate-200 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </div>
          Exit
        </Link>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-xs leading-tight">
            {state.layout.metadata.name || 'Custom Template Builder'}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-slate-400 font-medium">Layout Builder</span>
            {state.isDirty && (
              <>
                <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Unsaved</span>
              </>
            )}
          </div>
        </div>
      </div>
      {controls}
    </header>
  );
}
