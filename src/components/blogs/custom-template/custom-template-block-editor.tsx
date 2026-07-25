'use client';

import { useEffect } from 'react';
import type { BlogBlocksDocument, CustomBlockInstanceContent } from '@/types/blog-blocks';
import { createDefaultCustomInstanceContent } from '@/types/blog-blocks';
import type { MediaAsset } from '@/types/media';
import {
  ExpertQuoteFields,
  FaqFields,
  FeedbackShareFields,
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

interface EditableInstance {
  blockId: string;
  componentKey: Exclude<Extract<CustomTemplateComponentInstance, { blockId: string }>['componentKey'], 'rich_article_content'>;
  label: string;
}

function collectEditableInstances(config: CustomTemplateLayoutConfigV1): EditableInstance[] {
  const seen = new Map<string, number>();
  const instances: EditableInstance[] = [];
  for (const section of config.sections) {
    for (const slot of section.slots) {
      for (const component of slot.components) {
        if (!isRegisteredComponentKey(component.componentKey)) continue;
        const def = getComponentDefinition(component.componentKey);
        if (def.category !== 'content' || def.requiredBlockKey === 'article_content' || !def.requiredBlockKey) continue;
        const blockId = (component as { blockId?: string }).blockId;
        if (!blockId) continue;
        instances.push({ blockId, componentKey: component.componentKey as EditableInstance['componentKey'], label: def.displayName });
      }
    }
  }
  for (const instance of instances) seen.set(instance.componentKey, (seen.get(instance.componentKey) ?? 0) + 1);
  const runningCount = new Map<string, number>();
  return instances.map((instance) => {
    const total = seen.get(instance.componentKey) ?? 1;
    if (total <= 1) return instance;
    const next = (runningCount.get(instance.componentKey) ?? 0) + 1;
    runningCount.set(instance.componentKey, next);
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
    case 'feedback':
    case 'share':
      return true;
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

  // Components get their blockId assigned as soon as they're added on the canvas, but the
  // editor only writes into custom_instances once the admin touches a field. Backfill defaults
  // for any newly-added block so Live Preview validation doesn't fail on untouched sections.
  useEffect(() => {
    const missing = editableInstances.filter(({ blockId }) => !value.custom_instances?.[blockId]);
    if (missing.length === 0) return;
    onChange({
      ...value,
      custom_instances: missing.reduce(
        (acc, { blockId, componentKey }) => ({ ...acc, [blockId]: createDefaultCustomInstanceContent(componentKey) }),
        { ...value.custom_instances }
      )
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableInstances.map((i) => i.blockId).join(',')]);

  if (editableInstances.length === 0) {
    return <section aria-labelledby="article-sections-heading" className="space-y-4">
      <div><h2 id="article-sections-heading" className="text-base font-bold text-slate-900">Article Sections</h2></div>
      <p className="text-xs text-slate-500">This Custom Template does not define any editable content sections.</p>
    </section>;
  }

  return <section aria-labelledby="article-sections-heading" className="space-y-4">
    <div><h2 id="article-sections-heading" className="text-base font-bold text-slate-900">Article Sections</h2><p className="mt-1 text-xs text-slate-500">Content for the sections defined by this Custom Template.</p></div>

    {editableInstances.map(({ blockId, componentKey, label }) => {
      const instance = value.custom_instances?.[blockId] ?? createDefaultCustomInstanceContent(componentKey);
      const fieldPrefix = `blocks_json.custom_instances.${blockId}`;
      const key = `instance-${blockId}`;

      if (instance.componentKey === 'hero') {
        return <Section key={key} title={label} required complete={isComplete(instance)}>
          <HeroFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'hero' })} errors={errors} fieldPrefix={fieldPrefix} />
        </Section>;
      }
      if (instance.componentKey === 'medical_disclaimer') {
        return <Section key={key} title={label} required complete={isComplete(instance)}>
          <MedicalDisclaimerFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'medical_disclaimer' })} errors={errors} fieldPrefix={fieldPrefix} />
        </Section>;
      }
      if (instance.componentKey === 'feedback' || instance.componentKey === 'share') {
        return null;
      }

      const enabled = instance.enabled;
      const onEnabledChange = (nextEnabled: boolean) => setInstance(blockId, { ...instance, enabled: nextEnabled } as CustomBlockInstanceContent);

      return <Section key={key} title={label} enabled={enabled} complete={isComplete(instance)} onEnabledChange={onEnabledChange}>
        {instance.componentKey === 'key_takeaways' && <KeyTakeawaysFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'key_takeaways' })} errors={errors} fieldPrefix={fieldPrefix} />}
        {instance.componentKey === 'image_comparison' && <ImageComparisonFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'image_comparison' })} errors={errors} fieldPrefix={fieldPrefix} onMediaResolved={onMediaResolved} />}
        {instance.componentKey === 'numbered_list' && <NumberedListFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'numbered_list' })} fieldPrefix={fieldPrefix} />}
        {instance.componentKey === 'expert_quote' && <ExpertQuoteFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'expert_quote' })} fieldPrefix={fieldPrefix} onMediaResolved={onMediaResolved} />}
        {instance.componentKey === 'medical_cta' && <MedicalCtaFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'medical_cta' })} fieldPrefix={fieldPrefix} />}
        {instance.componentKey === 'faq' && <FaqFields value={instance} onChange={(v) => setInstance(blockId, { ...v, componentKey: 'faq' })} errors={errors} fieldPrefix={fieldPrefix} />}
      </Section>;
    })}

    {(() => {
      const feedbackSlot = editableInstances.find((i) => i.componentKey === 'feedback');
      const shareSlot = editableInstances.find((i) => i.componentKey === 'share');
      if (!feedbackSlot && !shareSlot) return null;
      const feedbackInstance = feedbackSlot ? value.custom_instances?.[feedbackSlot.blockId] : undefined;
      const shareInstance = shareSlot ? value.custom_instances?.[shareSlot.blockId] : undefined;
      const feedback = feedbackInstance?.componentKey === 'feedback' ? feedbackInstance : createDefaultCustomInstanceContent('feedback') as Extract<CustomBlockInstanceContent, { componentKey: 'feedback' }>;
      const share = shareInstance?.componentKey === 'share' ? shareInstance : createDefaultCustomInstanceContent('share') as Extract<CustomBlockInstanceContent, { componentKey: 'share' }>;
      return <Section title="Helpful Feedback and Share Controls" required complete>
        <FeedbackShareFields
          feedback={feedback}
          share={share}
          onFeedbackChange={(v) => feedbackSlot && setInstance(feedbackSlot.blockId, { ...v, componentKey: 'feedback' })}
          onShareChange={(v) => shareSlot && setInstance(shareSlot.blockId, { ...v, componentKey: 'share' })}
        />
      </Section>;
    })()}
  </section>;
}
