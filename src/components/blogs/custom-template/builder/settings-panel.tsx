'use client';

import React from 'react';
import type { BuilderState } from './builder-state';
import ComponentSettingsForm from './component-settings-form';
import SectionSettingsForm from './section-settings-form';
import ValidationPanel from './validation-panel';
import { Select } from '@/components/ui/select';

interface SettingsPanelProps {
  state: BuilderState;
  dispatch: React.Dispatch<any>;
  activeTab: 'element' | 'page' | 'validate';
  onTabChange: (tab: 'element' | 'page' | 'validate') => void;
}

export default function SettingsPanel({
  state,
  dispatch,
  activeTab,
  onTabChange
}: SettingsPanelProps) {
  const selected = state.selectedElement;

  const tabsList = [
    { id: 'element', label: 'Element' },
    { id: 'page', label: 'Layout' },
    { id: 'validate', label: 'Validate', count: state.validationResult.errors.length }
  ];

  return (
    <div className="flex flex-col h-full select-none bg-slate-50/30">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-5 py-4 border-b border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-3">Settings</h3>
        
        {/* Segmented Control Tabs */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-lg">
          {tabsList.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-sky-700 shadow-xs ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {activeTab === 'element' && (
          <div className="space-y-4">
            {!selected ? (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px] leading-relaxed">
                <span className="block font-bold text-slate-500 mb-2">No element selected</span>
                Click on a section, slot, or component on the canvas to configure its properties here.
              </div>
            ) : selected.type === 'section' ? (
              <SectionSettingsForm
                sectionId={selected.sectionId}
                sections={state.layout.sections}
                dispatch={dispatch}
              />
            ) : selected.type === 'slot' ? (
              <div className="space-y-3 bg-white border border-slate-200 shadow-xs rounded-xl p-5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Slot Configuration</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  You have selected a Slot. Use the <strong className="text-slate-700">Components Palette</strong> on the left to drag or click to add elements here.
                </p>
              </div>
            ) : (
              <ComponentSettingsForm
                sectionId={selected.sectionId}
                slotId={selected.slotId}
                componentId={selected.componentId}
                sections={state.layout.sections}
                dispatch={dispatch}
              />
            )}
          </div>
        )}

        {activeTab === 'page' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-4">Template Metadata</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Template Name</label>
                  <input
                    type="text"
                    value={state.layout.metadata.name}
                    onChange={(e) => dispatch({ type: 'update_metadata', updates: { name: e.target.value } })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                  <textarea
                    value={state.layout.metadata.description}
                    onChange={(e) => dispatch({ type: 'update_metadata', updates: { description: e.target.value } })}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-4">Page Level Styling</h4>
              <div className="space-y-4">
                <Select
                  label="Content Column Width"
                  options={[
                    { label: 'Narrow (max-w-2xl)', value: 'narrow' },
                    { label: 'Standard (max-w-4xl)', value: 'standard' },
                    { label: 'Wide (max-w-6xl)', value: 'wide' },
                    { label: 'Full Width (100%)', value: 'full' }
                  ]}
                  value={state.layout.page.contentWidth}
                  onChange={(e) => dispatch({ type: 'update_page_settings', updates: { contentWidth: e.target.value as any } })}
                />

                <Select
                  label="Page Background Style"
                  options={[
                    { label: 'White Plain', value: 'white' },
                    { label: 'Soft Slated Gray', value: 'soft_gray' },
                    { label: 'Brand Tinted Blue', value: 'brand_tint' }
                  ]}
                  value={state.layout.page.background}
                  onChange={(e) => dispatch({ type: 'update_page_settings', updates: { background: e.target.value as any } })}
                />

                <Select
                  label="Vertical Section Spacing"
                  options={[
                    { label: 'Compact Spacing', value: 'compact' },
                    { label: 'Normal Standard Spacing', value: 'normal' },
                    { label: 'Spacious Paddings', value: 'spacious' }
                  ]}
                  value={state.layout.page.spacing}
                  onChange={(e) => dispatch({ type: 'update_page_settings', updates: { spacing: e.target.value as any } })}
                />

                <Select
                  label="Typography Variant"
                  options={[
                    { label: 'Editorial (Serif Content)', value: 'editorial' },
                    { label: 'Modern Sans', value: 'modern' },
                    { label: 'Clinical Monospace accents', value: 'clinical' }
                  ]}
                  value={state.layout.page.typography}
                  onChange={(e) => dispatch({ type: 'update_page_settings', updates: { typography: e.target.value as any } })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'validate' && (
          <ValidationPanel
            errors={state.validationResult.errors}
            layout={state.layout}
            dispatch={dispatch}
            onSelectTab={onTabChange}
          />
        )}
      </div>
    </div>
  );
}
