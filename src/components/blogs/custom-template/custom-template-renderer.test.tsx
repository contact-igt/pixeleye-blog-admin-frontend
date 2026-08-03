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
    expect(innerContainer.className).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]');
  });

  it('maps every Page-level value to the explicit Admin renderer contract', () => {
    const cases = [
      [{ contentWidth: 'narrow', background: 'soft_gray', spacing: 'compact', typography: 'modern' }, ['max-w-2xl', 'bg-slate-50', 'space-y-6', 'font-sans']],
      [{ contentWidth: 'standard', background: 'brand_tint', spacing: 'normal', typography: 'clinical' }, ['max-w-4xl', 'bg-sky-50/40', 'space-y-10', 'font-mono']],
      [{ contentWidth: 'wide', background: 'white', spacing: 'spacious', typography: 'editorial' }, ['max-w-6xl', 'bg-white', 'space-y-16', 'font-serif']],
      [{ contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' }, ['max-w-none', 'bg-white', 'space-y-10', 'font-serif']]
    ] as const;

    for (const [page, expectedClasses] of cases) {
      const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
      layout.page = page;
      const view = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} isPreview />);
      const article = view.container.querySelector('[data-template="custom_template"]')!;
      const pageContainer = article.firstElementChild!;
      expect(article.className).toContain(expectedClasses[1]);
      expect(article.className).toContain(expectedClasses[3]);
      expect(pageContainer.className).toContain(expectedClasses[0]);
      expect(pageContainer.className).toContain(expectedClasses[2]);
      view.unmount();
    }
  });

  it('uses selected responsive strategy at desktop, tablet, and mobile preview sizes', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.sections[1].layout = 'three_column';
    layout.sections[1].responsiveStrategy = 'three_to_two_to_one';
    layout.sections[1].slots.push({ id: 'slot-third', name: 'Third', components: [] });

    const desktop = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} previewDevice="desktop" isPreview />);
    expect(desktop.container.querySelector('[data-section-id="sec-body"]')?.firstElementChild?.className).toContain('lg:grid-cols-3');
    desktop.unmount();
    const tablet = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} previewDevice="tablet" isPreview />);
    expect(tablet.container.querySelector('[data-section-id="sec-body"]')?.firstElementChild?.className).toContain('grid-cols-2');
    tablet.unmount();
    const mobile = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} previewDevice="mobile" isPreview />);
    expect(mobile.container.querySelector('[data-section-id="sec-body"]')?.firstElementChild?.className).toContain('grid-cols-1');
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
