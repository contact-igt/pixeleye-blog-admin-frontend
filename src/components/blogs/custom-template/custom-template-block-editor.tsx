'use client';

import { useEffect } from 'react';
import type { BlogBlocksDocument, CustomBlockInstanceContent } from '@/types/blog-blocks';
import { createDefaultCustomInstanceContent } from '@/types/blog-blocks';
import type { MediaAsset } from '@/types/media';
import {
  ExpertQuoteFields,
  FaqFields,
  HeroFields,
  ImageComparisonFields,
  KeyTakeawaysFields,
  MedicalCtaFields,
  MedicalDisclaimerFields,
  NumberedListFields,
  Section
} from '../blocks/blog-block-editor';
import { getComponentDefinition, isRegisteredComponentKey } from './component-registry';
import type { CustomTemplateComponentInstance, CustomTemplateLayoutConfigV1 } from './custom-template.types';

export interface EditableInstance {
  blockId: string;
  componentKey: Exclude<Extract<CustomTemplateComponentInstance, { blockId: string }>['componentKey'], 'rich_article_content'>;
  label: string;
}

export function collectEditableInstances(config: CustomTemplateLayoutConfigV1): EditableInstance[] {
  const counts = new Map<string, number>();
  const seenBlockIds = new Set<string>();
  const instances: EditableInstance[] = [];
  for (const section of config.sections) {
    if (section.enabled === false) continue;
    for (const slot of section.slots) {
      for (const component of slot.components) {
        if (component.enabled === false || !isRegisteredComponentKey(component.componentKey)) continue;
        const definition = getComponentDefinition(component.componentKey);
        if (!definition.editableInBlog || !definition.requiresBlockId || definition.requiredBlockKey === 'article_content') continue;
        const blockId = (component as { blockId?: string }).blockId;
        if (!blockId || seenBlockIds.has(blockId)) continue;
        seenBlockIds.add(blockId);
        instances.push({ blockId, componentKey: component.componentKey as EditableInstance['componentKey'], label: definition.displayName });
        counts.set(component.componentKey, (counts.get(component.componentKey) ?? 0) + 1);
      }
    }
  }
  const running = new Map<string, number>();
  return instances.map((instance) => {
    if ((counts.get(instance.componentKey) ?? 1) <= 1) return instance;
    const next = (running.get(instance.componentKey) ?? 0) + 1;
    running.set(instance.componentKey, next);
    return { ...instance, label: `${instance.label} #${next}` };
  });
}

function isComplete(instance: CustomBlockInstanceContent): boolean {
  switch (instance.componentKey) {
    case 'hero': return Boolean(instance.category || instance.breadcrumb.length || instance.reviewer.name || instance.reading_time_minutes);
    case 'key_takeaways': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'image_comparison': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'numbered_list': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'expert_quote': return !instance.enabled || Boolean(instance.quote && instance.name && instance.role);
    case 'medical_cta': return !instance.enabled || Boolean(instance.heading && instance.description && ((instance.primary.label && instance.primary.url) || (instance.secondary.label && instance.secondary.url)));
    case 'faq': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'medical_disclaimer': return Boolean(instance.text.trim());
    case 'feedback': return !instance.enabled || Boolean(instance.prompt.trim());
    case 'share': return true;
  }
}

