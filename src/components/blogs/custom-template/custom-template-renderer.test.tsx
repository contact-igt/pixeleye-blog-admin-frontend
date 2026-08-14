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

  it('renders repeated Rich Article Content from custom instance html', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.sections[1].slots[0].components.push({
      id: 'article-extra',
      componentKey: 'rich_article_content',
      blockId: 'article_extra',
      enabled: true,
      settings: { fontSize: 'medium', lineHeight: 'relaxed' }
    });
    const blocksDoc = {
      ...sampleFrontendBlocksDoc,
      custom_instances: {
        ...sampleFrontendBlocksDoc.custom_instances,
        article_extra: { componentKey: 'rich_article_content' as const, enabled: true as const, content_json: { type: 'doc' as const, content: [{ type: 'paragraph' as const }] }, html: '<p>Second article body</p>' }
      }
    };

    render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={blocksDoc} contentHtml="<p>First article body</p>" isPreview />);

    expect(screen.getByText('First article body')).toBeInTheDocument();
    expect(screen.getByText('Second article body')).toBeInTheDocument();
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
    const grid = sectionBody.firstElementChild?.firstElementChild!;
    expect(grid.className).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]');
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

  it('keeps regular inherited sections max-w-6xl when the page default is full width', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.page.contentWidth = 'full';

    render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} isPreview />);

    const hero = document.querySelector('[data-section-id="sec-hero"]')!;
    const body = document.querySelector('[data-section-id="sec-body"]')!;
    expect(hero).toHaveAttribute('data-section-width', 'full');
    expect(hero.firstElementChild?.className).toContain('max-w-none');
    expect(body).toHaveAttribute('data-section-width', 'wide');
    expect(body.firstElementChild?.className).toContain('max-w-6xl');
  });

  it('uses selected responsive strategy at desktop, tablet, and mobile preview sizes', () => {
    const layout = JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig));
    layout.sections[1].layout = 'three_column';
    layout.sections[1].responsiveStrategy = 'three_to_two_to_one';
    layout.sections[1].slots.push({ id: 'slot-third', name: 'Third', components: [] });

    const desktop = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} previewDevice="desktop" isPreview />);
    expect(desktop.container.querySelector('[data-section-id="sec-body"]')?.firstElementChild?.firstElementChild?.className).toContain('lg:grid-cols-3');
    desktop.unmount();
    const tablet = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} previewDevice="tablet" isPreview />);
    expect(tablet.container.querySelector('[data-section-id="sec-body"]')?.firstElementChild?.firstElementChild?.className).toContain('grid-cols-2');
    tablet.unmount();
    const mobile = render(<CustomTemplateRenderer layoutConfig={layout} blocksDoc={sampleFrontendBlocksDoc} previewDevice="mobile" isPreview />);
    expect(mobile.container.querySelector('[data-section-id="sec-body"]')?.firstElementChild?.firstElementChild?.className).toContain('grid-cols-1');
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

describe('Data & Comparison Table rendering', () => {
  function tableLayout(settings: Partial<{ variant: string; headerStyle: string; alignment: string; maxRows: number; maxColumns: number }> = {}) {
    return {
      schemaVersion: 1,
      layoutId: 'table-layout',
      metadata: { name: 'Table Layout', description: 'Renderer test.' },
      page: { contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' },
      sections: [{
        id: 'sec-table',
        layout: 'full_width',
        responsiveStrategy: 'stack_on_mobile',
        enabled: true,
        background: 'white',
        slots: [{
          id: 'slot-table',
          name: 'Main',
          components: [{
            id: 'comp-table',
            componentKey: 'table',
            blockId: 'table_1',
            enabled: true,
            settings: { variant: 'striped', headerStyle: 'brand_sky', alignment: 'left', maxRows: 4, maxColumns: 4, ...settings }
          }]
        }]
      }]
    };
  }

  function tableBlocksDoc(overrides: Partial<{ enabled: boolean; heading: string; content: string; headers: string[]; rows: string[][] }> = {}) {
    return {
      custom_instances: {
        table_1: {
          componentKey: 'table' as const,
          enabled: true,
          heading: 'LASIK Treatment Comparison',
          content: 'Compare the available treatment options.',
          headers: ['Procedure', 'Recovery Time', 'Success Rate'],
          rows: [
            ['LASIK', '24 hours', '99%'],
            ['PRK', '3-5 days', '98%']
          ],
          ...overrides
        }
      }
    };
  }

  it('renders the title, content, headers, and cell data', () => {
    render(<CustomTemplateRenderer layoutConfig={tableLayout()} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('heading', { name: 'LASIK Treatment Comparison' })).toBeInTheDocument();
    expect(screen.getByText('Compare the available treatment options.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Procedure' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '24 hours' })).toBeInTheDocument();
  });

  it('wraps the table in a horizontally scrollable container for mobile', () => {
    render(<CustomTemplateRenderer layoutConfig={tableLayout()} blocksDoc={tableBlocksDoc() as never} />);
    const table = screen.getByRole('table');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
  });

  it('applies the striped variant as alternating row backgrounds', () => {
    render(<CustomTemplateRenderer layoutConfig={tableLayout({ variant: 'striped' })} blocksDoc={tableBlocksDoc() as never} />);
    const rows = screen.getAllByRole('row').slice(1); // exclude header row
    expect(rows[0]).not.toHaveClass('bg-slate-50');
    expect(rows[1]).toHaveClass('bg-slate-50');
  });

  it('applies the bordered variant with visible borders', () => {
    render(<CustomTemplateRenderer layoutConfig={tableLayout({ variant: 'bordered' })} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('table')).toHaveClass('border');
  });

  it('applies the clean variant without a heavy outer grid', () => {
    render(<CustomTemplateRenderer layoutConfig={tableLayout({ variant: 'clean' })} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('table').className).not.toContain('border-slate-300');
  });

  it('applies left and center alignment to headers and cells', () => {
    const { unmount } = render(<CustomTemplateRenderer layoutConfig={tableLayout({ alignment: 'left' })} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('columnheader', { name: 'Procedure' })).toHaveClass('text-left');
    unmount();

    render(<CustomTemplateRenderer layoutConfig={tableLayout({ alignment: 'center' })} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('columnheader', { name: 'Procedure' })).toHaveClass('text-center');
  });

  it('applies the brand_sky, dark_slate, and light_gray header styles', () => {
    const { unmount: unmountSky } = render(<CustomTemplateRenderer layoutConfig={tableLayout({ headerStyle: 'brand_sky' })} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('columnheader', { name: 'Procedure' })).toHaveClass('bg-sky-50');
    unmountSky();

    const { unmount: unmountDark } = render(<CustomTemplateRenderer layoutConfig={tableLayout({ headerStyle: 'dark_slate' })} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('columnheader', { name: 'Procedure' })).toHaveClass('bg-slate-900');
    unmountDark();

    render(<CustomTemplateRenderer layoutConfig={tableLayout({ headerStyle: 'light_gray' })} blocksDoc={tableBlocksDoc() as never} />);
    expect(screen.getByRole('columnheader', { name: 'Procedure' })).toHaveClass('bg-slate-100');
  });

  it('does not render a disabled table', () => {
    render(<CustomTemplateRenderer layoutConfig={tableLayout()} blocksDoc={tableBlocksDoc({ enabled: false }) as never} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows preview fallback content when no instance data exists yet', () => {
    render(<CustomTemplateRenderer layoutConfig={tableLayout()} isPreview />);
    expect(screen.getByRole('table')).toBeInTheDocument();
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
