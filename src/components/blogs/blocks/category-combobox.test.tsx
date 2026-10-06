import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryCombobox } from './category-combobox';
import { HeroFields } from './blog-block-editor';

const listBlogCategories = vi.fn();
vi.mock('@/services/blog.service', () => ({ listBlogCategories: () => listBlogCategories() }));

beforeEach(() => {
  listBlogCategories.mockResolvedValue([
    { name: 'Cataract', count: 3 },
    { name: 'Dry Eye', count: 2 },
    { name: 'Glaucoma', count: 1 }
  ]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <><CategoryCombobox value={value} onChange={setValue} /><output>{JSON.stringify(value)}</output></>;
}

describe('CategoryCombobox', () => {
  it('lists existing categories with blog counts when focused', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    expect(await screen.findByRole('option', { name: /Cataract/ })).toHaveTextContent('3 blogs');
    expect(screen.getByRole('option', { name: /Glaucoma/ })).toHaveTextContent('1 blog');
  });

  it('selects an existing category', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: /Dry Eye/ }));
    expect(screen.getByText('"Dry Eye"')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters while typing and offers to create a new category when nothing matches exactly', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Category' });
    await user.click(input);
    await screen.findByRole('option', { name: /Cataract/ });
    await user.type(input, 'cat');
    expect(screen.getByRole('option', { name: /Cataract/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Glaucoma/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Create new category “cat”/ })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'Squint');
    await user.click(screen.getByRole('option', { name: /Create new category “Squint”/ }));
    expect(screen.getByText('"Squint"')).toBeInTheDocument();
  });

  it('does not offer to create a category that already exists (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Category' });
    await user.click(input);
    await screen.findByRole('option', { name: /Cataract/ });
    await user.type(input, 'cataract');
    expect(screen.queryByRole('option', { name: /Create new category/ })).not.toBeInTheDocument();
  });

  it('supports the keyboard: arrows move, Enter picks, Escape closes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Category' });
    await user.click(input);
    await screen.findByRole('option', { name: /Cataract/ });
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(screen.getByText('"Dry Eye"')).toBeInTheDocument();
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('still lets the author type any category when the suggestions cannot be loaded', async () => {
    listBlogCategories.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox', { name: 'Category' }), 'Retina');
    expect(screen.getByText('"Retina"')).toBeInTheDocument();
  });
});

describe('CategoryCombobox with an unexpected response', () => {
  it('ignores a response that is not a list instead of crashing', async () => {
    listBlogCategories.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Category' });
    await user.type(input, 'Squint');
    expect(screen.getByText('"Squint"')).toBeInTheDocument();
  });

  it('drops malformed entries but keeps the valid ones', async () => {
    listBlogCategories.mockResolvedValueOnce([{ name: 'Retina', count: 2 }, { count: 1 }, null, { name: '   ', count: 4 }]);
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    expect(await screen.findByRole('option', { name: /Retina/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });
});

describe('Hero details Category field', () => {
  const baseHero = { category: '', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null };

  it('uses the select-or-type combobox and stores the chosen category on the hero', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<HeroFields value={baseHero} onChange={onChange} fieldPrefix="blocks_json.blocks.hero" />);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: /Glaucoma/ }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Glaucoma' }));
  });
});
