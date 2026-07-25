'use client';

import React from 'react';
import type { CustomTemplateSection } from '../custom-template.types';
import type { SelectedElement } from './builder-state';
import BuilderSlot from './builder-slot';
import { ArrowUp, ArrowDown, Copy, Trash, Layout } from 'lucide-react';

interface BuilderSectionProps {
  section: CustomTemplateSection;
  index: number;
  total: number;
  dispatch: React.Dispatch<any>;
  selectedElement: SelectedElement;
  sections: any[];
  device?: 'desktop' | 'tablet' | 'mobile';
}

export default function BuilderSection({
  section,
  index,
  total,
  dispatch,
  selectedElement,
  sections,
  device = 'desktop'
}: BuilderSectionProps) {
  const isSelected = selectedElement?.type === 'section' && selectedElement.sectionId === section.id;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'select_element', element: { type: 'section', sectionId: section.id } });
  };

  const getLayoutLabel = (l: string) => {
    if (l === 'full_width') return 'Full Width';
    if (l === 'content_sidebar') return 'Content + Sidebar';
    if (l === 'two_column') return 'Two Columns';
    if (l === 'three_column') return 'Three Columns';
    return l;
  };

  const getGridColsClass = (l: string, dev: 'desktop' | 'tablet' | 'mobile') => {
    if (dev === 'mobile') {
      return 'grid-cols-1';
    }
    if (dev === 'tablet') {
      if (l === 'three_column' || l === 'two_column') return 'grid-cols-1 sm:grid-cols-2';
      return 'grid-cols-1';
    }
    if (l === 'full_width') return 'grid-cols-1';
    if (l === 'two_column') return 'grid-cols-1 md:grid-cols-2';
    if (l === 'three_column') return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 lg:grid-cols-[1fr_260px]'; // standard content sidebar structure
  };

  return (
    <div
      onClick={handleSelect}
      className={`group relative rounded-xl transition-all duration-300 ${
        isSelected ? 'bg-white shadow-sm ring-1 ring-sky-300' : 'hover:bg-slate-50/80 hover:ring-1 hover:ring-slate-200'
      }`}
    >
      {/* Floating Action Bar (visible on select or hover) */}
      <div
        className={`absolute -top-3 right-4 z-20 flex items-center bg-slate-800 text-white rounded-full shadow-md px-1.5 py-1 transition-all duration-200 ${
          isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
        }`}
      >
        <div className="flex items-center pl-2 pr-1 gap-2 border-r border-slate-600/50 mr-1 text-[10px] font-bold tracking-wider uppercase opacity-80 select-none">
          <Layout size={12} />
          {getLayoutLabel(section.layout)}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'move_section', sectionId: section.id, direction: 'up' });
          }}
          disabled={index === 0}
          className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Move Section Up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'move_section', sectionId: section.id, direction: 'down' });
          }}
          disabled={index === total - 1}
          className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Move Section Down"
        >
          <ArrowDown size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'duplicate_section', sectionId: section.id });
          }}
          className="p-1 hover:bg-slate-700 rounded-full transition-colors ml-1"
          title="Duplicate Section"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'remove_section', sectionId: section.id });
          }}
          className="p-1 hover:bg-rose-500 hover:text-white text-rose-300 rounded-full transition-colors"
          title="Delete Section"
        >
          <Trash size={12} />
        </button>
      </div>

      {/* Slots body wrapper */}
      <div className={`p-4 md:p-6 grid gap-4 lg:gap-6 relative z-10 min-w-0 w-full overflow-hidden ${getGridColsClass(section.layout, device)}`}>
        {!section.enabled && (
          <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] z-10 rounded-xl flex items-center justify-center">
            <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Section Disabled</span>
          </div>
        )}
        {section.slots.map((slot) => (
          <BuilderSlot
            key={slot.id}
            slot={slot}
            sectionId={section.id}
            dispatch={dispatch}
            selectedElement={selectedElement}
            sections={sections}
          />
        ))}
      </div>
    </div>
  );
}
