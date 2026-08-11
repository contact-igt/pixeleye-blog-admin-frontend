import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreateBlogPage from './page';

vi.mock('@/components/blogs/blog-form', () => ({
  BlogForm: ({ initialTemplateKey }: { initialTemplateKey?: string }) => (
    <div data-testid="blog-form" data-template={initialTemplateKey} />
  )
}));

describe('Blog Create template query', () => {
  it('preselects template_1', async () => {
    render(await CreateBlogPage({ searchParams: Promise.resolve({ template: 'template_1' }) }));
    expect(screen.getByTestId('blog-form')).toHaveAttribute('data-template', 'template_1');
  });

  it('preselects template_2', async () => {
    render(await CreateBlogPage({ searchParams: Promise.resolve({ template: 'template_2' }) }));
    expect(screen.getByTestId('blog-form')).toHaveAttribute('data-template', 'template_2');
  });

  it('falls back safely for invalid or repeated values', async () => {
    const { rerender } = render(await CreateBlogPage({ searchParams: Promise.resolve({ template: 'unsafe' }) }));
    expect(screen.getByTestId('blog-form')).toHaveAttribute('data-template', 'template_1');

    rerender(await CreateBlogPage({ searchParams: Promise.resolve({ template: undefined }) }));
    expect(screen.getByTestId('blog-form')).toHaveAttribute('data-template', 'template_1');

    rerender(await CreateBlogPage({ searchParams: Promise.resolve({ template: ['template_2', 'template_1'] }) }));
    expect(screen.getByTestId('blog-form')).toHaveAttribute('data-template', 'template_2');
  });
});

