'use client';

import React from 'react';
import type { CustomTemplateLayoutConfigV1 } from '../custom-template.types';
import type { SelectedElement } from './builder-state';
import { CustomTemplateRenderer } from '../custom-template-renderer';
import { buildPreviewBlocksDoc } from '../custom-template-sample';
import BuilderCanvas from './builder-canvas';

interface DevicePreviewProps {
  device: 'desktop' | 'tablet' | 'mobile';
  layout: CustomTemplateLayoutConfigV1;
  dispatch: React.Dispatch<any>;
  selectedElement: SelectedElement;
}

export default function DevicePreview({
  device,
  layout,
  dispatch,
  selectedElement
}: DevicePreviewProps) {
  const [mode, setMode] = React.useState<'edit' | 'preview'>('edit');

  const getWidthClass = () => {
    if (device === 'mobile') return 'max-w-[375px] border-[12px] border-slate-900 rounded-[3rem] min-h-[700px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]';
    if (device === 'tablet') return 'max-w-[768px] border-[12px] border-slate-900 rounded-[2rem] min-h-[800px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)]';
    return 'w-full max-w-5xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden';
  };

  const getTypographyClass = (variant: string) => {
    if (variant === 'modern') return 'font-sans';
    if (variant === 'clinical') return 'font-mono';
    return 'font-serif';
  };

  return (
    <div className="w-full flex flex-col items-center select-none overflow-x-hidden min-h-full py-4">
      {/* Edit vs Preview Mode switch header */}
      <div className="flex items-center p-1 bg-slate-200/50 backdrop-blur-sm rounded-full mb-8 shadow-xs border border-slate-300/50">
        <button
          onClick={() => setMode('edit')}
          className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all duration-300 ${mode === 'edit' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Builder Canvas
        </button>
        <button
          onClick={() => setMode('preview')}
          className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all duration-300 ${mode === 'preview' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Live Preview
        </button>
      </div>

      {/* Main Preview Wrap Container */}
      <div className={`w-full bg-white transition-all duration-500 flex-1 flex flex-col relative ${getWidthClass()}`}>
        {/* Decorative device notch for mobile/tablet */}
        {(device === 'mobile' || device === 'tablet') && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-30 pointer-events-none" />
        )}
        
        {mode === 'edit' ? (
          <div className="p-4 md:p-8 flex-1 flex flex-col bg-slate-50/30 overflow-y-auto">
            <BuilderCanvas
              layout={layout}
              dispatch={dispatch}
              selectedElement={selectedElement}
              device={device}
            />
          </div>
        ) : (
          <div className={`p-6 flex-1 overflow-y-auto bg-white ${getTypographyClass(layout.page.typography)}`}>
            <CustomTemplateRenderer
              layoutConfig={layout}
              blocksDoc={buildPreviewBlocksDoc(layout)}
              isPreview={true}
              previewDevice={device}
              title={layout.metadata.name}
              excerpt={layout.metadata.description}
            />
          </div>
        )}
      </div>
    </div>
  );
}
