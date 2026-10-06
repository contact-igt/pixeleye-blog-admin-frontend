'use client';

import React from 'react';
import { getComponentDefinition } from '../component-registry';
import { Select } from '@/components/ui/select';
import type { BuilderAction } from './builder-reducer';

import type { CustomTemplateSection } from '../custom-template.types';

interface ComponentSettingsFormProps {
  sectionId: string;
  slotId: string;
  componentId: string;
  sections: CustomTemplateSection[];
  dispatch: React.Dispatch<BuilderAction>;
}

export default function ComponentSettingsForm({
  sectionId,
  slotId,
  componentId,
  sections,
  dispatch
}: ComponentSettingsFormProps) {
  const section = sections.find((s) => s.id === sectionId);
  const slot = section?.slots.find((sl) => sl.id === slotId);
  const component = slot?.components.find((c) => c.id === componentId);

  if (!component) return null;

  const definition = getComponentDefinition(component.componentKey);

  const handleUpdate = (updates: Extract<BuilderAction, { type: 'update_component' }>['updates']) => {
    dispatch({
      type: 'update_component',
      sectionId,
      slotId,
      componentId,
      updates
    });
  };

  const renderSettingsFields = () => {
    const s = component.settings as unknown as Record<string, string | undefined>;
    switch (component.componentKey) {
      case 'hero':
        return (
          <>
            <Select
              label="Banner Height"
              options={[
                { label: 'Compact Layout', value: 'compact' },
                { label: 'Standard Height', value: 'standard' },
                { label: 'Tall Hero Banner', value: 'tall' }
              ]}
              value={s.height}
              onChange={(e) => handleUpdate({ settings: { ...s, height: e.target.value } })}
            />
            <Select
              label="Text Alignment"
              options={[
                { label: 'Left align', value: 'left' },
                { label: 'Center align', value: 'center' }
              ]}
              value={s.alignment}
              onChange={(e) => handleUpdate({ settings: { ...s, alignment: e.target.value } })}
            />
            <Select
              label="Overlay Intensity"
              options={[
                { label: 'Light opacity overlay', value: 'light' },
                { label: 'Medium opacity overlay', value: 'medium' },
                { label: 'Strong contrast overlay', value: 'strong' }
              ]}
              value={s.overlay}
              onChange={(e) => handleUpdate({ settings: { ...s, overlay: e.target.value } })}
            />
          </>
        );

      case 'rich_article_content':
        return (
          <>
            <Select
              label="Font Size"
              options={[
                { label: 'Small', value: 'small' },
                { label: 'Medium (Standard)', value: 'medium' },
                { label: 'Large (Spacious)', value: 'large' }
              ]}
              value={s.fontSize}
              onChange={(e) => handleUpdate({ settings: { ...s, fontSize: e.target.value } })}
            />
            <Select
              label="Line Height spacing"
              options={[
                { label: 'Normal lines', value: 'normal' },
                { label: 'Relaxed reading height', value: 'relaxed' }
              ]}
              value={s.lineHeight}
              onChange={(e) => handleUpdate({ settings: { ...s, lineHeight: e.target.value } })}
            />
          </>
        );

      case 'key_takeaways':
        return (
          <>
            <Select
              label="Panel variant design"
              options={[
                { label: 'Soft Tint Background', value: 'soft' },
                { label: 'Bordered card style', value: 'bordered' }
              ]}
              value={s.variant}
              onChange={(e) => handleUpdate({ settings: { ...s, variant: e.target.value } })}
            />
            <Select
              label="Columns distribution"
              options={[
                { label: 'Single Column layout', value: 'one' },
                { label: 'Split Two Columns', value: 'two' }
              ]}
              value={s.columns}
              onChange={(e) => handleUpdate({ settings: { ...s, columns: e.target.value } })}
            />
          </>
        );

      case 'image_comparison':
        return (
          <>
            <Select
              label="Comparison Columns"
              options={[
                { label: 'Single card', value: 'one' },
                { label: 'Double cards', value: 'two' },
                { label: 'Triple grid items', value: 'three' }
              ]}
              value={s.columns}
              onChange={(e) => handleUpdate({ settings: { ...s, columns: e.target.value } })}
            />
            <Select
              label="Image Ratio"
              options={[
                { label: 'Square (1:1)', value: 'square' },
                { label: 'Landscape (16:9)', value: 'landscape' }
              ]}
              value={s.imageRatio}
              onChange={(e) => handleUpdate({ settings: { ...s, imageRatio: e.target.value } })}
            />
          </>
        );

      case 'numbered_list':
        return (
          <Select
            label="Numbers Circle design"
            options={[
              { label: 'Circular solid badge', value: 'circle' },
              { label: 'Simple numeric text', value: 'simple' }
            ]}
            value={s.style}
            onChange={(e) => handleUpdate({ settings: { ...s, style: e.target.value } })}
          />
        );

      case 'expert_quote':
        return (
          <>
            <Select
              label="Layout orientation"
              options={[
                { label: 'Horizontal inline layout', value: 'horizontal' },
                { label: 'Stacked vertical alignment', value: 'stacked' }
              ]}
              value={s.orientation}
              onChange={(e) => handleUpdate({ settings: { ...s, orientation: e.target.value } })}
            />
            <Select
              label="Background Theme"
              options={[
                { label: 'Soft slate color tint', value: 'soft' },
                { label: 'Plain white background', value: 'white' }
              ]}
              value={s.background}
              onChange={(e) => handleUpdate({ settings: { ...s, background: e.target.value } })}
            />
          </>
        );

      case 'medical_cta':
        return (
          <>
            <Select
              label="CTA Primary Theme color"
              options={[
                { label: 'Navy primary button', value: 'navy' },
                { label: 'Blue primary button', value: 'blue' }
              ]}
              value={s.style}
              onChange={(e) => handleUpdate({ settings: { ...s, style: e.target.value } })}
            />
            <Select
              label="Buttons Layout grid"
              options={[
                { label: 'Inline buttons row', value: 'inline' },
                { label: 'Stacked layout buttons', value: 'stacked' }
              ]}
              value={s.buttonLayout}
              onChange={(e) => handleUpdate({ settings: { ...s, buttonLayout: e.target.value } })}
            />
          </>
        );

      case 'faq':
        return (
          <>
            <Select
              label="Accordions structure"
              options={[
                { label: 'Q&A list (always open, numbered)', value: 'qa_list' },
                { label: 'Accordion split illustration', value: 'image_accordion' }
              ]}
              value={s.layout}
              onChange={(e) => handleUpdate({ settings: { ...s, layout: e.target.value } })}
            />
            <Select
              label="Default Open item"
              options={[
                { label: 'First accordion index active', value: 'first' },
                { label: 'Collapse all list indexes', value: 'none' }
              ]}
              value={s.defaultOpen}
              onChange={(e) => handleUpdate({ settings: { ...s, defaultOpen: e.target.value } })}
            />
          </>
        );

      case 'feedback':
        return (
          <Select
            label="Show widget vote prompt"
            options={[
              { label: 'Render helpful query text', value: 'true' },
              { label: 'Hide prompt text header', value: 'false' }
            ]}
            value={String(s.showPrompt)}
            onChange={(e) => handleUpdate({ settings: { ...s, showPrompt: e.target.value === 'true' } })}
          />
        );

      case 'share':
        return (
          <Select
            label="Share buttons alignment"
            options={[
              { label: 'Left alignment side', value: 'left' },
              { label: 'Center centered layout', value: 'center' },
              { label: 'Right sidebar float aligned', value: 'right' }
            ]}
            value={s.alignment}
            onChange={(e) => handleUpdate({ settings: { ...s, alignment: e.target.value } })}
          />
        );

      case 'medical_disclaimer':
        return (
          <Select
            label="Disclaimer variant contrast"
            options={[
              { label: 'Standard neutral color text', value: 'standard' },
              { label: 'Prominent warning theme banner', value: 'prominent' }
            ]}
            value={s.variant}
            onChange={(e) => handleUpdate({ settings: { ...s, variant: e.target.value } })}
          />
        );

      case 'table':
        return (
          <>
            <Select
              label="Table Style"
              options={[
                { label: 'Striped rows', value: 'striped' },
                { label: 'Bordered grid', value: 'bordered' },
                { label: 'Clean minimal', value: 'clean' }
              ]}
              value={s.variant}
              onChange={(e) => handleUpdate({ settings: { ...s, variant: e.target.value } })}
            />
            <Select
              label="Header Style"
              options={[
                { label: 'Brand Sky', value: 'brand_sky' },
                { label: 'Dark Slate', value: 'dark_slate' },
                { label: 'Light Gray', value: 'light_gray' }
              ]}
              value={s.headerStyle}
              onChange={(e) => handleUpdate({ settings: { ...s, headerStyle: e.target.value } })}
            />
            <Select
              label="Text Alignment"
              options={[
                { label: 'Left align', value: 'left' },
                { label: 'Center align', value: 'center' }
              ]}
              value={s.alignment}
              onChange={(e) => handleUpdate({ settings: { ...s, alignment: e.target.value } })}
            />
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Maximum Rows (1-50)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={Number(s.maxRows ?? 4)}
                onChange={(e) => handleUpdate({ settings: { ...s, maxRows: Math.min(50, Math.max(1, Number(e.target.value) || 1)) } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
              <p className="text-[10px] text-slate-400">Blog authors can use up to this many rows — not a fixed count.</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Maximum Columns (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={Number(s.maxColumns ?? 4)}
                onChange={(e) => handleUpdate({ settings: { ...s, maxColumns: Math.min(10, Math.max(1, Number(e.target.value) || 1)) } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
              <p className="text-[10px] text-slate-400">Blog authors can use up to this many columns — not a fixed count.</p>
            </div>
          </>
        );

      case 'article_table_of_contents':
        return (
          <Select
            label="Sticky Floating Behavior"
            options={[
              { label: 'Affix to sidebar on scroll', value: 'true' },
              { label: 'Static document flow', value: 'false' }
            ]}
            value={String(s.sticky)}
            onChange={(e) => handleUpdate({ settings: { ...s, sticky: e.target.value === 'true' } })}
          />
        );

      case 'appointment_card':
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Booking Header</label>
              <input
                type="text"
                value={s.heading}
                onChange={(e) => handleUpdate({ settings: { ...s, heading: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Button Label</label>
              <input
                type="text"
                value={s.buttonLabel}
                onChange={(e) => handleUpdate({ settings: { ...s, buttonLabel: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Destination URL path</label>
              <input
                type="text"
                value={s.targetUrl}
                onChange={(e) => handleUpdate({ settings: { ...s, targetUrl: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
          </div>
        );

      case 'newsletter_card':
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Card Header</label>
              <input
                type="text"
                value={s.heading}
                onChange={(e) => handleUpdate({ settings: { ...s, heading: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description Text</label>
              <textarea
                value={s.description}
                onChange={(e) => handleUpdate({ settings: { ...s, description: e.target.value } })}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Signup Button Label</label>
              <input
                type="text"
                value={s.buttonLabel}
                onChange={(e) => handleUpdate({ settings: { ...s, buttonLabel: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
          </div>
        );

      case 'blog_categories':
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Section Heading</label>
              <input
                type="text"
                maxLength={120}
                value={s.heading ?? ''}
                onChange={(e) => handleUpdate({ settings: { ...s, heading: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Maximum Categories (1-20)</label>
              <input
                type="number"
                min={1}
                max={20}
                value={Number(s.maxItems ?? 8)}
                onChange={(e) => handleUpdate({ settings: { ...s, maxItems: Math.min(20, Math.max(1, Number(e.target.value) || 1)) } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
            <Select
              label="Show blog count per category"
              options={[
                { label: 'Hide counts', value: 'false' },
                { label: 'Show counts', value: 'true' }
              ]}
              value={String(s.showCount)}
              onChange={(e) => handleUpdate({ settings: { ...s, showCount: e.target.value === 'true' } })}
            />
          </div>
        );

      case 'recent_related_blogs':
        return (
          <div className="space-y-3">
            <Select
              label="Blogs to display"
              options={[
                { label: 'Related / Recent tabs (related picked per blog)', value: 'tabs' },
                { label: 'Recent blogs only', value: 'recent' },
                { label: 'Related blogs only (picked per blog)', value: 'related' }
              ]}
              value={s.mode}
              onChange={(e) => handleUpdate({ settings: { ...s, mode: e.target.value } })}
            />
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Section Heading (optional)</label>
              <input
                type="text"
                maxLength={120}
                value={s.heading ?? ''}
                onChange={(e) => handleUpdate({ settings: { ...s, heading: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Maximum Blogs (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={Number(s.maxItems ?? 4)}
                onChange={(e) => handleUpdate({ settings: { ...s, maxItems: Math.min(10, Math.max(1, Number(e.target.value) || 1)) } })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>
            <Select
              label="Thumbnail image"
              options={[
                { label: 'Show image', value: 'true' },
                { label: 'Hide image', value: 'false' }
              ]}
              value={String(s.showImage)}
              onChange={(e) => handleUpdate({ settings: { ...s, showImage: e.target.value === 'true' } })}
            />
            <Select
              label="Published date"
              options={[
                { label: 'Show date', value: 'true' },
                { label: 'Hide date', value: 'false' }
              ]}
              value={String(s.showDate)}
              onChange={(e) => handleUpdate({ settings: { ...s, showDate: e.target.value === 'true' } })}
            />
          </div>
        );

      case 'spacer':
        return (
          <Select
            label="Vertical Height Spacer Size"
            options={[
              { label: 'Small Gap (16px)', value: 'small' },
              { label: 'Medium Standard (32px)', value: 'medium' },
              { label: 'Large Spacing (48px)', value: 'large' }
            ]}
            value={s.size}
            onChange={(e) => handleUpdate({ settings: { ...s, size: e.target.value } })}
          />
        );

      case 'divider':
        return (
          <Select
            label="Border Style divider"
            options={[
              { label: 'Solid Gray line', value: 'solid' },
              { label: 'Dashed separator path', value: 'dashed' }
            ]}
            value={s.style}
            onChange={(e) => handleUpdate({ settings: { ...s, style: e.target.value } })}
          />
        );

      default:
        return null;
    }
  };


  return (
    <div className="space-y-6 bg-white border border-slate-200 shadow-xs rounded-xl p-5 select-none">
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Component Configuration</h4>
        <p className="text-[10px] text-sky-600 font-bold mt-1 uppercase tracking-wider">{definition.displayName}</p>
      </div>

      <div className="space-y-4">
        <Select
          label="Visibility Status"
          options={[
            { label: 'Enabled (active in layout)', value: 'true' },
            { label: 'Disabled (hidden from DOM)', value: 'false' }
          ]}
          value={String(component.enabled)}
          onChange={(e) => handleUpdate({ enabled: e.target.value === 'true' })}
        />


        {renderSettingsFields()}
      </div>
    </div>
  );
}
