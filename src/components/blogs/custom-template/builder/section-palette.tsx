'use client';

import React from 'react';
import { Columns, Square, LayoutGrid, Sidebar, type LucideIcon } from 'lucide-react';
import type { CustomTemplateSectionLayout } from '../custom-template.types';

interface SectionPaletteProps {
  dispatch: React.Dispatch<any>;
  sectionCount: number;
}

const layouts: { key: CustomTemplateSectionLayout; label: string; slots: number; icon: LucideIcon }[] = [
  { key: 'full_width', label: 'Full Width', slots: 1, icon: Square },
  { key: 'content_sidebar', label: 'Content + Sidebar', slots: 2, icon: Sidebar },
  { key: 'two_column', label: 'Two Equal Columns', slots: 2, icon: Columns },
  { key: 'three_column', label: 'Three Equal Columns', slots: 3, icon: LayoutGrid }
];

export default function SectionPalette({ dispatch, sectionCount }: SectionPaletteProps) {
  const disabled = sectionCount >= 20;

  return (
    <div className="flex flex-col border-b border-slate-100/50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-5 py-4 border-b border-slate-100">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Add Section</h3>
        <p className="text-[10px] font-medium text-slate-400 mt-1">Select a layout ({sectionCount}/20)</p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
          {layouts.map((layout) => {
            const Icon = layout.icon;
            return (
              <button
                key={layout.key}
                onClick={() => dispatch({ type: 'add_section', layoutType: layout.key })}
                disabled={disabled}
                className="group relative flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:-translate-y-0 disabled:hover:shadow-xs"
              >
                <div className="mb-2 p-2 rounded-lg bg-slate-50 group-hover:bg-sky-100 transition-colors">
                  <Icon size={18} className="text-slate-500 group-hover:text-sky-600 transition-colors" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 leading-tight group-hover:text-sky-900">{layout.label}</span>
                <span className="text-[9px] font-medium text-slate-400 mt-1">{layout.slots} {layout.slots === 1 ? 'slot' : 'slots'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
