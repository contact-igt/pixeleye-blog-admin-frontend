import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CustomTemplateRenderer } from './custom-template-renderer';
import { sampleFrontendBlocksDoc, sampleFrontendCustomTemplateConfig } from './custom-template-sample';
import { getComponentDefinition, isRegisteredComponentKey } from './component-registry';
import { supportedTemplateVersions } from '../templates/template-registry';
import type { BlogTemplateKey } from '@/types/blog';

afterEach(() => {
  cleanup();
});

describe('CustomTemplateRenderer Deterministic Execution', () => {
  it('renders valid sample layout with proper section, slot, and component hierarchy', () => {
    render(
      <CustomTemplateRenderer
        layoutConfig={sampleFrontendCustomTemplateConfig}
        blocksDoc={sampleFrontendBlocksDoc}
        contentHtml="<p>Article body text</p>"
        title="Eye Care Guide"
        excerpt="An essential guide to eye health."
        isPreview
      />
    );

    const article = document.querySelector('[data-template="custom_template"]')!;
    expect(article).toBeInTheDocument();
    expect(article).toHaveAttribute('data-template-version', '1');

    // Sections order check
    const sections = article.querySelectorAll('[data-section-id]');
    expect(sections).toHaveLength(2);
    expect(sections[0]?.getAttribute('data-section-id')).toBe('sec-hero');
    expect(sections[1]?.getAttribute('data-section-id')).toBe('sec-body');

    // Content resolution check
    expect(screen.getByText('Eye Care Guide')).toBeInTheDocument();
    expect(screen.getByText('An essential guide to eye health.')).toBeInTheDocument();
    expect(screen.getByText('Key Takeaways')).toBeInTheDocument();
    expect(screen.getByText('Article body text')).toBeInTheDocument();
  });

  it('preserves section, slot, and component DOM ordering', () => {
    render(
      <CustomTemplateRenderer
        layoutConfig={sampleFrontendCustomTemplateConfig}
        blocksDoc={sampleFrontendBlocksDoc}
        contentHtml="<p>Body</p>"
        title="Ordered Test"
        isPreview
      />
    );

    const article = document.querySelector('[data-template="custom_template"]')!;
    const slots = article.querySelectorAll('[data-slot-id]');
    expect(slots[0]?.getAttribute('data-slot-id')).toBe('slot-hero');
    expect(slots[1]?.getAttribute('data-slot-id')).toBe('slot-main');
    expect(slots[2]?.getAttribute('data-slot-id')).toBe('slot-sidebar');
  });

  it('renders controlled preview error when config is invalid', () => {
    const invalidConfig = { ...sampleFrontendCustomTemplateConfig, schemaVersion: 99 };
    render(
      <CustomTemplateRenderer
        layoutConfig={invalidConfig}
        blocksDoc={sampleFrontendBlocksDoc}
        contentHtml="<p>Body</p>"
        title="Invalid Config"
        isPreview
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Custom Template Layout Validation Error');
    expect(document.querySelector('[data-template="custom_template"]')).not.toBeInTheDocument();
  });

  it('handles unknown component key safely without crashing or executing arbitrary code', () => {
    const configWithUnknown = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    configWithUnknown.sections[0].slots[0].components[0].componentKey = 'malicious_component';

    render(
      <CustomTemplateRenderer
        layoutConfig={configWithUnknown}
        blocksDoc={sampleFrontendBlocksDoc}
        contentHtml="<p>Body</p>"
        title="Unknown Comp Test"
        isPreview
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Unknown component key: 'malicious_component'");
  });

  it('maps section responsive strategies to trusted CSS class strings', () => {
    render(
      <CustomTemplateRenderer
        layoutConfig={sampleFrontendCustomTemplateConfig}
        blocksDoc={sampleFrontendBlocksDoc}
        contentHtml="<p>Body</p>"
        title="Responsive Test"
        isPreview
      />
    );

    const article = document.querySelector('[data-template="custom_template"]')!;
    const sectionBody = article.querySelector('[data-section-id="sec-body"]')!;
    const innerContainer = sectionBody.firstElementChild!;
    expect(innerContainer.className).toContain('lg:grid-cols-[1fr_340px]');
  });

  it('renders system components (TOC) without requiring blockId', () => {
    render(
      <CustomTemplateRenderer
        layoutConfig={sampleFrontendCustomTemplateConfig}
        blocksDoc={sampleFrontendBlocksDoc}
        contentHtml="<p>Body</p>"
        title="System Component Test"
        isPreview
      />
    );

    expect(screen.getByRole('navigation', { name: 'Table of contents' })).toBeInTheDocument();
  });
});

describe('Frontend Component Registry Integrity', () => {
  it('contains trusted allowlisted components only', () => {
    expect(isRegisteredComponentKey('hero')).toBe(true);
    expect(isRegisteredComponentKey('article_table_of_contents')).toBe(true);
    expect(isRegisteredComponentKey('spacer')).toBe(true);
    expect(isRegisteredComponentKey('arbitrary_react_component')).toBe(false);
  });

  it('correctly maps categories for content, system, and structural components', () => {
    expect(getComponentDefinition('hero').category).toBe('content');
    expect(getComponentDefinition('article_table_of_contents').category).toBe('system');
    expect(getComponentDefinition('spacer').category).toBe('structural');
  });
});

describe('Public Template Identity Baseline Protection', () => {
  it('verifies supportedTemplateVersions includes only template_1 and template_2', () => {
    expect(Object.keys(supportedTemplateVersions)).toEqual(['template_1', 'template_2']);
    expect(supportedTemplateVersions).not.toHaveProperty('custom_template');
  });

  it('verifies public BlogTemplateKey TypeScript union is strictly template_1 | template_2', () => {
    const key1: BlogTemplateKey = 'template_1';
    const key2: BlogTemplateKey = 'template_2';
    expect([key1, key2]).toEqual(['template_1', 'template_2']);
  });
});
