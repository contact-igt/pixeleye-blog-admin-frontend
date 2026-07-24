import Image from 'next/image';
import { useState } from 'react';
import type { BlogBlocksDocument } from '@/types/blog-blocks';
import type { MediaAsset } from '@/types/media';
import { BookmarkCheck, ChevronDown, ChevronUp, CircleAlert, Clock3, MessageSquareQuote, Printer, Share2, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';

export interface TemplatePreviewProps {
  image?: string | null;
  imageAlt?: string | null;
  showFeaturedImagePlaceholder?: boolean;
  title: string;
  excerpt: string;
  html: string;
  author?: string | null;
  updatedAt?: string | null;
  templateVersion?: number;
  blocks?: BlogBlocksDocument;
  blockMedia?: Record<string, Partial<MediaAsset>>;
  breadcrumb?: string[];
  category?: string | null;
  reviewer?: string | null;
  readingTime?: string | null;
  keyTakeaways?: string[];
  comparisonCards?: Array<{ image?: string | null; imageAlt?: string | null; title: string; description: string }>;
  numberedList?: Array<{ title: string; description: string }>;
  expertQuote?: { quote: string; name?: string; role?: string; image?: string | null; imageAlt?: string | null };
  medicalCta?: { heading: string; description: string; primaryLabel?: string; secondaryLabel?: string };
  faqItems?: Array<{ question: string; answer: string }>;
  disclaimer?: string | null;
}

export function PreviewHeader({ image, imageAlt, showFeaturedImagePlaceholder = false, title, excerpt, author, updatedAt }: Omit<TemplatePreviewProps, 'html'>) {
  return (
    <header className="space-y-5">
      {image ? (
        <div data-region="featured-image" className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100"><Image src={image} alt={imageAlt ?? ''} fill className="object-cover" unoptimized /></div>
      ) : showFeaturedImagePlaceholder ? (
        <div data-region="featured-image" role="img" aria-label="Sample featured image placeholder" className="grid aspect-[16/7] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 via-slate-50 to-cyan-100"><span className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-sky-700 shadow-sm">Featured image</span></div>
      ) : null}
      <div className="space-y-3">
        <h1 data-region="article-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title || 'Untitled Blog'}</h1>
        <p data-region="excerpt" className="text-base leading-7 text-slate-600">{excerpt || 'No excerpt provided.'}</p>
        <p data-region="metadata" className="text-xs font-medium text-slate-500">{author || 'Current administrator'}{updatedAt ? ` | Updated ${new Date(updatedAt).toLocaleDateString()}` : ''}</p>
      </div>
    </header>
  );
}

export function ArticleContent({ html, withRegion = true }: { html: string; withRegion?: boolean }) {
  return <div data-region={withRegion ? 'article-content' : undefined} className="space-y-4 text-[15px] leading-7 text-slate-700 [&_a]:text-sky-700 [&_blockquote]:border-l-4 [&_blockquote]:border-sky-200 [&_blockquote]:pl-4 [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-sky-700 [&_h3]:pt-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_h4]:pt-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-900 [&_li]:ml-5 [&_ol]:space-y-3 [&_ol]:pl-5 [&_ul]:space-y-2 [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-extrabold tracking-tight text-sky-700 sm:text-3xl">{children}</h2>;
}

function InfoPill({ children, icon: Icon }: { children: React.ReactNode; icon: typeof Clock3 }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700"><Icon size={12} aria-hidden="true" />{children}</span>;
}

function LegacyTemplateOnePreview(props: TemplatePreviewProps) {
  return <article data-template="template_1" data-template-version="1" className="mx-auto w-full max-w-3xl space-y-8 overflow-x-hidden"><PreviewHeader {...props} /><ArticleContent html={props.html} /></article>;
}

export function TemplateOnePreview(props: TemplatePreviewProps) {
  const version = props.templateVersion ?? 1;
  const [openFaq, setOpenFaq] = useState(0);

  if (version <= 1) {
    return <LegacyTemplateOnePreview {...props} />;
  }

  const blocks = props.blocks?.blocks;
  const breadcrumb = blocks ? blocks.hero.breadcrumb.filter(Boolean) : props.breadcrumb?.filter(Boolean) ?? ['Home', 'Health Library'];
  const category = blocks ? blocks.hero.category.trim() : props.category?.trim() || 'Eye health';
  const reviewer = blocks ? [blocks.hero.reviewer.name, blocks.hero.reviewer.credentials].filter(Boolean).join(', ') : props.reviewer?.trim();
  const readingTime = blocks ? (blocks.hero.reading_time_minutes ? `${blocks.hero.reading_time_minutes} min read` : '') : props.readingTime?.trim() || '6 min read';
  const keyTakeaways = blocks ? (blocks.key_takeaways.enabled ? blocks.key_takeaways.items.filter((item) => item.trim()) : []) : props.keyTakeaways?.filter((item) => item.trim()).slice(0, 5) ?? [];
  const keyTakeawaysHeading = blocks?.key_takeaways.heading || 'Key Takeaways';
  const comparisonCards = blocks ? (blocks.image_comparison.enabled ? blocks.image_comparison.items.filter((card) => card.title.trim() && card.description.trim() && card.media_id).map((card) => ({ ...card, image: card.media_id ? props.blockMedia?.[card.media_id]?.original_url ?? null : null, imageAlt: card.media_id ? props.blockMedia?.[card.media_id]?.alt_text ?? null : null })) : []) : props.comparisonCards?.filter((card) => card.title.trim() || card.description.trim()) ?? [];
  const comparisonHeading = blocks?.image_comparison.heading || 'Visual comparison';
  const numberedList = blocks ? (blocks.numbered_list.enabled ? blocks.numbered_list.items.filter((item) => item.title.trim() && item.description.trim()) : []) : props.numberedList?.filter((item) => item.title.trim()).slice(0, 10) ?? [];
  const numberedHeading = blocks?.numbered_list.heading || 'Symptoms to watch';
  const expertQuote = blocks ? (blocks.expert_quote.enabled && blocks.expert_quote.quote.trim() && blocks.expert_quote.name.trim() && blocks.expert_quote.role.trim() ? { ...blocks.expert_quote, image: blocks.expert_quote.media_id ? props.blockMedia?.[blocks.expert_quote.media_id]?.original_url ?? null : null, imageAlt: blocks.expert_quote.media_id ? props.blockMedia?.[blocks.expert_quote.media_id]?.alt_text ?? null : null } : null) : props.expertQuote?.quote?.trim() ? props.expertQuote : null;
  const medicalCta = blocks ? (blocks.medical_cta.enabled && blocks.medical_cta.heading.trim() && blocks.medical_cta.description.trim() ? { ...blocks.medical_cta, primaryLabel: blocks.medical_cta.primary.label, secondaryLabel: blocks.medical_cta.secondary.label } : null) : props.medicalCta && props.medicalCta.heading.trim() ? props.medicalCta : null;
  const faqItems = blocks ? (blocks.faq.enabled ? blocks.faq.items.filter((item) => item.question.trim() && item.answer.trim()) : []) : props.faqItems?.filter((item) => item.question.trim() && item.answer.trim()) ?? [];
  const faqHeading = blocks?.faq.heading || 'Frequently asked questions';
  const feedbackEnabled = blocks ? blocks.feedback.enabled : true;
  const feedbackPrompt = blocks?.feedback.prompt || 'Was this helpful?';
  const shareEnabled = blocks ? blocks.share.enabled : true;
  const disclaimer = blocks ? blocks.disclaimer.text.trim() : props.disclaimer?.trim() || 'The information is for educational purposes and does not replace professional medical advice, diagnosis or treatment.';

  return (
    <article data-template="template_1" data-template-version="2" className="overflow-x-hidden rounded-[28px] border border-sky-100 bg-white shadow-[0_16px_50px_-28px_rgba(15,23,42,0.25)]">
      <section data-region="hero" className="relative overflow-hidden rounded-[28px] bg-slate-950">
        {props.image ? (
          <div className="absolute inset-0"><Image src={props.image} alt={props.imageAlt ?? ''} fill sizes="100vw" className="object-cover" unoptimized /></div>
        ) : props.showFeaturedImagePlaceholder ? (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-sky-100 via-slate-50 to-cyan-100"><span className="rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Featured image</span></div>
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,19,47,0.72),rgba(8,19,47,0.86))]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-sky-100/90">
            {breadcrumb.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                <span>{item}</span>
                {index < breadcrumb.length - 1 && <span aria-hidden="true">/</span>}
              </span>
            ))}
          </nav>
          <div className="mx-auto max-w-4xl text-center">
            {category ? <span className="inline-flex items-center rounded-full border border-sky-200/60 bg-sky-100/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-100">{category}</span> : null}
            <h1 data-region="article-title" className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-6xl">{props.title || 'Untitled Blog'}</h1>
            <p data-region="excerpt" className="mx-auto mt-4 max-w-3xl text-base leading-7 text-sky-50 sm:text-lg">{props.excerpt || 'No excerpt provided.'}</p>
            <div data-region="metadata" className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-sky-50">
              <InfoPill icon={UserRound}>{props.author || 'Current administrator'}</InfoPill>
              {reviewer ? <InfoPill icon={Stethoscope}>{reviewer}</InfoPill> : null}
              {readingTime ? <InfoPill icon={Clock3}>{readingTime}</InfoPill> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-0 lg:py-12">
        {props.html?.trim() ? (
          <section data-region="article-content" className="rounded-2xl border border-slate-100 bg-white px-0 py-2 sm:px-1">
            <ArticleContent html={props.html} withRegion={false} />
          </section>
        ) : null}

        {keyTakeaways.length > 0 ? (
          <section data-region="key-takeaways" className="mt-10 rounded-2xl border-l-[4px] border-sky-500 bg-sky-50/70 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sky-700">
              <BookmarkCheck size={18} aria-hidden="true" />
              <h2 className="text-xl font-extrabold">{keyTakeawaysHeading}</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
              {keyTakeaways.map((item) => (
                <li key={item} className="flex items-start gap-3"><span className="mt-0.5 text-sky-600" aria-hidden="true">✓</span><span>{item}</span></li>
              ))}
            </ul>
          </section>
        ) : null}

        {comparisonCards.length > 0 ? (
          <section data-region="visual-comparison" className="mt-10">
            <SectionHeading>{comparisonHeading}</SectionHeading>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {comparisonCards.map((card, index) => (
                <article key={`${card.title}-${index}`} className="overflow-hidden rounded-2xl border border-sky-100 bg-slate-50">
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-sky-100 via-white to-slate-100">
                    {card.image ? <Image src={card.image} alt={card.imageAlt ?? card.title} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center text-sm font-bold text-sky-700">Comparison image</div>}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {numberedList.length > 0 ? (
          <section data-region="numbered-list" className="mt-10">
            <SectionHeading>{numberedHeading}</SectionHeading>
            <ol className="mt-5 space-y-4">
              {numberedList.map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-black text-sky-700">{index + 1}</span>
                  <div>
                    <p className="text-base font-extrabold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {expertQuote ? (
          <section data-region="expert-quote" className="mt-10 rounded-2xl border border-sky-100 bg-sky-50/70 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-sky-700 shadow-sm"><MessageSquareQuote size={20} aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-lg italic leading-8 text-slate-800">“{expertQuote.quote}”</p>
                <div className="mt-4 flex items-center gap-3">
                  {expertQuote.image ? <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-200"><Image src={expertQuote.image} alt={expertQuote.imageAlt ?? expertQuote.name ?? 'Doctor'} fill sizes="48px" className="object-cover" unoptimized /></div> : null}
                  <div>
                    <p className="text-sm font-black text-sky-700">{expertQuote.name || 'Medical reviewer'}</p>
                    <p className="text-xs font-semibold text-slate-500">{expertQuote.role || 'Clinical reviewer'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {medicalCta ? (
          <section data-region="medical-cta" className="mt-10 rounded-[26px] bg-slate-950 p-5 text-white sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"><CircleAlert size={18} aria-hidden="true" /></span>
              <div className="flex-1">
                <h2 className="text-xl font-extrabold sm:text-2xl">{medicalCta.heading}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-200">{medicalCta.description}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {medicalCta.primaryLabel ? <button type="button" disabled className="inline-flex items-center justify-center rounded-xl border border-sky-400 bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 opacity-80">{medicalCta.primaryLabel}</button> : null}
                  {medicalCta.secondaryLabel ? <button type="button" disabled className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-transparent px-4 py-2 text-sm font-bold text-white opacity-80">{medicalCta.secondaryLabel}</button> : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {faqItems.length > 0 ? (
          <section data-region="faq" className="mt-10">
            <SectionHeading>{faqHeading}</SectionHeading>
            <div className="mt-5 space-y-2">
              {faqItems.map((item, index) => {
                const expanded = openFaq === index;
                return (
                  <div key={`${item.question}-${index}`} className="overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/70">
                    <button type="button" aria-expanded={expanded} aria-controls={`faq-panel-${index}`} onClick={() => setOpenFaq(expanded ? -1 : index)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-slate-900">
                      <span>{item.question}</span>
                      {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    </button>
                    {expanded ? <div id={`faq-panel-${index}`} className="border-t border-sky-100 px-4 py-3 text-sm leading-6 text-slate-600">{item.answer}</div> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {(feedbackEnabled || shareEnabled) ? <section data-region="engagement" className="mt-10 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          {feedbackEnabled ? <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-700">
            <span>{feedbackPrompt}</span>
            <button type="button" disabled className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sky-700 opacity-70">Yes</button>
            <button type="button" disabled className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 opacity-70">No</button>
          </div> : null}
          {shareEnabled ? <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <button type="button" disabled className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 opacity-70"><Share2 size={14} aria-hidden="true" />Share</button>
            <button type="button" disabled className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 opacity-70"><Printer size={14} aria-hidden="true" />Print</button>
          </div> : null}
        </section> : null}

        {disclaimer ? <section data-region="medical-disclaimer" className="mt-10 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm italic leading-6 text-slate-700">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
            <p>{disclaimer}</p>
          </div>
        </section> : null}
      </div>
    </article>
  );
}
