'use client';

import React from 'react';
import type { FrontendValidationError } from '../custom-template-validation';
import type { CustomTemplateLayoutConfigV1 } from '../custom-template.types';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidationPanelProps {
  errors: FrontendValidationError[];
  layout?: CustomTemplateLayoutConfigV1;
  dispatch: React.Dispatch<any>;
  onSelectTab?: (tab: 'element' | 'page' | 'validate') => void;
}

export default function ValidationPanel({ errors, layout, dispatch, onSelectTab }: ValidationPanelProps) {
  const handleSelectPath = (path: string) => {
    if (!path || !layout) return;
    const secMatch = path.match(/sections\[(\d+)\]/);
    const slotMatch = path.match(/slots\[(\d+)\]/);
    const compMatch = path.match(/components\[(\d+)\]/);

    if (secMatch) {
      const secIdx = parseInt(secMatch[1], 10);
      const section = layout.sections[secIdx];
      if (section) {
        if (slotMatch) {
          const slotIdx = parseInt(slotMatch[1], 10);
          const slot = section.slots[slotIdx];
          if (slot) {
            if (compMatch) {
              const compIdx = parseInt(compMatch[1], 10);
              const comp = slot.components[compIdx];
              if (comp) {
                dispatch({
                  type: 'select_element',
                  element: { type: 'component', sectionId: section.id, slotId: slot.id, componentId: comp.id }
                });
                onSelectTab?.('element');
                return;
              }
            }
            dispatch({
              type: 'select_element',
              element: { type: 'slot', sectionId: section.id, slotId: slot.id }
            });
            onSelectTab?.('element');
            return;
          }
        }
        dispatch({
          type: 'select_element',
          element: { type: 'section', sectionId: section.id }
        });
        onSelectTab?.('element');
      }
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="border-b border-slate-200 pb-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Configuration Validation</h4>
        <p className="text-[10px] text-slate-400 mt-0.5">Strict Level 2 validation checks before file export.</p>
      </div>

      {errors.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 border border-emerald-100 bg-emerald-50/50 rounded-xl text-center space-y-2">
          <CheckCircle className="text-emerald-500" size={24} />
          <h5 className="text-xs font-bold text-emerald-800">Layout Structure Valid</h5>
          <p className="text-[10px] text-emerald-600 max-w-xs leading-normal">
            No issues found! This layout configuration is structurally complete and safe for export.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-bold">
            <AlertCircle size={14} className="text-rose-500" />
            <span>Found {errors.length} validation issue(s)</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {errors.map((error, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPath(error.path)}
                className="w-full text-left p-2.5 border border-slate-100 bg-white hover:border-sky-300 rounded-xl transition text-xs flex flex-col gap-1"
              >
                <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 rounded-sm self-start tracking-wider">
                  Path: {error.path}
                </span>
                <span className="font-semibold text-slate-800 leading-normal mt-0.5">
                  {error.message}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
