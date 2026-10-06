import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { HeroFields } from './blog-block-editor';
import { CustomTemplateRenderer } from '../custom-template/custom-template-renderer';

afterEach(() => cleanup());

type HeroValue = Parameters<typeof HeroFields>[0]['value'];
const baseHero: HeroValue = { category: 'Gastroenterology', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null };

function Harness({ showHeaderStyle }: { showHeaderStyle?: boolean }) {
  const [value, setValue] = useState<HeroValue>(baseHero);
  return (
    <>
      <HeroFields value={value} onChange={setValue} fieldPrefix="blocks_json.custom_instances.hero_1" showHeaderStyle={showHeaderStyle} />
      <output>{JSON.stringify(value)}</output>
    </>
  );
}

describe('Hero Header style option in the blog editor', () => {
  it('lets the author pick the article header and stores it on the hero instance', async () => {
    const user = userEvent.setup();
    render(<Harness showHeaderStyle />);
    const select = screen.getByLabelText('Header style');
    expect(select).toHaveValue('standard');
    await user.selectOptions(select, 'article');
    expect(screen.getByText(/"header_style":"article"/)).toBeInTheDocument();
    await user.selectOptions(select, 'standard');
    expect(screen.getByText(/"header_style":"standard"/)).toBeInTheDocument();
  });

  it('is hidden for the built-in (non custom-template) hero editor', () => {
    render(<Harness />);
    expect(screen.queryByLabelText('Header style')).not.toBeInTheDocument();
  });
});

describe('Admin preview: article header + Q&A FAQ', () => {
  function layout(components: unknown[]) {
    return {
      schemaVersion: 1,
      layoutId: 'preview',
      metadata: { name: 'Preview', description: 'Test.' },
      page: { contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' },
      sections: [{
        id: 'sec', layout: 'full_width', responsiveStrategy: 'stack_on_mobile', enabled: true,
        slots: [{ id: 'slot', name: 'Main', components }]
      }]
    };
  }

  it('renders the article header (image, date badge, title, category) when selected', () => {
    const blocksDoc = { custom_instances: { hero_1: { componentKey: 'hero', category: 'Gastroenterology', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null, header_style: 'article' } } };
    const { container } = render(
      <CustomTemplateRenderer
        layoutConfig={layout([{ id: 'hero', componentKey: 'hero', blockId: 'hero_1', enabled: true, settings: { height: 'standard', alignment: 'left', overlay: 'medium' } }])}
        blocksDoc={blocksDoc as never}
        title="Heartburn vs. Acid Reflux"
        image="/img.png"
        isPreview
      />
    );
    expect(container.querySelector('[data-header-style="article"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Heartburn vs. Acid Reflux' })).toBeInTheDocument();
    expect(screen.getByText('Gastroenterology')).toBeInTheDocument();
  });

  it('keeps the original hero for the standard style', () => {
    const blocksDoc = { custom_instances: { hero_1: { componentKey: 'hero', category: 'Eye', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null } } };
    const { container } = render(
      <CustomTemplateRenderer
        layoutConfig={layout([{ id: 'hero', componentKey: 'hero', blockId: 'hero_1', enabled: true, settings: { height: 'standard', alignment: 'left', overlay: 'medium' } }])}
        blocksDoc={blocksDoc as never}
        title="Standard"
        isPreview
      />
    );
    expect(container.querySelector('[data-header-style="article"]')).toBeNull();
    expect(container.querySelector('[data-hero-height]')).toBeInTheDocument();
  });

  it('renders the FAQ as numbered, always-open Q&A when layout is qa_list', () => {
    const blocksDoc = { custom_instances: { faq_1: { componentKey: 'faq', enabled: true, heading: 'Frequently Asked Questions', items: [{ question: 'Can acid reflux happen without heartburn?', answer: 'Yes, sometimes.' }, { question: 'Can GERD go away permanently?', answer: 'It depends.' }] } } };
    const { container } = render(
      <CustomTemplateRenderer
        layoutConfig={layout([{ id: 'faq', componentKey: 'faq', blockId: 'faq_1', enabled: true, settings: { layout: 'qa_list', defaultOpen: 'none' } }])}
        blocksDoc={blocksDoc as never}
        isPreview
      />
    );
    expect(container.querySelector('[data-faq-layout="qa_list"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Q.1. Can acid reflux happen without heartburn?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Q.2. Can GERD go away permanently?' })).toBeInTheDocument();
    expect(screen.getByText('Yes, sometimes.')).toBeVisible();
    expect(container.querySelector('details')).toBeNull();
  });

  it('shows a template saved with the legacy "accordion" FAQ layout as the Q&A list', () => {
    const blocksDoc = { custom_instances: { faq_1: { componentKey: 'faq', enabled: true, heading: 'FAQ', items: [{ question: 'Q one?', answer: 'A one.' }] } } };
    const { container } = render(
      <CustomTemplateRenderer
        layoutConfig={layout([{ id: 'faq', componentKey: 'faq', blockId: 'faq_1', enabled: true, settings: { layout: 'accordion', defaultOpen: 'none' } }])}
        blocksDoc={blocksDoc as never}
        isPreview
      />
    );
    expect(container.querySelector('[data-faq-layout="qa_list"]')).toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Q.1. Q one?' })).toBeInTheDocument();
  });

  it('keeps the accordion for the image_accordion layout', () => {
    const blocksDoc = { custom_instances: { faq_1: { componentKey: 'faq', enabled: true, heading: 'FAQ', items: [{ question: 'Q one?', answer: 'A one.' }] } } };
    const { container } = render(
      <CustomTemplateRenderer
        layoutConfig={layout([{ id: 'faq', componentKey: 'faq', blockId: 'faq_1', enabled: true, settings: { layout: 'image_accordion', defaultOpen: 'none' } }])}
        blocksDoc={blocksDoc as never}
        isPreview
      />
    );
    expect(container.querySelector('details')).toBeInTheDocument();
  });
});

