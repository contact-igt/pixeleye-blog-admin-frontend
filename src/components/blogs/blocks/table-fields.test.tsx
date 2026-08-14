import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultCustomInstanceContent, type CustomBlockInstanceContent } from '@/types/blog-blocks';
import { TableFields } from './blog-block-editor';

afterEach(() => cleanup());

type TableInstance = Extract<CustomBlockInstanceContent, { componentKey: 'table' }>;

function Harness({ maxRows = 4, maxColumns = 4, initial }: { maxRows?: number; maxColumns?: number; initial?: TableInstance }) {
  const [value, setValue] = useState<TableInstance>(initial ?? (createDefaultCustomInstanceContent('table') as TableInstance));
  return (
    <>
      <TableFields value={value} onChange={setValue} fieldPrefix="blocks_json.custom_instances.table_1" maxRows={maxRows} maxColumns={maxColumns} />
      <output>{JSON.stringify(value)}</output>
    </>
  );
}

describe('TableFields', () => {
  it('generates a safe default within capacity: at least one header and one row', () => {
    render(<Harness />);
    const state = JSON.parse(screen.getByText(/"headers":/).textContent!);
    expect(state.headers.length).toBeGreaterThanOrEqual(1);
    expect(state.rows.length).toBeGreaterThanOrEqual(1);
    expect(state.rows.every((row: string[]) => row.length === state.headers.length)).toBe(true);
  });

  it('adding a column appends an empty header and an empty cell to every existing row', async () => {
    const user = userEvent.setup();
    const initial: TableInstance = { componentKey: 'table', enabled: true, heading: 'H', content: '', headers: ['Feature', 'A'], rows: [['Recovery', '1 day'], ['Pain', 'Low']] };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);

    await user.click(screen.getByRole('button', { name: /Add Column/i }));

    const output = screen.getByText(/"headers":/);
    const state = JSON.parse(output.textContent!);
    expect(state.headers).toEqual(['Feature', 'A', '']);
    expect(state.rows).toEqual([['Recovery', '1 day', ''], ['Pain', 'Low', '']]);
  });

  it('deleting a column removes the same index from every row without disturbing other cells', async () => {
    const user = userEvent.setup();
    const initial: TableInstance = {
      componentKey: 'table', enabled: true, heading: 'H', content: '',
      headers: ['Feature', 'LASIK', 'PRK', 'SMILE'],
      rows: [['Recovery', '1 day', '3 days', '1 day'], ['Pain', 'Low', 'Medium', 'Low']]
    };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);

    await user.click(screen.getByRole('button', { name: 'Delete column 4' }));

    const output = screen.getByText(/"headers":/);
    const state = JSON.parse(output.textContent!);
    expect(state.headers).toEqual(['Feature', 'LASIK', 'PRK']);
    expect(state.rows).toEqual([['Recovery', '1 day', '3 days'], ['Pain', 'Low', 'Medium']]);
  });

  it('cannot delete the last remaining column', async () => {
    const initial: TableInstance = { componentKey: 'table', enabled: true, heading: 'H', content: '', headers: ['Only'], rows: [['1']] };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);
    expect(screen.getByRole('button', { name: 'Delete column 1' })).toBeDisabled();
  });

  it('adding a row creates exactly as many cells as there are headers', async () => {
    const user = userEvent.setup();
    const initial: TableInstance = { componentKey: 'table', enabled: true, heading: 'H', content: '', headers: ['A', 'B', 'C', 'D'], rows: [['1', '2', '3', '4']] };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);

    await user.click(screen.getByRole('button', { name: 'Add Row' }));

    const output = screen.getByText(/"headers":/);
    const state = JSON.parse(output.textContent!);
    expect(state.rows).toHaveLength(2);
    expect(state.rows[1]).toEqual(['', '', '', '']);
  });

  it('deleting a row removes the correct row and keeps others intact', async () => {
    const user = userEvent.setup();
    const initial: TableInstance = {
      componentKey: 'table', enabled: true, heading: 'H', content: '',
      headers: ['Feature', 'Value'],
      rows: [['Recovery', '1 day'], ['Pain', 'Low'], ['Vision', 'Fast']]
    };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);

    await user.click(screen.getAllByRole('button', { name: 'Remove item' })[1]!);

    const output = screen.getByText(/"headers":/);
    const state = JSON.parse(output.textContent!);
    expect(state.rows).toEqual([['Recovery', '1 day'], ['Vision', 'Fast']]);
  });

  it('moves a row up and down while preserving cell content', async () => {
    const user = userEvent.setup();
    const initial: TableInstance = {
      componentKey: 'table', enabled: true, heading: 'H', content: '',
      headers: ['Feature', 'Value'],
      rows: [['Recovery', '1 day'], ['Pain', 'Low']]
    };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);

    expect(screen.getAllByRole('button', { name: 'Move item up' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Move item down' })[1]).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Move item down' })[0]!);

    const output = screen.getByText(/"headers":/);
    const state = JSON.parse(output.textContent!);
    expect(state.rows).toEqual([['Pain', 'Low'], ['Recovery', '1 day']]);
  });

  it('disables Add Column once the template-configured column capacity is reached', () => {
    const initial: TableInstance = { componentKey: 'table', enabled: true, heading: 'H', content: '', headers: ['A', 'B', 'C', 'D'], rows: [['1', '2', '3', '4']] };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);
    expect(screen.getByRole('button', { name: /Add Column/i })).toBeDisabled();
    expect(screen.getByText('4/4 columns')).toBeInTheDocument();
  });

  it('disables Add Row once the template-configured row capacity is reached', () => {
    const initial: TableInstance = {
      componentKey: 'table', enabled: true, heading: 'H', content: '',
      headers: ['A'],
      rows: [['1'], ['2'], ['3'], ['4']]
    };
    render(<Harness initial={initial} maxRows={4} maxColumns={10} />);
    expect(screen.getByRole('button', { name: 'Add Row' })).toBeDisabled();
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });

  it('keeps cell values attached to their correct row and column while editing', async () => {
    const user = userEvent.setup();
    const initial: TableInstance = {
      componentKey: 'table', enabled: true, heading: 'H', content: '',
      headers: ['Feature', 'Value'],
      rows: [['Recovery', ''], ['Pain', '']]
    };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);

    await user.type(screen.getByLabelText('Row 2, Value'), 'Low');

    const output = screen.getByText(/"headers":/);
    const state = JSON.parse(output.textContent!);
    expect(state.rows).toEqual([['Recovery', ''], ['Pain', 'Low']]);
  });

  it('shows a capacity warning when stored data exceeds the current template limits without truncating it', () => {
    const initial: TableInstance = {
      componentKey: 'table', enabled: true, heading: 'H', content: '',
      headers: ['A', 'B', 'C', 'D', 'E'],
      rows: [['1', '2', '3', '4', '5']]
    };
    render(<Harness initial={initial} maxRows={4} maxColumns={4} />);
    expect(screen.getByText(/more rows\/columns than the Custom Template currently allows/)).toBeInTheDocument();
    expect(screen.getByText(/"headers":\["A","B","C","D","E"\]/)).toBeInTheDocument();
  });
});
