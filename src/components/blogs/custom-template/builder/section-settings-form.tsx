'use client';

import React from 'react';
import type { CustomTemplateSection } from '../custom-template.types';
import { Select } from '@/components/ui/select';

interface SectionSettingsFormProps {
  sectionId: string;
  sections: CustomTemplateSection[];
  dispatch: React.Dispatch<unknown>;
}

export default function SectionSettingsForm({
  sectionId,
  sections,
  dispatch
}: SectionSettingsFormProps) {
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return null;

  const handleUpdate = (updates: Partial<Omit<CustomTemplateSection, 'id' | 'slots'>>) => {
    dispatch({
      type: 'update_section',
      sectionId,
      updates
    });
  };

  return (
    <div className="space-y-6 bg-white border border-slate-200 shadow-xs rounded-xl p-5 select-none">
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Section Configuration</h4>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">{section.id}</p>
      </div>

      <div className="space-y-4">
        <Select
          label="Section Status"
          options={[
            { label: 'Enabled (active)', value: 'true' },
            { label: 'Disabled (hidden)', value: 'false' }
          ]}
          value={String(section.enabled)}
          onChange={(e) => handleUpdate({ enabled: e.target.value === 'true' })}
        />

        <Select
          label="Column Layout"
          options={[
            { label: 'Full Width Row (1 Slot)', value: 'full_width' },
            { label: 'Split Content + Sidebar (2 Slots)', value: 'content_sidebar' },
            { label: 'Two Equal Columns (2 Slots)', value: 'two_column' },
            { label: 'Three Equal Columns (3 Slots)', value: 'three_column' }
          ]}
          value={section.layout}
          onChange={(e) => handleUpdate({ layout: e.target.value as any })}
        />

        <Select
          label="Responsive Strategy"
          options={[
            { label: 'Stack items vertically on mobile screen', value: 'stack_on_mobile' },
            { label: 'Push Sidebar below content grid on tablets', value: 'sidebar_below_on_tablet' },
            { label: 'Keep Equal column widths always', value: 'equal_columns' },
            { label: 'Main flow + Side section grid', value: 'main_sidebar' },
            { label: 'Adapt 3-cols to 2-cols to 1-col grids', value: 'three_to_two_to_one' }
          ]}
          value={section.responsiveStrategy}
          onChange={(e) => handleUpdate({ responsiveStrategy: e.target.value as any })}
        />

        <Select
          label="Background Style"
          options={[
            { label: 'Plain White', value: 'white' },
            { label: 'Soft Slate Block', value: 'slate' },
            { label: 'Clean Blue Sky Tint', value: 'sky' }
          ]}
          value={section.background || 'white'}
          onChange={(e) => handleUpdate({ background: e.target.value as any })}
        />
      </div>
    </div>
  );
}