describe('Admin preview: article header placement', () => {
  const hero = { id: 'hero', componentKey: 'hero', blockId: 'hero_1', enabled: true, settings: { height: 'standard', alignment: 'left', overlay: 'medium' } };
  const layout = {
    schemaVersion: 1,
    layoutId: 'placement',
    metadata: { name: 'Placement', description: 'Test.' },
    page: { contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' },
    sections: [
      { id: 'top', layout: 'full_width', responsiveStrategy: 'stack_on_mobile', enabled: true, slots: [{ id: 'top-slot', name: 'Top', components: [hero] }] },
      { id: 'body', layout: 'content_sidebar', responsiveStrategy: 'sidebar_below_on_tablet', enabled: true, slots: [
        { id: 'main', name: 'Main', components: [{ id: 'faq', componentKey: 'faq', blockId: 'faq_1', enabled: true, settings: { layout: 'qa_list', defaultOpen: 'none' } }] },
        { id: 'side', name: 'Sidebar', components: [{ id: 'cats', componentKey: 'blog_categories', enabled: true, settings: { heading: 'Categories', maxItems: 3, showCount: false } }] }
      ] }
    ]
  };
  const docWith = (headerStyle?: string) => ({
    custom_instances: {
      hero_1: { componentKey: 'hero', category: 'Eye', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null, ...(headerStyle ? { header_style: headerStyle } : {}) },
      faq_1: { componentKey: 'faq', enabled: true, heading: 'FAQ', items: [{ question: 'One?', answer: 'Yes.' }] }
    }
  });

  it('puts the article header at the top of the left column and removes the full-width hero section', () => {
    const { container } = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={docWith('article') as never} title="My article" isPreview />);
    expect(container.querySelector('[data-section-id="top"]')).toBeNull();
    const leftSlot = container.querySelector('[data-slot-id="main"]')!;
    expect(leftSlot.firstElementChild).toHaveAttribute('data-header-style', 'article');
    expect(container.querySelector('[data-slot-id="side"] [data-header-style="article"]')).toBeNull();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('keeps the original full-width hero for the standard style', () => {
    const { container } = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={docWith() as never} title="My article" isPreview />);
    expect(container.querySelector('[data-section-id="top"] [data-hero-height]')).toBeInTheDocument();
    expect(container.querySelector('[data-header-style="article"]')).toBeNull();
  });
});

describe('Admin preview: template saved with two Hero Banners', () => {
  const heroSettings = { height: 'standard', alignment: 'left', overlay: 'medium' };
  const layout = {
    schemaVersion: 1,
    layoutId: 'two-heroes',
    metadata: { name: 'Two heroes', description: 'Legacy template.' },
    page: { contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' },
    sections: [
      { id: 'top', layout: 'full_width', responsiveStrategy: 'stack_on_mobile', enabled: true, slots: [{ id: 'top-slot', name: 'Top', components: [{ id: 'hero-1', componentKey: 'hero', blockId: 'hero_1', enabled: true, settings: heroSettings }] }] },
      { id: 'body', layout: 'content_sidebar', responsiveStrategy: 'sidebar_below_on_tablet', enabled: true, slots: [
        { id: 'main', name: 'Main', components: [
          { id: 'hero-2', componentKey: 'hero', blockId: 'hero_2', enabled: true, settings: heroSettings },
          { id: 'faq', componentKey: 'faq', blockId: 'faq_1', enabled: true, settings: { layout: 'qa_list', defaultOpen: 'none' } }
        ] },
        { id: 'side', name: 'Sidebar', components: [] }
      ] },
      { id: 'extra', layout: 'full_width', responsiveStrategy: 'stack_on_mobile', enabled: true, slots: [{ id: 'extra-slot', name: 'Extra', components: [{ id: 'hero-3', componentKey: 'hero', blockId: 'hero_3', enabled: true, settings: heroSettings }] }] }
    ]
  };
  const hero = (extra = {}) => ({ componentKey: 'hero', category: 'Eye', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null, ...extra });
  const doc = (firstStyle?: string) => ({
    custom_instances: {
      hero_1: hero(firstStyle ? { header_style: firstStyle } : {}),
      hero_2: hero(),
      hero_3: hero(),
      faq_1: { componentKey: 'faq', enabled: true, heading: 'FAQ', items: [{ question: 'One?', answer: 'Yes.' }] }
    }
  });

  it('with the article header: shows exactly one banner (no second banner under it) and no leftover empty hero sections', () => {
    const { container } = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={doc('article') as never} title="My article" isPreview />);
    expect(container.querySelectorAll('[data-header-style="article"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-hero-height]')).toHaveLength(0);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('[data-section-id="top"]')).toBeNull();
    expect(container.querySelector('[data-section-id="extra"]')).toBeNull();
    expect(container.querySelector('[data-slot-id="main"]')!.firstElementChild).toHaveAttribute('data-header-style', 'article');
  });

  it('with the standard style: still only one hero is rendered', () => {
    const { container } = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={doc() as never} title="My article" isPreview />);
    expect(container.querySelectorAll('[data-hero-height]')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('[data-section-id="top"] [data-hero-height]')).toBeInTheDocument();
    expect(container.querySelector('[data-section-id="extra"]')).toBeNull();
  });
});
