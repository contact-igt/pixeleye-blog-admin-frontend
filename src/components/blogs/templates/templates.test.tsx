import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemplateSelector } from './template-selector';
import { TemplatePreviewRenderer } from './template-preview-renderer';
import { addTableOfContentsIds, buildTableOfContents } from './table-of-contents';
import type { TipTapDocument } from '@/types/blog';
import { templateTwoSampleBlocks } from './template-two-sample';

const templates = [
  { key: 'template_1', version: 2, name: 'Healthcare Editorial Article', description: 'A complete healthcare editorial layout with hero, article content, callouts, expert guidance, FAQ and disclaimer.', layout: 'single_column' },
  { key: 'template_2', version: 1, name: 'Article with Sidebar', description: 'An article layout with a supporting sidebar.', layout: 'article_sidebar' },
];
function response(data: unknown) { return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
const content: TipTapDocument = {
  type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Introduction' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Treatment' }] },
    { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Treatment' }] },
  ]
};

const previewProps = { image: null, title: 'Eye Care', excerpt: 'Excerpt', html: '<h2>Introduction</h2><h3>Treatment</h3><h4>Treatment</h4><p>Body</p>' };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('TemplateSelector', () => {
  it('loads exactly two templates and exposes accessible selected state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(templates)));
    const change = vi.fn();
    const user = userEvent.setup();
    render(<TemplateSelector value="template_1" onChange={change} />);
    expect(screen.getByLabelText('Loading article templates')).toBeInTheDocument();
    const radios = await screen.findAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: /Article with Sidebar/ }));
    expect(change).toHaveBeenCalledWith('template_2');
  });

  it('shows an API error with retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Templates offline')));
    render(<TemplateSelector value="template_1" onChange={() => undefined} />);
    expect(await screen.findByText('Unable to connect to the backend API')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Template preview foundation', () => {
  it('generates nested deterministic TOC identifiers including duplicates', () => {
    expect(buildTableOfContents(content)).toEqual([
      { id: 'introduction', text: 'Introduction', level: 2 },
      { id: 'treatment', text: 'Treatment', level: 3 },
      { id: 'treatment-2', text: 'Treatment', level: 4 },
    ]);
    expect(addTableOfContentsIds(previewProps.html, buildTableOfContents(content))).toContain('<h4 id="treatment-2">');
  });

  it('renders Template 1 without a TOC', () => {
    render(<TemplatePreviewRenderer {...previewProps} templateKey="template_1" templateVersion={1} content={content} />);
    expect(document.querySelector('[data-template="template_1"]')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Table of contents' })).not.toBeInTheDocument();
  });

  it('renders Template 2 with nested linked TOC items', () => {
    render(<TemplatePreviewRenderer {...previewProps} templateKey="template_2" templateVersion={1} content={content} />);
    expect(document.querySelector('[data-template="template_2"]')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Table of contents' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Table of contents' }).querySelector('a[href="#treatment-2"]')).toHaveTextContent('Treatment');
  });

  it('fails safely for unsupported template versions', () => {
    render(<TemplatePreviewRenderer {...previewProps} templateKey="template_2" templateVersion={99} content={content} />);
    expect(screen.getByRole('alert')).toHaveTextContent('not supported');
    expect(document.querySelector('[data-template]')).not.toBeInTheDocument();
  });
});

