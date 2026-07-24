'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/input';
import type { BlogBlocksDocument } from '@/types/blog-blocks';
import type { MediaAsset } from '@/types/media';
import { BlockMediaPicker } from './block-media-picker';
import { RepeaterEditor } from './repeater-editor';

type Blocks = BlogBlocksDocument['blocks'];
type BlockKey = keyof Blocks;

function fieldError(errors: Record<string, string>, path: string) {
  return errors[`blocks_json.blocks.${path}`];
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-600" />{label}</label>;
}

function Section({ title, enabled = true, required = false, complete, onEnabledChange, children }: {
  title: string;
  enabled?: boolean;
  required?: boolean;
  complete: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return <details open className="rounded-2xl border border-slate-200 bg-white p-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-900">{complete ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-slate-300" />}{title}</span>
      {required ? <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Required</span> : onEnabledChange ? <Toggle checked={enabled} onChange={onEnabledChange} label={enabled ? 'Enabled' : 'Disabled'} /> : null}
    </summary>
    {(required || enabled) && <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">{children}</div>}
  </details>;
}

export function BlogBlockEditor({ value, onChange, errors = {}, onMediaResolved }: {
  value: BlogBlocksDocument;
  onChange: (value: BlogBlocksDocument) => void;
  errors?: Record<string, string>;
  onMediaResolved?: (id: string, media: MediaAsset | null) => void;
}) {
  const blocks = value.blocks;
  const setBlock = <K extends BlockKey>(key: K, block: Blocks[K]) => onChange({ ...value, blocks: { ...blocks, [key]: block } });

  return <section aria-labelledby="article-sections-heading" className="space-y-4">
    <div><h2 id="article-sections-heading" className="text-base font-bold text-slate-900">Article Sections</h2><p className="mt-1 text-xs text-slate-500">Structured content for the Template 1 healthcare editorial layout.</p></div>

    <Section title="Hero Details" required complete={Boolean(blocks.hero.category || blocks.hero.breadcrumb.length || blocks.hero.reviewer.name || blocks.hero.reading_time_minutes)}>
      <Input label="Category" value={blocks.hero.category} maxLength={100} onChange={(event) => setBlock('hero', { ...blocks.hero, category: event.target.value })} error={fieldError(errors, 'hero.category')} />
      <RepeaterEditor items={blocks.hero.breadcrumb} max={5} createItem={() => ''} addLabel="Add breadcrumb" onChange={(breadcrumb) => setBlock('hero', { ...blocks.hero, breadcrumb })} renderItem={(item, index) => <Input aria-label={`Breadcrumb ${index + 1}`} value={item} maxLength={80} onChange={(event) => { const breadcrumb = [...blocks.hero.breadcrumb]; breadcrumb[index] = event.target.value; setBlock('hero', { ...blocks.hero, breadcrumb }); }} error={fieldError(errors, `hero.breadcrumb.${index}`)} />} />
      <div className="grid gap-3 sm:grid-cols-2"><Input label="Reviewer name" value={blocks.hero.reviewer.name} maxLength={120} onChange={(event) => setBlock('hero', { ...blocks.hero, reviewer: { ...blocks.hero.reviewer, name: event.target.value } })} /><Input label="Reviewer credentials" value={blocks.hero.reviewer.credentials} maxLength={160} onChange={(event) => setBlock('hero', { ...blocks.hero, reviewer: { ...blocks.hero.reviewer, credentials: event.target.value } })} /></div>
      <Input label="Reading time (minutes)" type="number" min={1} max={240} value={blocks.hero.reading_time_minutes ?? ''} onChange={(event) => setBlock('hero', { ...blocks.hero, reading_time_minutes: event.target.value ? Number(event.target.value) : null })} />
    </Section>

    <Section title="Key Takeaways" enabled={blocks.key_takeaways.enabled} complete={!blocks.key_takeaways.enabled || Boolean(blocks.key_takeaways.heading && blocks.key_takeaways.items.length)} onEnabledChange={(enabled) => setBlock('key_takeaways', { ...blocks.key_takeaways, enabled })}>
      <Input label="Heading" value={blocks.key_takeaways.heading} maxLength={120} onChange={(event) => setBlock('key_takeaways', { ...blocks.key_takeaways, heading: event.target.value })} error={fieldError(errors, 'key_takeaways.heading')} />
      <RepeaterEditor items={blocks.key_takeaways.items} max={5} createItem={() => ''} addLabel="Add takeaway" onChange={(items) => setBlock('key_takeaways', { ...blocks.key_takeaways, items })} renderItem={(item, index) => <Textarea aria-label={`Takeaway ${index + 1}`} value={item} maxLength={240} rows={2} onChange={(event) => { const items = [...blocks.key_takeaways.items]; items[index] = event.target.value; setBlock('key_takeaways', { ...blocks.key_takeaways, items }); }} error={fieldError(errors, `key_takeaways.items.${index}`)} />} />
    </Section>

    <Section title="Image Comparison" enabled={blocks.image_comparison.enabled} complete={!blocks.image_comparison.enabled || Boolean(blocks.image_comparison.heading && blocks.image_comparison.items.length)} onEnabledChange={(enabled) => setBlock('image_comparison', { ...blocks.image_comparison, enabled })}>
      <Input label="Heading" value={blocks.image_comparison.heading} maxLength={120} onChange={(event) => setBlock('image_comparison', { ...blocks.image_comparison, heading: event.target.value })} error={fieldError(errors, 'image_comparison.heading')} />
      <RepeaterEditor items={blocks.image_comparison.items} max={6} createItem={() => ({ media_id: null, title: '', description: '' })} addLabel="Add comparison card" onChange={(items) => setBlock('image_comparison', { ...blocks.image_comparison, items })} renderItem={(item, index) => <div className="space-y-3">
        <BlockMediaPicker label="Comparison image" value={item.media_id} onResolved={(id, media) => onMediaResolved?.(id, media)} error={fieldError(errors, `image_comparison.items.${index}.media_id`)} onChange={(id, media) => { const items = [...blocks.image_comparison.items]; items[index] = { ...item, media_id: id }; setBlock('image_comparison', { ...blocks.image_comparison, items }); if (id) onMediaResolved?.(id, media); }} />
        <Input label="Title" value={item.title} maxLength={120} onChange={(event) => { const items = [...blocks.image_comparison.items]; items[index] = { ...item, title: event.target.value }; setBlock('image_comparison', { ...blocks.image_comparison, items }); }} error={fieldError(errors, `image_comparison.items.${index}.title`)} />
        <Textarea label="Description" value={item.description} maxLength={500} rows={3} onChange={(event) => { const items = [...blocks.image_comparison.items]; items[index] = { ...item, description: event.target.value }; setBlock('image_comparison', { ...blocks.image_comparison, items }); }} error={fieldError(errors, `image_comparison.items.${index}.description`)} />
      </div>} />
    </Section>

    <Section title="Numbered List" enabled={blocks.numbered_list.enabled} complete={!blocks.numbered_list.enabled || Boolean(blocks.numbered_list.heading && blocks.numbered_list.items.length)} onEnabledChange={(enabled) => setBlock('numbered_list', { ...blocks.numbered_list, enabled })}>
      <Input label="Heading" value={blocks.numbered_list.heading} maxLength={120} onChange={(event) => setBlock('numbered_list', { ...blocks.numbered_list, heading: event.target.value })} />
      <RepeaterEditor items={blocks.numbered_list.items} max={10} createItem={() => ({ title: '', description: '' })} addLabel="Add numbered item" onChange={(items) => setBlock('numbered_list', { ...blocks.numbered_list, items })} renderItem={(item, index) => <div className="space-y-3"><Input label="Title" value={item.title} maxLength={120} onChange={(event) => { const items = [...blocks.numbered_list.items]; items[index] = { ...item, title: event.target.value }; setBlock('numbered_list', { ...blocks.numbered_list, items }); }} /><Textarea label="Description" value={item.description} maxLength={500} rows={3} onChange={(event) => { const items = [...blocks.numbered_list.items]; items[index] = { ...item, description: event.target.value }; setBlock('numbered_list', { ...blocks.numbered_list, items }); }} /></div>} />
    </Section>

    <Section title="Expert Quote" enabled={blocks.expert_quote.enabled} complete={!blocks.expert_quote.enabled || Boolean(blocks.expert_quote.quote && blocks.expert_quote.name && blocks.expert_quote.role)} onEnabledChange={(enabled) => setBlock('expert_quote', { ...blocks.expert_quote, enabled })}>
      <Textarea label="Quote" value={blocks.expert_quote.quote} maxLength={1000} rows={4} onChange={(event) => setBlock('expert_quote', { ...blocks.expert_quote, quote: event.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2"><Input label="Expert name" value={blocks.expert_quote.name} maxLength={120} onChange={(event) => setBlock('expert_quote', { ...blocks.expert_quote, name: event.target.value })} /><Input label="Role" value={blocks.expert_quote.role} maxLength={160} onChange={(event) => setBlock('expert_quote', { ...blocks.expert_quote, role: event.target.value })} /></div>
      <Input label="Profile URL" type="url" value={blocks.expert_quote.profile_url} onChange={(event) => setBlock('expert_quote', { ...blocks.expert_quote, profile_url: event.target.value })} />
      <BlockMediaPicker label="Optional expert avatar" value={blocks.expert_quote.media_id} onResolved={(id, media) => onMediaResolved?.(id, media)} onChange={(id, media) => { setBlock('expert_quote', { ...blocks.expert_quote, media_id: id }); if (id) onMediaResolved?.(id, media); }} />
    </Section>

    <Section title="Medical Attention CTA" enabled={blocks.medical_cta.enabled} complete={!blocks.medical_cta.enabled || Boolean(blocks.medical_cta.heading && blocks.medical_cta.description && ((blocks.medical_cta.primary.label && blocks.medical_cta.primary.url) || (blocks.medical_cta.secondary.label && blocks.medical_cta.secondary.url)))} onEnabledChange={(enabled) => setBlock('medical_cta', { ...blocks.medical_cta, enabled })}>
      <Input label="Heading" value={blocks.medical_cta.heading} maxLength={180} onChange={(event) => setBlock('medical_cta', { ...blocks.medical_cta, heading: event.target.value })} /><Textarea label="Description" value={blocks.medical_cta.description} maxLength={500} rows={3} onChange={(event) => setBlock('medical_cta', { ...blocks.medical_cta, description: event.target.value })} />
      {(['primary', 'secondary'] as const).map((actionKey) => <div key={actionKey} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2"><Input label={`${actionKey === 'primary' ? 'Primary' : 'Secondary'} label`} value={blocks.medical_cta[actionKey].label} maxLength={80} onChange={(event) => setBlock('medical_cta', { ...blocks.medical_cta, [actionKey]: { ...blocks.medical_cta[actionKey], label: event.target.value } })} /><Input label="URL" type="url" value={blocks.medical_cta[actionKey].url} onChange={(event) => setBlock('medical_cta', { ...blocks.medical_cta, [actionKey]: { ...blocks.medical_cta[actionKey], url: event.target.value } })} /></div>)}
    </Section>

    <Section title="FAQ Accordion" enabled={blocks.faq.enabled} complete={!blocks.faq.enabled || Boolean(blocks.faq.heading && blocks.faq.items.length)} onEnabledChange={(enabled) => setBlock('faq', { ...blocks.faq, enabled })}>
      <Input label="Heading" value={blocks.faq.heading} maxLength={160} onChange={(event) => setBlock('faq', { ...blocks.faq, heading: event.target.value })} />
      <RepeaterEditor items={blocks.faq.items} max={10} createItem={() => ({ question: '', answer: '' })} addLabel="Add FAQ" onChange={(items) => setBlock('faq', { ...blocks.faq, items })} renderItem={(item, index) => <div className="space-y-3"><Input label="Question" value={item.question} maxLength={240} onChange={(event) => { const items = [...blocks.faq.items]; items[index] = { ...item, question: event.target.value }; setBlock('faq', { ...blocks.faq, items }); }} error={fieldError(errors, `faq.items.${index}.question`)} /><Textarea label="Answer" value={item.answer} maxLength={1000} rows={4} onChange={(event) => { const items = [...blocks.faq.items]; items[index] = { ...item, answer: event.target.value }; setBlock('faq', { ...blocks.faq, items }); }} error={fieldError(errors, `faq.items.${index}.answer`)} /></div>} />
    </Section>

    <Section title="Helpful Feedback and Share Controls" required complete>
      <Toggle checked={blocks.feedback.enabled} onChange={(enabled) => setBlock('feedback', { ...blocks.feedback, enabled })} label="Show helpful feedback controls" />
      {blocks.feedback.enabled && <Input label="Feedback prompt" value={blocks.feedback.prompt} maxLength={160} onChange={(event) => setBlock('feedback', { ...blocks.feedback, prompt: event.target.value })} />}
      <Toggle checked={blocks.share.enabled} onChange={(enabled) => setBlock('share', { enabled })} label="Show share and print controls" />
    </Section>

    <Section title="Medical Disclaimer" required complete={Boolean(blocks.disclaimer.text.trim())}>
      <Textarea label="Disclaimer text" value={blocks.disclaimer.text} maxLength={1000} rows={4} onChange={(event) => setBlock('disclaimer', { enabled: true, text: event.target.value })} error={fieldError(errors, 'disclaimer.text')} />
      <p className="text-xs font-semibold text-slate-500">The medical disclaimer is mandatory for Template 1 version 2 and cannot be disabled.</p>
    </Section>
  </section>;
}