export function CustomTemplateBlockEditor({ layoutConfig, value, onChange, errors = {}, onMediaResolved }: {
  layoutConfig: CustomTemplateLayoutConfigV1;
  value: BlogBlocksDocument;
  onChange: (value: BlogBlocksDocument) => void;
  errors?: Record<string, string>;
  onMediaResolved?: (id: string, media: MediaAsset | null) => void;
}) {
  const editableInstances = collectEditableInstances(layoutConfig);
  const setInstance = (blockId: string, next: CustomBlockInstanceContent) =>
    onChange({ ...value, custom_instances: { ...value.custom_instances, [blockId]: next } });

  useEffect(() => {
    const missing = editableInstances.filter(({ blockId, componentKey }) => value.custom_instances?.[blockId]?.componentKey !== componentKey);
    if (missing.length === 0) return;
    onChange({
      ...value,
      custom_instances: missing.reduce(
        (acc, { blockId, componentKey }) => ({ ...acc, [blockId]: createDefaultCustomInstanceContent(componentKey) }),
        { ...value.custom_instances }
      )
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableInstances.map((instance) => `${instance.blockId}:${instance.componentKey}`).join(',')]);

  if (editableInstances.length === 0) {
    return <section aria-labelledby="article-sections-heading" className="space-y-4">
      <div><h2 id="article-sections-heading" className="text-base font-bold text-slate-900">Article Sections</h2></div>
      <p className="text-xs text-slate-500">This Custom Template does not define any enabled, Blog-editable content sections.</p>
    </section>;
  }

  return <section aria-labelledby="article-sections-heading" className="space-y-4">
    <div><h2 id="article-sections-heading" className="text-base font-bold text-slate-900">Article Sections</h2><p className="mt-1 text-xs text-slate-500">Content for the enabled sections defined by this Custom Template.</p></div>

    {editableInstances.map(({ blockId, componentKey, label }) => {
      const stored = value.custom_instances?.[blockId];
      const instance = stored?.componentKey === componentKey ? stored : createDefaultCustomInstanceContent(componentKey);
      const fieldPrefix = `blocks_json.custom_instances.${blockId}`;
      const key = `instance-${blockId}`;

      if (instance.componentKey === 'hero') {
        return <Section key={key} title={label} required complete={isComplete(instance)}>
          <HeroFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'hero' })} errors={errors} fieldPrefix={fieldPrefix} />
        </Section>;
      }
      if (instance.componentKey === 'medical_disclaimer') {
        return <Section key={key} title={label} required complete={isComplete(instance)}>
          <MedicalDisclaimerFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'medical_disclaimer' })} errors={errors} fieldPrefix={fieldPrefix} />
        </Section>;
      }

      const enabled = instance.enabled;
      const onEnabledChange = (nextEnabled: boolean) => setInstance(blockId, { ...instance, enabled: nextEnabled } as CustomBlockInstanceContent);

      if (instance.componentKey === 'feedback') {
        return <Section key={key} title={label} enabled={enabled} complete={isComplete(instance)} onEnabledChange={onEnabledChange}>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
            Helpful prompt
            <input
              aria-label={`${label} prompt`}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
              value={instance.prompt}
              maxLength={160}
              onChange={(event) => setInstance(blockId, { ...instance, prompt: event.target.value })}
            />
          </label>
        </Section>;
      }

      if (instance.componentKey === 'share') {
        return <Section key={key} title={label} enabled={enabled} complete onEnabledChange={onEnabledChange}>
          <p className="text-xs leading-5 text-slate-500">Share controls use this Blog&apos;s published URL. Alignment is configured in the Custom Template builder.</p>
        </Section>;
      }

      return <Section key={key} title={label} enabled={enabled} complete={isComplete(instance)} onEnabledChange={onEnabledChange}>
        {instance.componentKey === 'key_takeaways' && <KeyTakeawaysFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'key_takeaways' })} errors={errors} fieldPrefix={fieldPrefix} />}
        {instance.componentKey === 'image_comparison' && <ImageComparisonFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'image_comparison' })} errors={errors} fieldPrefix={fieldPrefix} onMediaResolved={onMediaResolved} />}
        {instance.componentKey === 'numbered_list' && <NumberedListFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'numbered_list' })} fieldPrefix={fieldPrefix} />}
        {instance.componentKey === 'expert_quote' && <ExpertQuoteFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'expert_quote' })} fieldPrefix={fieldPrefix} onMediaResolved={onMediaResolved} />}
        {instance.componentKey === 'medical_cta' && <MedicalCtaFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'medical_cta' })} fieldPrefix={fieldPrefix} />}
        {instance.componentKey === 'faq' && <FaqFields value={instance} onChange={(next) => setInstance(blockId, { ...next, componentKey: 'faq' })} errors={errors} fieldPrefix={fieldPrefix} />}
      </Section>;
    })}
  </section>;
}