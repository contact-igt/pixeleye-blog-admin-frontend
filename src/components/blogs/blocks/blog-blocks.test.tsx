import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultBlogBlocks, normalizeBlogBlocks } from '@/types/blog-blocks';
import { BlogBlockEditor } from './blog-block-editor';
import { RepeaterEditor } from './repeater-editor';
import { TemplatePreviewRenderer } from '../templates/template-preview-renderer';

afterEach(() => cleanup());

describe('Template 1 block defaults', () => {
  it('normalizes legacy NULL and keeps the disclaimer, feedback and share defaults', () => {
    const blocks = normalizeBlogBlocks(null);
    expect(blocks).toEqual(createDefaultBlogBlocks());
    expect(blocks.blocks.disclaimer).toMatchObject({ enabled: true, text: expect.any(String) });
    expect(blocks.blocks.feedback.enabled).toBe(true);
    expect(blocks.blocks.share.enabled).toBe(true);
  });
});

describe('Article Sections editor', () => {
  function Harness() {
    const [blocks, setBlocks] = useState(createDefaultBlogBlocks());
    return <><BlogBlockEditor value={blocks} onChange={setBlocks} /><output>{JSON.stringify(blocks)}</output></>;
  }

  it('edits optional blocks and keeps the medical disclaimer mandatory', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Article Sections' })).toBeInTheDocument();
    expect(screen.getByText(/cannot be disabled/)).toBeInTheDocument();
    const toggle = screen.getAllByLabelText('Disabled')[0]!;
    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Add takeaway' }));
    await user.type(screen.getByLabelText('Takeaway 1'), 'A real takeaway');
    expect(screen.getByLabelText('Takeaway 1')).toHaveValue('A real takeaway');
  });

  it('adds, removes and moves repeaters with stable controls and a maximum', async () => {
    const user = userEvent.setup();
    function RepeaterHarness() {
      const [items, setItems] = useState(['One', 'Two']);
      return <><RepeaterEditor items={items} max={3} createItem={() => 'Three'} addLabel="Add item" onChange={setItems} renderItem={(item) => <span>{item}</span>} /><output>{items.join(',')}</output></>;
    }
    render(<RepeaterHarness />);
    await user.click(screen.getAllByRole('button', { name: 'Move item down' })[0]!);
    expect(screen.getByText('Two,One')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByText('Two,One,Three')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: 'Remove item' })[1]!);
    expect(screen.getByText('Two,Three')).toBeInTheDocument();
  });
});

describe('Template 1 v2 real block rendering', () => {
  it('renders all eleven real Blog regions and no library sample content', () => {
    const blocks = createDefaultBlogBlocks();
    blocks.blocks.hero = { category: 'Retina', breadcrumb: ['Home', 'Retina'], reviewer: { name: 'Dr Real', credentials: 'MD' }, reading_time_minutes: 8 };
    blocks.blocks.key_takeaways = { enabled: true, heading: 'Real Takeaways', items: ['Persisted takeaway'] };
    blocks.blocks.image_comparison = { enabled: true, heading: 'Real Comparison', items: [{ media_id: '5', title: 'Real card', description: 'Persisted comparison' }] };
    blocks.blocks.numbered_list = { enabled: true, heading: 'Real Steps', items: [{ title: 'First real step', description: 'Persisted numbered content' }] };
    blocks.blocks.expert_quote = { enabled: true, quote: 'Persisted expert quote', name: 'Dr Real', role: 'Reviewer', media_id: '6', profile_url: 'https://example.com/doctor' };
    blocks.blocks.medical_cta = { enabled: true, heading: 'Real CTA', description: 'Persisted CTA', primary: { label: 'Get help', url: 'https://example.com/help' }, secondary: { label: '', url: '' } };
    blocks.blocks.faq = { enabled: true, heading: 'Real FAQ', items: [{ question: 'Real question?', answer: 'Persisted answer.' }] };
    blocks.blocks.feedback = { enabled: true, prompt: 'Was this real article useful?' };
    blocks.blocks.share = { enabled: true };
    blocks.blocks.disclaimer = { enabled: true, text: 'Persisted medical disclaimer.' };

    render(<TemplatePreviewRenderer
      templateKey="template_1"
      templateVersion={2}
      title="Real title"
      excerpt="Real excerpt"
      html="<p>Real rich article content</p>"
      blocks={blocks}
      blockMedia={{
        '5': { id: '5', original_url: 'https://media.example.com/comparison.webp', alt_text: 'Comparison' },
        '6': { id: '6', original_url: 'https://media.example.com/expert.webp', alt_text: 'Expert' }
      }}
    />);

    const article = document.querySelector('[data-template="template_1"]')!;
    expect(Array.from(article.querySelectorAll('[data-region]')).map((node) => node.getAttribute('data-region'))).toEqual([
      'hero', 'article-title', 'excerpt', 'metadata', 'article-content', 'key-takeaways', 'visual-comparison',
      'numbered-list', 'expert-quote', 'medical-cta', 'faq', 'engagement', 'medical-disclaimer'
    ]);
    expect(article).toHaveTextContent('Persisted takeaway');
    expect(article).toHaveTextContent('Persisted expert quote');
    expect(article).toHaveTextContent('Persisted medical disclaimer');
    expect(article).not.toHaveTextContent('Routine checks help detect changes early');
  });

  it('hides disabled optional blocks while Template 1 v1 and Template 2 remain unchanged', () => {
    const blocks = createDefaultBlogBlocks();
    const props = { title: 'Title', excerpt: 'Excerpt', html: '<h2>Body</h2>', blocks };
    const { rerender } = render(<TemplatePreviewRenderer {...props} templateKey="template_1" templateVersion={2} />);
    expect(document.querySelector('[data-region="key-takeaways"]')).toBeNull();
    expect(document.querySelector('[data-region="medical-disclaimer"]')).toBeTruthy();
    rerender(<TemplatePreviewRenderer {...props} templateKey="template_1" templateVersion={1} />);
    expect(document.querySelector('[data-template-version="1"]')).toBeTruthy();
    rerender(<TemplatePreviewRenderer {...props} templateKey="template_2" templateVersion={1} content={{ type: 'doc', content: [] }} />);
    expect(document.querySelector('[data-template="template_2"]')).toBeTruthy();
    expect(document.querySelector('[data-region="key-takeaways"]')).toBeNull();
  });
});