describe('Template rendering regression coverage', () => {
  it('preserves spaces across marked heading text and skips empty headings when assigning IDs', () => {
    const marked: TipTapDocument = {
      type: 'doc', content: [
        {
          type: 'heading', attrs: { level: 2 }, content: [
            { type: 'text', text: 'Eye ', attrs: {}, content: undefined },
            { type: 'text', text: 'Care' }
          ]
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ignored paragraph' }] }
      ]
    };
    const items = buildTableOfContents(marked);
    expect(items).toEqual([{ id: 'eye-care', text: 'Eye Care', level: 2 }]);
    expect(addTableOfContentsIds('<h2></h2><h2>Eye <strong>Care</strong></h2>', items)).toBe('<h2></h2><h2 id="eye-care">Eye <strong>Care</strong></h2>');
  });

  it('renders Template 1 version 1 in legacy region order with no sidebar', () => {
    render(<TemplatePreviewRenderer {...previewProps} showFeaturedImagePlaceholder templateKey="template_1" templateVersion={1} content={content} />);
    const article = document.querySelector('[data-template="template_1"]')!;
    expect(Array.from(article.querySelectorAll('[data-region]')).map((node) => node.getAttribute('data-region'))).toEqual(['featured-image', 'article-title', 'excerpt', 'metadata', 'article-content']);
    expect(article.className).toContain('max-w-3xl');
    expect(article.querySelector('[data-region="table-of-contents-sidebar"]')).toBeNull();
  });

  it('renders Template 1 version 2 in the healthcare editorial region order', () => {
    const versionTwoProps = {
      ...previewProps,
      showFeaturedImagePlaceholder: true,
      image: null,
      author: 'Pixel Eye clinical team',
      reviewer: 'Dr. Aanya Nair, MBBS, DNB Ophthalmology',
      readingTime: '6 min read',
      breadcrumb: ['Home', 'Health Library', 'Vision care'],
      category: 'Eye health',
      keyTakeaways: ['Routine checks help detect changes early.', 'Protective habits reduce the risk of strain and irritation.', 'Urgent symptoms should be evaluated promptly.'],
      comparisonCards: [
        { title: 'Routine review', description: 'Useful for preventive check-ins and ongoing monitoring.', image: null },
        { title: 'Urgent review', description: 'A shorter follow-up route for new or worsening symptoms.', image: null },
        { title: 'Emergency care', description: 'For sudden vision loss or severe discomfort, seek urgent care now.', image: null }
      ],
      numberedList: [
        { title: 'Cloudy or blurry vision', description: 'This can reflect changing focus, dryness or an underlying eye condition that deserves review.' },
        { title: 'Difficulty with night vision', description: 'A drop in night comfort can appear before a person notices broader symptoms.' },
        { title: 'Sensitivity to light and glare', description: 'This commonly accompanies inflammation, dryness, or changes in the eye surface.' }
      ],
      expertQuote: {
        quote: 'The most important step is to notice meaningful changes early, especially when they affect your daily routine.',
        name: 'Dr. Aanya Nair',
        role: 'Consultant Ophthalmologist'
      },
      medicalCta: {
        heading: 'Need urgent clinical guidance?',
        description: 'If your symptoms are sudden, severe, or affecting safety, reach out to your care team or local emergency support right away.',
        primaryLabel: 'Book urgent screen',
        secondaryLabel: 'Emergency contacts'
      },
      faqItems: [
        { question: 'How often should I schedule an eye review?', answer: 'Most people benefit from periodic eye checks according to age, symptoms and risk factors.' },
        { question: 'When should I seek urgent help?', answer: 'Seek immediate care if you notice sudden blurred vision, flashes, double vision, or severe pain.' }
      ],
      disclaimer: 'The information is for educational purposes and does not replace professional medical advice, diagnosis or treatment.'
    };
    render(<TemplatePreviewRenderer {...versionTwoProps} templateKey="template_1" templateVersion={2} content={content} />);
    const article = document.querySelector('[data-template="template_1"]')!;
    expect(article).toHaveAttribute('data-template-version', '2');
    expect(Array.from(article.querySelectorAll('[data-region]')).map((node) => node.getAttribute('data-region'))).toEqual(['hero', 'article-title', 'excerpt', 'metadata', 'article-content', 'key-takeaways', 'visual-comparison', 'numbered-list', 'expert-quote', 'medical-cta', 'faq', 'engagement', 'medical-disclaimer']);
    expect(article.className).toContain('rounded-[28px]');
  });

  it('renders Template 2 as responsive main-content then TOC sidebar and shows its empty state', () => {
    const { rerender } = render(<TemplatePreviewRenderer {...previewProps} showFeaturedImagePlaceholder templateKey="template_2" templateVersion={1} content={content} />);
    const layout = document.querySelector('[data-region="article-with-sidebar"]')!;
    expect(layout.className).toContain('lg:grid-cols');
    expect(layout.children[0]?.querySelector('[data-region="article-content"]')).toBeTruthy();
    expect(layout.children[1]).toHaveAttribute('data-region', 'table-of-contents-sidebar');
    rerender(<TemplatePreviewRenderer {...previewProps} showFeaturedImagePlaceholder templateKey="template_2" templateVersion={1} content={{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] }} />);
    expect(screen.getByRole('navigation', { name: 'Table of contents' })).toHaveTextContent('Article Introduction');
  });

  it('renders all configured Template 2 healthcare sections and its accessible FAQ', async () => {
    const user = userEvent.setup();
    render(<TemplatePreviewRenderer {...previewProps} blocks={templateTwoSampleBlocks} showFeaturedImagePlaceholder templateKey="template_2" templateVersion={1} content={content} />);
    const article = document.querySelector('[data-template="template_2"]')!;
    for (const region of ['hero', 'key-takeaways', 'article-content', 'visual-comparison', 'numbered-list', 'expert-quote', 'medical-cta', 'faq', 'engagement', 'medical-disclaimer']) expect(article.querySelector(`[data-region="${region}"]`)).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Table of contents' })).toHaveTextContent('Doctor’s Insight');
    const question = screen.getByRole('button', { name: 'When should I seek urgent help?' });
    expect(question).toHaveAttribute('aria-expanded', 'false');
    await user.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Seek immediate care/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe Now' })).toBeDisabled();
  });

  it('switches renderer immediately without changing supplied article content', () => {
    const { rerender } = render(<TemplatePreviewRenderer {...previewProps} templateKey="template_1" templateVersion={1} content={content} />);
    expect(document.querySelector('[data-template="template_1"]')).toHaveTextContent('Eye Care');
    rerender(<TemplatePreviewRenderer {...previewProps} templateKey="template_2" templateVersion={1} content={content} />);
    expect(document.querySelector('[data-template="template_1"]')).toBeNull();
    expect(document.querySelector('[data-template="template_2"]')).toHaveTextContent('Eye Care');
  });
});

describe('TemplateSelector keyboard behavior', () => {
  it('uses native radios so arrow keys select exactly one template', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(templates)));
    const change = vi.fn();
    const user = userEvent.setup();
    render(<TemplateSelector value="template_1" onChange={change} />);
    const radios = await screen.findAllByRole('radio');
    radios[0]?.focus();
    await user.keyboard('{ArrowRight}');
    expect(change).toHaveBeenCalledWith('template_2');
  });
});
