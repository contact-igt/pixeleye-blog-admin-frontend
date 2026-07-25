'use client';

import React, { useState } from 'react';
import { REGISTERED_COMPONENTS, ComponentCategory, getComponentDefinition } from '../component-registry';
import type { RegisteredComponentKey, CustomTemplateSectionLayout } from '../custom-template.types';
import type { SelectedElement } from './builder-state';
import { Search } from 'lucide-react';

interface ComponentPaletteProps {
  dispatch: React.Dispatch<any>;
  selectedElement: SelectedElement;
  sections: any[];
}

export default function ComponentPalette({
  dispatch,
  selectedElement,
  sections
}: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const isSlotSelected = selectedElement?.type === 'slot';
  
  // Resolve current slot zone if slot is selected
  let currentZone: 'full' | 'main' | 'sidebar' | null = null;
  let slotCapacityReached = false;
  let totalCapacityReached = false;

  if (isSlotSelected) {
    const { sectionId, slotId } = selectedElement as { sectionId: string; slotId: string };
    const section = sections.find((s) => s.id === sectionId);
    const slot = section?.slots.find((sl: any) => sl.id === slotId);
    
    if (section && slot) {
      const slotIndex = section.slots.findIndex((sl: any) => sl.id === slotId);
      const getSlotZone = (layout: CustomTemplateSectionLayout, idx: number): 'full' | 'main' | 'sidebar' => {
        if (layout === 'full_width') return 'full';
        if (layout === 'content_sidebar') return idx === 1 ? 'sidebar' : 'main';
        return 'main';
      };
      currentZone = getSlotZone(section.layout, slotIndex);
      slotCapacityReached = slot.components.length >= 10;
    }

    // Check total limit
    let total = 0;
    sections.forEach((s) => {
      s.slots.forEach((sl: any) => {
        total += sl.components.length;
      });
    });
    totalCapacityReached = total >= 60;
  }

  const keys = Object.keys(REGISTERED_COMPONENTS) as RegisteredComponentKey[];
  
  const filteredComponents = keys
    .map((key) => getComponentDefinition(key))
    .filter((def) => {
      const query = searchQuery.toLowerCase();
      return (
        def.displayName.toLowerCase().includes(query) ||
        def.category.toLowerCase().includes(query) ||
        def.key.toLowerCase().includes(query)
      );
    });

  const categories: { key: ComponentCategory; label: string }[] = [
    { key: 'content', label: 'Content Components' },
    { key: 'system', label: 'System Components' },
    { key: 'structural', label: 'Layout & Spacing' }
  ];

  const handleAddComponent = (componentKey: RegisteredComponentKey) => {
    dispatch({ type: 'add_component', componentKey });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none bg-slate-50/30">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-5 py-4 border-b border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Components</h3>
        {!isSlotSelected ? (
          <p className="text-[10px] text-amber-700 font-medium mt-1.5 bg-amber-50/80 border border-amber-200/50 p-2 rounded-lg leading-relaxed">
            Select a slot on the canvas to add components.
          </p>
        ) : (
          <p className="text-[10px] text-sky-700 font-bold mt-1.5 bg-sky-50/80 border border-sky-200/50 p-2 rounded-lg leading-relaxed">
            Adding to selected slot ({currentZone} zone)
          </p>
        )}

        <div className="relative mt-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {categories.map((cat) => {
          const catComponents = filteredComponents.filter((c) => c.category === cat.key);
          if (catComponents.length === 0) return null;

          return (
            <div key={cat.key} className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">{cat.label}</h4>
              <div className="grid gap-2">
                {catComponents.map((comp) => {
                  const allowed = currentZone ? comp.allowedZones.includes(currentZone) : false;
                  const canAdd = isSlotSelected && allowed && !slotCapacityReached && !totalCapacityReached;

                  return (
                    <button
                      key={comp.key}
                      disabled={!canAdd}
                      onClick={() => handleAddComponent(comp.key)}
                      className={`group relative w-full text-left p-3 rounded-xl border flex flex-col justify-start transition-all duration-300 ${
                        canAdd
                          ? 'border-slate-200 bg-white shadow-xs hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                          : 'border-slate-200 bg-slate-50/50 opacity-50 cursor-not-allowed'
                      }`}
                      title={
                        !isSlotSelected
                          ? 'Select a slot first'
                          : !allowed
                          ? `Not allowed in a ${currentZone} zone (Requires: ${comp.allowedZones.join(', ')})`
                          : slotCapacityReached
                          ? 'Slot capacity limit (10) reached'
                          : totalCapacityReached
                          ? 'Total layout components limit (60) reached'
                          : `Add ${comp.displayName}`
                      }
                    >
                      <span className={`text-[11px] font-bold leading-tight ${canAdd ? 'text-slate-800 group-hover:text-sky-900' : 'text-slate-600'}`}>{comp.displayName}</span>
                      {comp.requiredBlockKey && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1.5 self-start font-mono uppercase tracking-wider">
                          Block: {comp.requiredBlockKey}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
