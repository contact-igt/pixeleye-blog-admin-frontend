'use client';

import { useEffect } from 'react';
import type { TipTapDocument } from '@/types/blog';
import type { BlogBlocksDocument, CustomBlockInstanceContent } from '@/types/blog-blocks';
import { createDefaultCustomInstanceContent } from '@/types/blog-blocks';
import type { MediaAsset } from '@/types/media';
import { RichTextEditor } from '../rich-text-editor';
import {
  ExpertQuoteFields,
  FaqFields,
  HeroFields,
  ImageComparisonFields,
  KeyTakeawaysFields,
  MedicalCtaFields,
  MedicalDisclaimerFields,
  NumberedListFields,
  Section,
  TableFields
} from '../blocks/blog-block-editor';
import { getComponentDefinition, isRegisteredComponentKey } from './component-registry';
import type { CustomTemplateComponentInstance, CustomTemplateLayoutConfigV1, TableSettings } from './custom-template.types';

export interface EditableInstance {
  blockId: string;
  componentKey: CustomBlockInstanceContent['componentKey'];
  label: string;
  settings: Record<string, unknown>;
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
        if (!definition.requiresBlockId) continue;
        if (!definition.editableInBlog && component.componentKey !== 'rich_article_content') continue;
        let blockId = (component as { blockId?: string }).blockId;
        if (!blockId) continue;
        if (seenBlockIds.has(blockId)) {
          if (component.componentKey === 'rich_article_content') {
            blockId = component.id ? `article_${component.id}` : `rich_article_extra_${seenBlockIds.size}`;
          } else {
            continue;
          }
        }
        seenBlockIds.add(blockId);
        instances.push({ blockId, componentKey: component.componentKey as EditableInstance['componentKey'], label: definition.displayName, settings: component.settings as unknown as Record<string, unknown> });
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
    case 'rich_article_content': return !instance.enabled || Boolean(instance.html.replace(/<[^>]*>/g, '').trim());
    case 'key_takeaways': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'image_comparison': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'numbered_list': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'expert_quote': return !instance.enabled || Boolean(instance.quote && instance.name && instance.role);
    case 'medical_cta': return !instance.enabled || Boolean(instance.heading && instance.description && ((instance.primary.label && instance.primary.url) || (instance.secondary.label && instance.secondary.url)));
    case 'faq': return !instance.enabled || Boolean(instance.heading && instance.items.length);
    case 'medical_disclaimer': return Boolean(instance.text.trim());
    case 'feedback': return !instance.enabled || Boolean(instance.prompt.trim());
    case 'share': return true;
    case 'table': return !instance.enabled || Boolean(instance.headers.length && instance.rows.length && instance.rows.every((row) => row.length === instance.headers.length));
  }
}

function clampTableToCapacity(instance: Extract<CustomBlockInstanceContent, { componentKey: 'table' }>, settings: Record<string, unknown>): Extract<CustomBlockInstanceContent, { componentKey: 'table' }> {
  const maxRows = Number((settings as Partial<TableSettings>).maxRows ?? 4);
  const maxColumns = Number((settings as Partial<TableSettings>).maxColumns ?? 4);
  if (instance.headers.length <= maxColumns && instance.rows.length <= maxRows) return instance;
  const headers = instance.headers.slice(0, Math.max(1, maxColumns));
  return {
    ...instance,
    headers,
    rows: instance.rows.slice(0, Math.max(1, maxRows)).map((row) => row.slice(0, headers.length))
  };
}

export function CustomTemplateBlockEditor({ layoutConfig, value, onChange, errors = {}, onMediaResolved, articleContent, articleHtml, onArticleContentChange, articleContentError }: {
  layoutConfig: CustomTemplateLayoutConfigV1;
  value: BlogBlocksDocument;
  onChange: (value: BlogBlocksDocument) => void;
  errors?: Record<string, string>;
  onMediaResolved?: (id: string, media: MediaAsset | null) => void;
  articleContent?: TipTapDocument;
  articleHtml?: string;
  onArticleContentChange?: (value: TipTapDocument, html: string) => void;
  articleContentError?: string;
}) {
  const editableInstances = collectEditableInstances(layoutConfig);
  const setInstance = (blockId: string, next: CustomBlockInstanceContent) =>
    onChange({ ...value, custom_instances: { ...value.custom_instances, [blockId]: next } });

  useEffect(() => {
    const missing = editableInstances.filter(({ blockId, componentKey }) => blockId !== 'article_content' && value.custom_instances?.[blockId]?.componentKey !== componentKey);
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

    {editableInstances.map(({ blockId, componentKey, label, settings }) => {
      const stored = blockId === 'article_content' ? undefined : value.custom_instances?.[blockId];
      let instance = stored?.componentKey === componentKey ? stored : createDefaultCustomInstanceContent(componentKey);
      if (!stored && instance.componentKey === 'table') {
        instance = clampTableToCapacity(instance, settings);
      }
      const fieldPrefix = `blocks_json.custom_instances.${blockId}`;
      const key = `instance-${blockId}`;

      if (instance.componentKey === 'rich_article_content') {
        const isMainArticleContent = blockId === 'article_content';
        if (isMainArticleContent) {
          const mainArticleHasText = Boolean(articleHtml?.replace(/<[^>]*>/g, '').trim());
          return <Section key={key} title={label} required complete={mainArticleHasText}>
            <RichTextEditor
              value={articleContent}
              onChange={(content_json, html) => onArticleContentChange?.(content_json, html)}
              error={articleContentError}
            />
          </Section>;
        }
        const richEnabled = instance.enabled;
        const onRichEnabledChange = (nextEnabled: boolean) => setInstance(blockId, { ...instance, enabled: nextEnabled });
        return <Section key={key} title={label} enabled={richEnabled} complete={isComplete(instance)} onEnabledChange={onRichEnabledChange}>
          <RichTextEditor
            value={instance.content_json}
            onChange={(content_json, html) => setInstance(blockId, { componentKey: 'rich_article_content', enabled: instance.enabled, content_json, html })}
            error={errors[`${fieldPrefix}.html`] ?? errors[`${fieldPrefix}.content_json`]}
          />
        </Section>;
      }

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
        {instance.componentKey === 'table' && (
          <TableFields
            value={instance}
            onChange={(next) => setInstance(blockId, { ...next, componentKey: 'table' })}
            errors={errors}
            fieldPrefix={fieldPrefix}
            maxRows={Number((settings as Partial<TableSettings>).maxRows ?? 4)}
            maxColumns={Number((settings as Partial<TableSettings>).maxColumns ?? 4)}
          />
        )}
      </Section>;
    })}
  </section>;
}
