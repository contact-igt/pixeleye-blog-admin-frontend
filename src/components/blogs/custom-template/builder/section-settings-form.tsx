'use client';

import React from 'react';
import type { CustomTemplateSection } from '../custom-template.types';
import { Select } from '@/components/ui/select';
import { SECTION_SETTING_OPTIONS } from '../custom-template-settings';

interface SectionSettingsFormProps {
  sectionId: string;
  sections: CustomTemplateSection[];
  dispatch: React.Dispatch<any>;
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
          options={[...SECTION_SETTING_OPTIONS.enabled]}
          value={String(section.enabled)}
          onChange={(e) => handleUpdate({ enabled: e.target.value === 'true' })}
        />

        <Select
          label="Column Layout"
          options={[...SECTION_SETTING_OPTIONS.layout]}
          value={section.layout}
          onChange={(e) => handleUpdate({ layout: e.target.value as any })}
        />

        <Select
          label="Responsive Strategy"
          options={[...SECTION_SETTING_OPTIONS.responsiveStrategy]}
          value={section.responsiveStrategy}
          onChange={(e) => handleUpdate({ responsiveStrategy: e.target.value as any })}
        />

        <Select
          label="Background Style"
          options={[...SECTION_SETTING_OPTIONS.backgroundStyle]}
          value={section.settings?.backgroundStyle || 'inherit'}
          onChange={(e) => dispatch({ type: 'update_section_settings', sectionId, updates: { backgroundStyle: e.target.value as any } })}
        />

        <Select
          label="Section Content Width"
          options={[...SECTION_SETTING_OPTIONS.width]}
          value={section.settings?.width || 'inherit'}
          onChange={(e) => dispatch({ type: 'update_section_settings', sectionId, updates: { width: e.target.value as any } })}
        />

        <Select
          label="Top Padding"
          options={[...SECTION_SETTING_OPTIONS.paddingTop]}
          value={section.settings?.paddingTop || 'inherit'}
          onChange={(e) => dispatch({ type: 'update_section_settings', sectionId, updates: { paddingTop: e.target.value as any } })}
        />

        <Select
          label="Bottom Padding"
          options={[...SECTION_SETTING_OPTIONS.paddingBottom]}
          value={section.settings?.paddingBottom || 'inherit'}
          onChange={(e) => dispatch({ type: 'update_section_settings', sectionId, updates: { paddingBottom: e.target.value as any } })}
        />
      </div>
    </div>
  );
}
