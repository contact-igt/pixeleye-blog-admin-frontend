'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/input';
import type { BlogBlocksDocument } from '@/types/blog-blocks';
import type { MediaAsset } from '@/types/media';
import { BlockMediaPicker } from './block-media-picker';
import { RepeaterEditor } from './repeater-editor';

type Blocks = BlogBlocksDocument['blocks'];
type BlockKey = keyof Blocks;

export function fieldError(errors: Record<string, string>, path: string) {
  return errors[path];
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  const isDisableAction = label === 'Disable' || (label === 'Enable' && checked);
  const displayLabel = (label === 'Disable' || label === 'Enable') ? (checked ? 'Disable' : 'Enable') : label;
  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-2 text-xs font-bold ${isDisableAction ? 'text-rose-600' : 'text-slate-600'} cursor-pointer`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          event.stopPropagation();
          onChange(event.target.checked);
        }}
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
      />
      {displayLabel}
    </label>
  );
}

function parseReadingTimeMinutes(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return Math.min(Number(digits), 240);
}

export function Section({ title, enabled = true, required = false, complete, onEnabledChange, children }: {
  title: string;
  enabled?: boolean;
  required?: boolean;
  complete: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <details
      open={isOpen}
      onToggle={(e) => {
        setIsOpen((e.target as HTMLDetailsElement).open);
      }}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <summary
        onClick={(e) => {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }}
        className="flex cursor-pointer list-none items-center justify-between gap-3 select-none"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          {complete ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-slate-300" />}
          {title}
        </span>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {required ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Required</span>
          ) : onEnabledChange ? (
            <Toggle checked={enabled} onChange={onEnabledChange} label={enabled ? 'Disable' : 'Enable'} />
          ) : null}
          <span className="text-slate-400 hover:text-slate-600">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </summary>
      {(required || enabled) && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          {children}
        </div>
      )}
    </details>
  );
}

interface FieldsProps<T> {
  value: T;
  onChange: (value: T) => void;
  errors?: Record<string, string>;
  fieldPrefix: string;
  onMediaResolved?: (id: string, media: MediaAsset | null) => void;
}

export function HeroFields({ value, onChange, errors = {}, fieldPrefix }: FieldsProps<Blocks['hero']>) {
  return <>
    <Input label="Category" value={value.category} maxLength={100} onChange={(event) => onChange({ ...value, category: event.target.value })} error={fieldError(errors, `${fieldPrefix}.category`)} />
    <RepeaterEditor items={value.breadcrumb} max={5} createItem={() => ''} addLabel="Add breadcrumb" onChange={(breadcrumb) => onChange({ ...value, breadcrumb })} renderItem={(item, index) => <Input aria-label={`Breadcrumb ${index + 1}`} value={item} maxLength={80} onChange={(event) => { const breadcrumb = [...value.breadcrumb]; breadcrumb[index] = event.target.value; onChange({ ...value, breadcrumb }); }} error={fieldError(errors, `${fieldPrefix}.breadcrumb.${index}`)} />} />
    <div className="grid gap-3 sm:grid-cols-2"><Input label="Reviewer name" value={value.reviewer.name} maxLength={120} onChange={(event) => onChange({ ...value, reviewer: { ...value.reviewer, name: event.target.value } })} /><Input label="Reviewer credentials" value={value.reviewer.credentials} maxLength={160} onChange={(event) => onChange({ ...value, reviewer: { ...value.reviewer, credentials: event.target.value } })} /></div>
    <Input label="Reading time (minutes)" type="text" inputMode="numeric" pattern="[0-9]*" value={value.reading_time_minutes ?? ''} onChange={(event) => onChange({ ...value, reading_time_minutes: parseReadingTimeMinutes(event.target.value) })} />
  </>;
}

export function KeyTakeawaysFields({ value, onChange, errors = {}, fieldPrefix }: FieldsProps<Blocks['key_takeaways']>) {
  return <>
    <Input label="Heading" value={value.heading} maxLength={120} onChange={(event) => onChange({ ...value, heading: event.target.value })} error={fieldError(errors, `${fieldPrefix}.heading`)} />
    <RepeaterEditor items={value.items} max={5} createItem={() => ''} addLabel="Add takeaway" onChange={(items) => onChange({ ...value, items })} renderItem={(item, index) => <Textarea aria-label={`Takeaway ${index + 1}`} value={item} maxLength={240} rows={2} onChange={(event) => { const items = [...value.items]; items[index] = event.target.value; onChange({ ...value, items }); }} error={fieldError(errors, `${fieldPrefix}.items.${index}`)} />} />
  </>;
}

export function ImageComparisonFields({ value, onChange, errors = {}, fieldPrefix, onMediaResolved }: FieldsProps<Blocks['image_comparison']>) {
  return <>
    <Input label="Heading" value={value.heading} maxLength={120} onChange={(event) => onChange({ ...value, heading: event.target.value })} error={fieldError(errors, `${fieldPrefix}.heading`)} />
    <RepeaterEditor items={value.items} max={6} createItem={() => ({ media_id: null, title: '', description: '' })} addLabel="Add comparison card" onChange={(items) => onChange({ ...value, items })} renderItem={(item, index) => <div className="space-y-3">
      <BlockMediaPicker label="Comparison image" value={item.media_id} onResolved={(id, media) => onMediaResolved?.(id, media)} error={fieldError(errors, `${fieldPrefix}.items.${index}.media_id`)} onChange={(id, media) => { const items = [...value.items]; items[index] = { ...item, media_id: id }; onChange({ ...value, items }); if (id) onMediaResolved?.(id, media); }} />
      <Input label="Title" value={item.title} maxLength={120} onChange={(event) => { const items = [...value.items]; items[index] = { ...item, title: event.target.value }; onChange({ ...value, items }); }} error={fieldError(errors, `${fieldPrefix}.items.${index}.title`)} />
      <Textarea label="Description" value={item.description} maxLength={500} rows={3} onChange={(event) => { const items = [...value.items]; items[index] = { ...item, description: event.target.value }; onChange({ ...value, items }); }} error={fieldError(errors, `${fieldPrefix}.items.${index}.description`)} />
    </div>} />
  </>;
}

export function NumberedListFields({ value, onChange }: FieldsProps<Blocks['numbered_list']>) {
  return <>
    <Input label="Heading" value={value.heading} maxLength={120} onChange={(event) => onChange({ ...value, heading: event.target.value })} />
    <RepeaterEditor items={value.items} max={10} createItem={() => ({ title: '', description: '' })} addLabel="Add numbered item" onChange={(items) => onChange({ ...value, items })} renderItem={(item, index) => <div className="space-y-3"><Input label="Title" value={item.title} maxLength={120} onChange={(event) => { const items = [...value.items]; items[index] = { ...item, title: event.target.value }; onChange({ ...value, items }); }} /><Textarea label="Description" value={item.description} maxLength={500} rows={3} onChange={(event) => { const items = [...value.items]; items[index] = { ...item, description: event.target.value }; onChange({ ...value, items }); }} /></div>} />
  </>;
}

export function ExpertQuoteFields({ value, onChange, onMediaResolved }: FieldsProps<Blocks['expert_quote']>) {
  return <>
    <Textarea label="Quote" value={value.quote} maxLength={1000} rows={4} onChange={(event) => onChange({ ...value, quote: event.target.value })} />
    <div className="grid gap-3 sm:grid-cols-2"><Input label="Expert name" value={value.name} maxLength={120} onChange={(event) => onChange({ ...value, name: event.target.value })} /><Input label="Role" value={value.role} maxLength={160} onChange={(event) => onChange({ ...value, role: event.target.value })} /></div>
    <Input label="Profile URL" type="url" value={value.profile_url} onChange={(event) => onChange({ ...value, profile_url: event.target.value })} />
    <BlockMediaPicker label="Optional expert avatar" value={value.media_id} onResolved={(id, media) => onMediaResolved?.(id, media)} onChange={(id, media) => { onChange({ ...value, media_id: id }); if (id) onMediaResolved?.(id, media); }} />
  </>;
}

export function MedicalCtaFields({ value, onChange }: FieldsProps<Blocks['medical_cta']>) {
  return <>
    <Input label="Heading" value={value.heading} maxLength={180} onChange={(event) => onChange({ ...value, heading: event.target.value })} /><Textarea label="Description" value={value.description} maxLength={500} rows={3} onChange={(event) => onChange({ ...value, description: event.target.value })} />
    {(['primary', 'secondary'] as const).map((actionKey) => <div key={actionKey} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2"><Input label={`${actionKey === 'primary' ? 'Primary' : 'Secondary'} label`} value={value[actionKey].label} maxLength={80} onChange={(event) => onChange({ ...value, [actionKey]: { ...value[actionKey], label: event.target.value } })} /><Input label="URL" type="url" value={value[actionKey].url} onChange={(event) => onChange({ ...value, [actionKey]: { ...value[actionKey], url: event.target.value } })} /></div>)}
  </>;
}

export function FaqFields({ value, onChange, errors = {}, fieldPrefix }: FieldsProps<Blocks['faq']>) {
  return <>
    <Input label="Heading" value={value.heading} maxLength={160} onChange={(event) => onChange({ ...value, heading: event.target.value })} />
    <RepeaterEditor items={value.items} max={10} createItem={() => ({ question: '', answer: '' })} addLabel="Add FAQ" onChange={(items) => onChange({ ...value, items })} renderItem={(item, index) => <div className="space-y-3"><Input label="Question" value={item.question} maxLength={240} onChange={(event) => { const items = [...value.items]; items[index] = { ...item, question: event.target.value }; onChange({ ...value, items }); }} error={fieldError(errors, `${fieldPrefix}.items.${index}.question`)} /><Textarea label="Answer" value={item.answer} maxLength={1000} rows={4} onChange={(event) => { const items = [...value.items]; items[index] = { ...item, answer: event.target.value }; onChange({ ...value, items }); }} error={fieldError(errors, `${fieldPrefix}.items.${index}.answer`)} /></div>} />
  </>;
}

export function FeedbackShareFields({ feedback, share, onFeedbackChange, onShareChange }: {
  feedback: Blocks['feedback'];
  share: Blocks['share'];
  onFeedbackChange: (value: Blocks['feedback']) => void;
  onShareChange: (value: Blocks['share']) => void;
}) {
  return <>
    <Toggle checked={feedback.enabled} onChange={(enabled) => onFeedbackChange({ ...feedback, enabled })} label="Show helpful feedback controls" />
    {feedback.enabled && <Input label="Feedback prompt" value={feedback.prompt} maxLength={160} onChange={(event) => onFeedbackChange({ ...feedback, prompt: event.target.value })} />}
    <Toggle checked={share.enabled} onChange={(enabled) => onShareChange({ enabled })} label="Show share and print controls" />
  </>;
}

export function MedicalDisclaimerFields({ value, onChange, errors = {}, fieldPrefix }: FieldsProps<Blocks['disclaimer']>) {
  return <>
    <Textarea label="Disclaimer text" value={value.text} maxLength={1000} rows={4} onChange={(event) => onChange({ enabled: true, text: event.target.value })} error={fieldError(errors, `${fieldPrefix}.text`)} />
    <p className="text-xs font-semibold text-slate-500">The medical disclaimer is mandatory and cannot be disabled.</p>
  </>;
}

export function BlogBlockEditor({ value, onChange, errors = {}, onMediaResolved }: {
  value: BlogBlocksDocument;
  onChange: (value: BlogBlocksDocument) => void;
  errors?: Record<string, string>;
  onMediaResolved?: (id: string, media: MediaAsset | null) => void;
}) {
  const blocks = value.blocks;
  const setBlock = <K extends BlockKey>(key: K, block: Blocks[K]) => onChange({ ...value, blocks: { ...blocks, [key]: block } });
  const prefix = (path: string) => `blocks_json.blocks.${path}`;

  return <section aria-labelledby="article-sections-heading" className="space-y-4">
    <div><h2 id="article-sections-heading" className="text-base font-bold text-slate-900">Article Sections</h2><p className="mt-1 text-xs text-slate-500">Structured content for article sections (Hero, Key Takeaways, FAQ, Disclaimer, etc.).</p></div>

    <Section title="Hero Details" required complete={Boolean(blocks.hero.category || blocks.hero.breadcrumb.length || blocks.hero.reviewer.name || blocks.hero.reading_time_minutes)}>
      <HeroFields value={blocks.hero} onChange={(v) => setBlock('hero', v)} errors={errors} fieldPrefix={prefix('hero')} />
    </Section>

    <Section title="Key Takeaways" enabled={blocks.key_takeaways.enabled} complete={!blocks.key_takeaways.enabled || Boolean(blocks.key_takeaways.heading && blocks.key_takeaways.items.length)} onEnabledChange={(enabled) => setBlock('key_takeaways', { ...blocks.key_takeaways, enabled })}>
      <KeyTakeawaysFields value={blocks.key_takeaways} onChange={(v) => setBlock('key_takeaways', v)} errors={errors} fieldPrefix={prefix('key_takeaways')} />
    </Section>

    <Section title="Image Comparison" enabled={blocks.image_comparison.enabled} complete={!blocks.image_comparison.enabled || Boolean(blocks.image_comparison.heading && blocks.image_comparison.items.length)} onEnabledChange={(enabled) => setBlock('image_comparison', { ...blocks.image_comparison, enabled })}>
      <ImageComparisonFields value={blocks.image_comparison} onChange={(v) => setBlock('image_comparison', v)} errors={errors} fieldPrefix={prefix('image_comparison')} onMediaResolved={onMediaResolved} />
    </Section>

    <Section title="Numbered List" enabled={blocks.numbered_list.enabled} complete={!blocks.numbered_list.enabled || Boolean(blocks.numbered_list.heading && blocks.numbered_list.items.length)} onEnabledChange={(enabled) => setBlock('numbered_list', { ...blocks.numbered_list, enabled })}>
      <NumberedListFields value={blocks.numbered_list} onChange={(v) => setBlock('numbered_list', v)} fieldPrefix={prefix('numbered_list')} />
    </Section>

    <Section title="Expert Quote" enabled={blocks.expert_quote.enabled} complete={!blocks.expert_quote.enabled || Boolean(blocks.expert_quote.quote && blocks.expert_quote.name && blocks.expert_quote.role)} onEnabledChange={(enabled) => setBlock('expert_quote', { ...blocks.expert_quote, enabled })}>
      <ExpertQuoteFields value={blocks.expert_quote} onChange={(v) => setBlock('expert_quote', v)} fieldPrefix={prefix('expert_quote')} onMediaResolved={onMediaResolved} />
    </Section>

    <Section title="Medical Attention CTA" enabled={blocks.medical_cta.enabled} complete={!blocks.medical_cta.enabled || Boolean(blocks.medical_cta.heading && blocks.medical_cta.description && ((blocks.medical_cta.primary.label && blocks.medical_cta.primary.url) || (blocks.medical_cta.secondary.label && blocks.medical_cta.secondary.url)))} onEnabledChange={(enabled) => setBlock('medical_cta', { ...blocks.medical_cta, enabled })}>
      <MedicalCtaFields value={blocks.medical_cta} onChange={(v) => setBlock('medical_cta', v)} fieldPrefix={prefix('medical_cta')} />
    </Section>

    <Section title="FAQ Accordion" enabled={blocks.faq.enabled} complete={!blocks.faq.enabled || Boolean(blocks.faq.heading && blocks.faq.items.length)} onEnabledChange={(enabled) => setBlock('faq', { ...blocks.faq, enabled })}>
      <FaqFields value={blocks.faq} onChange={(v) => setBlock('faq', v)} errors={errors} fieldPrefix={prefix('faq')} />
    </Section>

    <Section title="Helpful Feedback and Share Controls" required complete>
      <FeedbackShareFields feedback={blocks.feedback} share={blocks.share} onFeedbackChange={(v) => setBlock('feedback', v)} onShareChange={(v) => setBlock('share', v)} />
    </Section>

    <Section title="Medical Disclaimer" required complete={Boolean(blocks.disclaimer.text.trim())}>
      <MedicalDisclaimerFields value={blocks.disclaimer} onChange={(v) => setBlock('disclaimer', v)} errors={errors} fieldPrefix={prefix('disclaimer')} />
    </Section>
  </section>;
}
