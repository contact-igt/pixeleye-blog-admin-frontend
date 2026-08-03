'use client';

import React from 'react';
import type { CustomTemplateLayoutConfigV1, CustomTemplateSection } from '../custom-template.types';
import type { SelectedElement } from './builder-state';
import BuilderSection from './builder-section';
import { Plus } from 'lucide-react';
import { pageSpacingClasses, pageTypographyClass, pageWidthClass } from '../custom-template-settings';

interface BuilderCanvasProps {
  layout: CustomTemplateLayoutConfigV1;
  dispatch: React.Dispatch<any>;
  selectedElement: SelectedElement;
  device?: 'desktop' | 'tablet' | 'mobile';
}

export default function BuilderCanvas({
  layout,
  dispatch,
  selectedElement,
  device = 'desktop'
}: BuilderCanvasProps) {
  const sections = layout.sections;
  const spacing = pageSpacingClasses(layout.page.spacing);

  if (sections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50 max-w-4xl mx-auto my-auto min-h-[300px]">
        <div className="text-center space-y-3">
          <div className="inline-grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400 mx-auto">
            <Plus size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Your Canvas is empty</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Click one of the section layouts on the left panel palette to start constructing your custom template layout structure.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-builder-page-width={layout.page.contentWidth}
      data-builder-page-background={layout.page.background}
      data-builder-page-spacing={layout.page.spacing}
      data-builder-page-typography={layout.page.typography}
      className={`w-full mx-auto select-none rounded-xl p-4 ${pageWidthClass(layout.page.contentWidth)} ${spacing.gap} ${pageTypographyClass(layout.page.typography)} ${
        layout.page.background === 'soft_gray' ? 'bg-slate-50' : layout.page.background === 'brand_tint' ? 'bg-sky-50/40' : 'bg-white'
      }`}
    >
      {sections.map((section, idx) => (
        <BuilderSection
          key={section.id}
          section={section}
          index={idx}
          total={sections.length}
          dispatch={dispatch}
          selectedElement={selectedElement}
          sections={sections}
          device={device}
          pageSettings={layout.page}
        />
      ))}
    </div>
  );
}
