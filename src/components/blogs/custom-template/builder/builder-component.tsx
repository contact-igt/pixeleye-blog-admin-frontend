'use client';

import React, { useState } from 'react';
import type { CustomTemplateComponentInstance } from '../custom-template.types';
import type { SelectedElement } from './builder-state';
import { getComponentDefinition } from '../component-registry';
import { ArrowUp, ArrowDown, Copy, Trash, GripVertical } from 'lucide-react';

interface BuilderComponentProps {
  component: CustomTemplateComponentInstance;
  index: number;
  total: number;
  sectionId: string;
  slotId: string;
  dispatch: React.Dispatch<any>;
  selectedElement: SelectedElement;
  sections: any[];
}

export default function BuilderComponent({
  component,
  index,
  total,
  sectionId,
  slotId,
  dispatch,
  selectedElement,
  sections
}: BuilderComponentProps) {
  const [showMoveTargetMenu, setShowMoveTargetMenu] = useState(false);
  const isSelected =
    selectedElement?.type === 'component' &&
    selectedElement.componentId === component.id;

  const definition = getComponentDefinition(component.componentKey);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'select_element',
      element: { type: 'component', sectionId, slotId, componentId: component.id }
    });
  };

  // HTML5 Drag Event for progressive enhancement
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        type: 'component',
        componentId: component.id,
        sectionId,
        slotId
      })
    );
  };

  const handleCrossSlotMove = (toSectionId: string, toSlotId: string) => {
    dispatch({
      type: 'move_component_to_slot',
      componentId: component.id,
      fromSectionId: sectionId,
      fromSlotId: slotId,
      toSectionId,
      toSlotId
    });
    setShowMoveTargetMenu(false);
  };

  return (
    <div
      onClick={handleSelect}
      draggable
      onDragStart={handleDragStart}
      className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 select-none ${
        isSelected
          ? 'bg-white shadow-sm ring-1 ring-sky-300'
          : 'bg-white/60 hover:bg-white hover:shadow-xs border border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Floating Action Bar */}
      <div
        className={`absolute -top-3 right-4 z-20 flex items-center bg-slate-800 text-white rounded-full shadow-md px-1 py-0.5 transition-all duration-200 ${
          isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'move_component', sectionId, slotId, componentId: component.id, direction: 'up' });
          }}
          disabled={index === 0}
          className="p-1.5 hover:bg-slate-700 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Move Component Up"
        >
          <ArrowUp size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'move_component', sectionId, slotId, componentId: component.id, direction: 'down' });
          }}
          disabled={index === total - 1}
          className="p-1.5 hover:bg-slate-700 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Move Component Down"
        >
          <ArrowDown size={11} />
        </button>

        {/* Move between slots dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveTargetMenu(!showMoveTargetMenu);
            }}
            className="text-[9px] hover:bg-slate-700 font-bold px-2 py-1 mx-0.5 rounded-full transition-colors"
            title="Move component to another slot zone"
          >
            Move...
          </button>
          {showMoveTargetMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 max-h-48 overflow-y-auto text-slate-800">
              <div className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Target slot:
              </div>
              {sections.map((sec, sIdx) =>
                sec.slots.map((s: any, slIdx: number) => {
                  const isCurrent = sec.id === sectionId && s.id === slotId;
                  if (isCurrent) return null;

                  return (
                    <button
                      key={s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCrossSlotMove(sec.id, s.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-sky-50 flex flex-col justify-start transition-colors"
                    >
                      <span className="font-semibold text-slate-900 leading-tight">
                        Section {sIdx + 1} &gt; {s.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'duplicate_component', sectionId, slotId, componentId: component.id });
          }}
          className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"
          title="Duplicate Component"
        >
          <Copy size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'remove_component', sectionId, slotId, componentId: component.id });
          }}
          className="p-1.5 hover:bg-rose-500 hover:text-white text-rose-300 rounded-full transition-colors ml-0.5"
          title="Delete Component"
        >
          <Trash size={11} />
        </button>
      </div>

      {/* Label and Key */}
      <div className="flex items-center gap-3 min-w-0">
        <GripVertical size={14} className="text-slate-300 group-hover:text-slate-500 shrink-0 cursor-grab active:cursor-grabbing transition-colors" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold truncate leading-snug ${isSelected ? 'text-sky-900' : 'text-slate-700'}`}>
              {definition.displayName}
            </span>
            {!component.enabled && (
              <span className="text-[8px] bg-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                Off
              </span>
            )}
          </div>
          <div className="text-[9px] text-slate-400 font-medium mt-0.5 truncate uppercase tracking-wider">
            {definition.category} • {component.componentKey}
          </div>
        </div>
      </div>
    </div>
  );
}
