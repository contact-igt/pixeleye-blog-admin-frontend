'use client';

import React from 'react';
import type { CustomTemplateSlot } from '../custom-template.types';
import type { SelectedElement } from './builder-state';
import BuilderComponent from './builder-component';
import { Layers } from 'lucide-react';

interface BuilderSlotProps {
  slot: CustomTemplateSlot;
  sectionId: string;
  dispatch: React.Dispatch<any>;
  selectedElement: SelectedElement;
  sections: any[];
}

export default function BuilderSlot({
  slot,
  sectionId,
  dispatch,
  selectedElement,
  sections
}: BuilderSlotProps) {
  const isSelected =
    selectedElement?.type === 'slot' &&
    selectedElement.sectionId === sectionId &&
    selectedElement.slotId === slot.id;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'select_element',
      element: { type: 'slot', sectionId, slotId: slot.id }
    });
  };

  // Implement Native HTML5 drag-and-drop handles for progressive enhancement
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.type === 'component') {
        dispatch({
          type: 'move_component_to_slot',
          componentId: data.componentId,
          fromSectionId: data.sectionId,
          fromSlotId: data.slotId,
          toSectionId: sectionId,
          toSlotId: slot.id
        });
      }
    } catch (err) {
      console.warn('Drag drop failed: ', err);
    }
  };

  return (
    <div
      onClick={handleSelect}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`rounded-xl p-3 flex flex-col gap-2 min-h-[90px] min-w-0 w-full overflow-hidden transition-all relative ${
        isSelected
          ? 'border-2 border-dashed border-sky-400 bg-sky-50/30 ring-4 ring-sky-50'
          : 'border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <div className={`flex items-center justify-between text-[10px] font-bold select-none pb-1 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`}>
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          <Layers size={12} />
          {slot.name || 'Slot'}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-sky-100' : 'bg-slate-100'}`}>{slot.components.length}/10</span>
      </div>

      <div className="flex-1 flex flex-col gap-2 relative z-10 min-w-0 w-full overflow-hidden">
        {slot.components.map((comp, idx) => (
          <BuilderComponent
            key={comp.id}
            component={comp}
            index={idx}
            total={slot.components.length}
            sectionId={sectionId}
            slotId={slot.id}
            dispatch={dispatch}
            selectedElement={selectedElement}
            sections={sections}
          />
        ))}

        {slot.components.length === 0 && (
          <div className={`flex-1 flex items-center justify-center rounded-lg p-3 text-[11px] font-semibold select-none transition-colors ${isSelected ? 'text-sky-500' : 'text-slate-400'}`}>
            Select to add components
          </div>
        )}
      </div>
    </div>
  );
}
