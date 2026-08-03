'use client';

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { BlogBlocksDocument } from '@/types/blog-blocks';
import { isRegisteredComponentKey, getComponentDefinition } from './component-registry';
import type {
  CustomTemplateComponentInstance,
  CustomTemplateSectionLayout
} from './custom-template.types';
import { validateFrontendCustomTemplateLayout } from './custom-template-validation';
import {
  pageSpacingClasses,
  pageTypographyClass,
  pageWidthClass,
  sectionGridClass,
  resolveSectionSettings,
  sectionBackgroundClass,
  sectionWidthClass,
  sectionPaddingClass
} from './custom-template-settings';

export interface CustomTemplateRendererProps {
  layoutConfig?: unknown;
  blocksDoc?: BlogBlocksDocument | null;
  contentHtml?: string | null;
  title?: string;
  excerpt?: string | null;
  image?: string | null;
  imageAlt?: string | null;
  isPreview?: boolean;
  previewDevice?: 'desktop' | 'tablet' | 'mobile';
}

export function CustomTemplateRenderer({
  layoutConfig,
  blocksDoc,
  contentHtml,
  title = 'Untitled Article',
  excerpt,
  image,
  imageAlt,
  isPreview = false,
  previewDevice = 'desktop'
}: CustomTemplateRendererProps) {
  const { valid, config, errors } = validateFrontendCustomTemplateLayout(layoutConfig, blocksDoc);

  if (!valid || !config) {
    if (isPreview) {
      return (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 shadow-xs">
          <h3 className="font-bold text-rose-950">Custom Template Layout Validation Error</h3>
          <p className="mt-1 text-xs text-rose-700">The provided layout configuration could not be validated:</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
            {errors.map((err, idx) => (
              <li key={`err-${idx}`}>
                <span className="font-mono font-semibold">{err.path}:</span> {err.message}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This article layout is currently unavailable.
      </div>
    );
  }

  const spacing = pageSpacingClasses(config.page.spacing);

  return (
    <article
      data-template="custom_template"
      data-template-version={config.schemaVersion}
      data-page-width={config.page.contentWidth}
      data-page-background={config.page.background}
      data-page-spacing={config.page.spacing}
      data-page-typography={config.page.typography}
      className={`w-full ${spacing.padding} ${pageTypographyClass(config.page.typography)} ${
        config.page.background === 'soft_gray' ? 'bg-slate-50' : config.page.background === 'brand_tint' ? 'bg-sky-50/40' : 'bg-white'
      }`}
    >
      <div className={`mx-auto w-full ${spacing.gap}`}>
        {config.sections
          .filter((sec) => sec.enabled)
          .map((section) => {
            const resolved = resolveSectionSettings(config.page, section.settings);
            
            return (
              <section
                key={`section-${section.id}`}
                data-section-id={section.id}
                data-section-layout={section.layout}
                data-responsive-strategy={section.responsiveStrategy}
                data-section-background={resolved.backgroundStyle}
                data-section-width={resolved.width}
                className={`${sectionBackgroundClass(resolved.backgroundStyle)}`}
              >
                <div className={`mx-auto w-full px-4 ${sectionWidthClass(resolved.width)} ${sectionPaddingClass(resolved.paddingTop, resolved.paddingBottom, previewDevice)}`}>
                  <div className={sectionGridClass(section.layout, section.responsiveStrategy, previewDevice)}>
                    {section.slots.map((slot) => (
                      <div key={`slot-${slot.id}`} data-slot-id={slot.id} className="space-y-6 min-w-0 w-full overflow-hidden">
                        {slot.components
                          .filter((comp) => comp.enabled)
                          .map((component) => (
                            <RenderComponentInstance
                              key={`comp-${component.id}`}
                              component={component}
                              blocksDoc={blocksDoc}
                              contentHtml={contentHtml}
                              title={title}
                              excerpt={excerpt}
                              image={image}
                              imageAlt={imageAlt}
                              isPreview={isPreview}
                              previewDevice={previewDevice}
                              sectionLayout={section.layout}
                            />
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
      </div>
    </article>
  );
}

function RenderComponentInstance({
  component,
  blocksDoc,
  contentHtml,
  title,
  excerpt,
  image,
  imageAlt,
  isPreview = false,
  previewDevice = 'desktop',
  sectionLayout
}: {
  component: CustomTemplateComponentInstance;
  blocksDoc?: BlogBlocksDocument | null;
  contentHtml?: string | null;
  title: string;
  excerpt?: string | null;
  image?: string | null;
  imageAlt?: string | null;
  isPreview?: boolean;
  previewDevice?: 'desktop' | 'tablet' | 'mobile';
  sectionLayout?: CustomTemplateSectionLayout;
}) {
  if (!isRegisteredComponentKey(component.componentKey)) {
    return (
      <div role="alert" className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-xs text-slate-600">
        [Unsupported Component: {String((component as { componentKey?: string }).componentKey)}]
      </div>
    );
  }

  const def = getComponentDefinition(component.componentKey);

  // Content components
  if (def.category === 'content') {
    const instance = component.blockId ? blocksDoc?.custom_instances?.[component.blockId] : undefined;
    const heroInstance = instance?.componentKey === 'hero' ? instance : undefined;
    const keyTakeawaysInstance = instance?.componentKey === 'key_takeaways' ? instance : undefined;
    const numberedListInstance = instance?.componentKey === 'numbered_list' ? instance : undefined;
    const expertQuoteInstance = instance?.componentKey === 'expert_quote' ? instance : undefined;
    const medicalCtaInstance = instance?.componentKey === 'medical_cta' ? instance : undefined;
    const faqInstance = instance?.componentKey === 'faq' ? instance : undefined;
    const disclaimerInstance = instance?.componentKey === 'medical_disclaimer' ? instance : undefined;
    const feedbackInstance = instance?.componentKey === 'feedback' ? instance : undefined;
    const shareInstance = instance?.componentKey === 'share' ? instance : undefined;
    const imageComparisonInstance = instance?.componentKey === 'image_comparison' ? instance : undefined;

    switch (component.componentKey) {
      case 'hero': {
        const heroData = heroInstance;
        const settings = component.settings;
        const category = heroData?.category || (isPreview ? 'Vision & Eye Care' : '');
        const reviewer = heroData?.reviewer?.name
          ? heroData.reviewer
          : isPreview
          ? { name: 'Dr. Jane Smith', credentials: 'MD, Ophthalmologist' }
          : null;
        return (
          <header data-hero-height={settings.height} data-hero-overlay={settings.overlay} className={`space-y-4 rounded-2xl p-6 ${settings.height === 'tall' ? 'min-h-96' : settings.height === 'compact' ? 'min-h-48' : 'min-h-72'} ${settings.overlay === 'strong' ? 'bg-slate-900 text-white' : settings.overlay === 'light' ? 'bg-slate-50' : 'bg-slate-100'} ${settings.alignment === 'center' ? 'text-center' : 'text-left'}`}>
            {category && (
              <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-800">
                {category}
              </span>
            )}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title || 'Eye Care & Vision Protection Guide'}</h1>
            {(excerpt || isPreview) && <p className="text-lg leading-relaxed text-slate-600">{excerpt || 'Discover essential practices to maintain healthy vision and protect your eye health.'}</p>}
            {reviewer?.name && (
              <p className="text-xs text-slate-500">
                Reviewed by: <span className="font-semibold">{reviewer.name}</span> ({reviewer.credentials})
              </p>
            )}
            {image ? (
              <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-100 shadow-sm aspect-16/9 w-full">
                <img
                  src={image}
                  alt={imageAlt || title || 'Featured Article Image'}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : isPreview ? (
              <div className="relative mt-4 flex aspect-16/9 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-100/70 p-6 text-slate-400 shadow-xs">
                <div className="mb-2 rounded-full bg-slate-200/80 p-3 text-slate-500">
                  <ImageIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold text-slate-600">No Image Selected</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Select a featured image to display here</p>
              </div>
            ) : null}
          </header>
        );
      }

      case 'rich_article_content': {
        const settings = component.settings;
        const defaultContent = '<p>Regular eye examinations are essential for maintaining healthy vision. Routine checkups help detect early signs of vision conditions before symptoms appear.</p><p>Protect your eye health by taking regular screen breaks and maintaining balanced nutrition.</p>';
        const hasText = Boolean(contentHtml && contentHtml.replace(/<[^>]*>/g, '').trim().length > 0);
        return (
          <div
            className={`space-y-4 text-slate-800 ${settings.fontSize === 'large' ? 'text-base' : 'text-sm'} ${
              settings.lineHeight === 'relaxed' ? 'leading-8' : 'leading-6'
            }`}
            dangerouslySetInnerHTML={{ __html: hasText ? contentHtml! : isPreview ? defaultContent : '<p class="italic text-slate-500">No article content available.</p>' }}
          />
        );
      }

      case 'key_takeaways': {
        const takeaways = keyTakeawaysInstance;
        const active = takeaways && takeaways.enabled && takeaways.items.length > 0 ? takeaways : isPreview ? { enabled: true, heading: takeaways?.heading || 'Key Takeaways', items: ['Schedule annual comprehensive eye examinations.', 'Follow the 20-20-20 rule during screen usage.', 'Protect your eyes from UV rays with certified sunglasses.'] } : null;
        if (!active) return null;
        const settings = component.settings;
        return (
          <div
            className={`rounded-xl p-5 ${
              settings.variant === 'bordered' ? 'border-2 border-sky-300 bg-sky-50/30' : 'bg-sky-50'
            }`}
          >
            <h2 className="text-lg font-bold text-sky-900">{active.heading || 'Key Takeaways'}</h2>
            <ul className={`mt-3 gap-3 ${settings.columns === 'two' ? 'grid grid-cols-1 md:grid-cols-2' : 'space-y-2'}`}>
              {active.items.map((item, idx) => (
                <li key={`kt-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      case 'numbered_list': {
        const list = numberedListInstance;
        const active = list && list.enabled && list.items.length > 0 ? list : isPreview ? { enabled: true, heading: list?.heading || 'Essential Steps for Healthy Eyes', items: [{ title: '1. Get Regular Eye Exams', description: 'Schedule an annual checkup with a qualified optometrist.' }, { title: '2. Rest Your Eyes', description: 'Take breaks every 20 minutes when working on digital screens.' }, { title: '3. Eat Eye-Healthy Foods', description: 'Incorporate leafy greens, fish, and citrus fruits into your diet.' }] } : null;
        if (!active) return null;
        return (
          <div className="space-y-4">
            {active.heading && <h2 className="text-xl font-bold text-slate-900">{active.heading}</h2>}
            <ol className="space-y-3">
              {active.items.map((item, idx) => (
                <li key={`nl-${idx}`} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                  <span className={`flex h-7 shrink-0 items-center justify-center text-xs font-bold ${component.settings.style === 'simple' ? 'w-5 bg-transparent text-sky-700' : 'w-7 rounded-full bg-sky-600 text-white'}`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        );
      }

      case 'expert_quote': {
        const quote = expertQuoteInstance;
        const active = quote && quote.enabled && quote.quote ? quote : isPreview ? { enabled: true, quote: 'Prevention and early detection remain the most effective tools in preserving lifelong vision health.', name: 'Dr. Sarah Connor', role: 'Chief of Ophthalmology', media_id: null, profile_url: '#' } : null;
        if (!active) return null;
        const settings = component.settings;
        return (
          <blockquote
            className={`rounded-xl border-l-4 border-sky-600 p-5 shadow-xs ${settings.orientation === 'stacked' ? 'text-center' : 'text-left'} ${
              settings.background === 'soft' ? 'bg-sky-50/50' : 'bg-white'
            }`}
          >
            <p className="italic text-slate-800">“{active.quote}”</p>
            <footer className="mt-3 text-xs font-semibold text-slate-900">
              — {active.name} <span className="font-normal text-slate-500">({active.role})</span>
            </footer>
          </blockquote>
        );
      }

      case 'medical_cta': {
        const cta = medicalCtaInstance;
        const active = cta && cta.enabled ? cta : isPreview ? { enabled: true, heading: 'Need Professional Eye Care?', description: 'Book a consultation with our experienced ophthalmologists today.', primary: { label: 'Schedule Appointment', url: '#' }, secondary: { label: 'Learn More', url: '#' } } : null;
        if (!active) return null;
        const settings = component.settings;
        return (
          <div className={`rounded-2xl p-6 text-white ${settings.style === 'navy' ? 'bg-slate-900' : 'bg-sky-700'}`}>
            <h2 className="text-xl font-bold">{active.heading}</h2>
            <p className="mt-2 text-sm text-slate-200">{active.description}</p>
            <div className={`mt-4 flex gap-3 ${settings.buttonLayout === 'stacked' ? 'flex-col' : 'flex-row'}`}>
              {active.primary.label && (
                <a
                  href={active.primary.url || '#'}
                  className="inline-block rounded-lg bg-white px-4 py-2 text-center text-xs font-bold text-slate-900 hover:bg-slate-100"
                >
                  {active.primary.label}
                </a>
              )}
            </div>
          </div>
        );
      }

      case 'faq': {
        const faq = faqInstance;
        const active = faq && faq.enabled && faq.items.length > 0 ? faq : isPreview ? { enabled: true, heading: faq?.heading || 'Frequently Asked Questions', items: [{ question: 'How often should I get my eyes checked?', answer: 'Adults should have a comprehensive eye exam every 1 to 2 years, or as recommended by an eye care professional.' }, { question: 'What is the 20-20-20 rule?', answer: 'Every 20 minutes, look at an object 20 feet away for at least 20 seconds to reduce digital eye strain.' }] } : null;
        if (!active) return null;
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">{active.heading || 'Frequently Asked Questions'}</h2>
            <div className="space-y-3">
              {active.items.map((item, idx) => (
                <details key={`faq-${idx}`} open={component.settings.defaultOpen === 'first' && idx === 0} className={`group rounded-xl border bg-white p-4 ${component.settings.layout === 'image_accordion' ? 'border-sky-300 bg-linear-to-r from-sky-50 to-white' : 'border-slate-200'}`}>
                  <summary className="cursor-pointer font-semibold text-slate-900 hover:text-sky-700">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        );
      }

      case 'medical_disclaimer': {
        const disclaimer = disclaimerInstance;
        const active = disclaimer && disclaimer.text ? disclaimer : isPreview ? { enabled: true, text: 'This information is for educational purposes only and does not substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified eye-care provider.' } : null;
        if (!active) return null;
        return (
          <div className={`rounded-xl border p-4 text-xs leading-relaxed ${component.settings.variant === 'prominent' ? 'border-sky-300 bg-sky-50 text-slate-800' : 'border-amber-200 bg-amber-50/70 text-amber-900'}`}>
            <span className="font-bold uppercase tracking-wider text-amber-950">Medical Disclaimer: </span>
            {active.text}
          </div>
        );
      }

      case 'feedback': {
        const feedback = feedbackInstance;
        const active = feedback && feedback.enabled ? feedback : isPreview ? { enabled: true, prompt: 'Was this article helpful?' } : null;
        if (!active) return null;
        return (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-600">
            {component.settings.showPrompt !== false ? <p className="font-semibold">{active.prompt}</p> : <p className="sr-only">Article feedback</p>}
          </div>
        );
      }

      case 'share': {
        const share = shareInstance;
        const active = share && share.enabled ? share : isPreview ? { enabled: true } : null;
        if (!active) return null;
        const settings = component.settings;
        return (
          <div
            className={`flex items-center gap-3 text-xs text-slate-500 ${
              settings.alignment === 'center' ? 'justify-center' : settings.alignment === 'right' ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="font-semibold">Share:</span>
            <span className="rounded bg-slate-100 px-2 py-1">Link Copied</span>
          </div>
        );
      }

      case 'image_comparison': {
        const comp = imageComparisonInstance;
        const active = comp && comp.enabled && comp.items.length > 0 ? comp : isPreview ? { enabled: true, heading: comp?.heading || 'Treatment Comparison', items: [{ title: 'Before Treatment', description: 'Initial observation showing corneal clouding.', media_id: null }, { title: 'After Treatment', description: 'Post-treatment recovery with clear cornea.', media_id: null }] } : null;
        if (!active) return null;
        const isNarrowSlot = previewDevice === 'mobile' || sectionLayout === 'three_column';
        return (
          <div className="space-y-4 w-full min-w-0 overflow-hidden">
            {active.heading && <h2 className="text-xl font-bold text-slate-900 break-words">{active.heading}</h2>}
            <div className={`grid gap-4 ${isNarrowSlot || component.settings.columns === 'one' ? 'grid-cols-1' : component.settings.columns === 'two' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {active.items.map((item, idx) => (
                <div key={`ic-${idx}`} className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 overflow-hidden">
                  <h3 className="font-bold text-slate-900 break-words">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 break-words">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  // System components
  if (def.category === 'system') {
    switch (component.componentKey) {
      case 'article_table_of_contents':
        return (
          <nav aria-label="Table of contents" data-heading-levels={component.settings.headingLevels.join(",")} className={`w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-hidden ${component.settings.sticky ? 'lg:sticky lg:top-24' : ''}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 break-words">Table of Contents</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-sky-700">
              <li className="hover:underline cursor-pointer break-words">• 1. Overview of Eye Health</li>
              <li className="hover:underline cursor-pointer break-words">• 2. Key Prevention Guidelines</li>
              <li className="hover:underline cursor-pointer break-words">• 3. Expert Recommendations</li>
              <li className="hover:underline cursor-pointer break-words">• 4. Frequently Asked Questions</li>
            </ul>
          </nav>
        );

      case 'appointment_card': {
        const settings = component.settings || {};
        const heading = settings.heading || 'Schedule an Eye Examination';
        const buttonLabel = settings.buttonLabel || 'Book Appointment';
        return (
          <div className="w-full min-w-0 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-center overflow-hidden">
            <h3 className="font-bold text-sky-900 break-words">{heading}</h3>
            <button type="button" className="mt-3 rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800 transition-colors break-words">
              {buttonLabel}
            </button>
          </div>
        );
      }

      case 'newsletter_card': {
        const settings = component.settings || {};
        const heading = settings.heading || 'Stay Informed on Eye Care';
        const description = settings.description || 'Receive weekly expert health tips directly in your inbox.';
        const buttonLabel = settings.buttonLabel || 'Subscribe Now';
        return (
          <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-center overflow-hidden shadow-xs">
            <h3 className="font-bold text-slate-900 break-words">{heading}</h3>
            <p className="mt-1 text-xs text-slate-600 break-words">{description}</p>
            <button type="button" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors break-words">
              {buttonLabel}
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  }

  // Structural components
  if (def.category === 'structural') {
    switch (component.componentKey) {
      case 'spacer': {
        const settings = component.settings || {};
        const heightClass = settings.size === 'large' ? 'h-12' : settings.size === 'medium' ? 'h-8' : 'h-4';
        return (
          <div
            className={`w-full ${heightClass} ${isPreview ? 'rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 flex items-center justify-center text-[10px] text-slate-400 font-mono' : ''}`}
            aria-hidden={!isPreview}
          >
            {isPreview && <span className="opacity-60">Vertical Spacer ({settings.size || 'small'})</span>}
          </div>
        );
      }

      case 'divider': {
        const settings = component.settings || {};
        return <hr className={`my-4 w-full ${settings.style === 'dashed' ? 'border-dashed' : 'border-solid'} border-slate-200`} />;
      }

      default:
        return null;
    }
  }

  return null;
}
