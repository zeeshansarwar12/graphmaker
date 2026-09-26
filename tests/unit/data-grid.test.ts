import { describe, expect, it } from 'vitest';

import {
  addColumn,
  addRow,
  clearData,
  createDataFromClipboard,
  createDataFromRows,
  createSampleData,
  parseClipboardTable,
  pasteRectangularData,
  removeColumn,
  removeRow,
  renameColumn,
  updateCell,
  validateData,
} from '../../src/graph/transforms/tabularData';

describe('tabular data editing', () => {
  it('updates a cell without mutating the previous dataset', () => {
    const data = createSampleData();
    const updated = updateCell(data, 'row-1', 'column-2', '40');

    expect(updated.rows[0].cells).toEqual(['Jan', '40']);
    expect(data.rows[0].cells).toEqual(['Jan', '32']);
  });

  it('adds and removes rows while preserving column shape', () => {
    const data = createSampleData();
    const withRow = addRow(data);

    expect(withRow.rows).toHaveLength(5);
    expect(withRow.rows.at(-1)).toEqual({ cells: ['', ''], id: 'row-5' });

    const withoutSecondRow = removeRow(withRow, 'row-2');
    expect(withoutSecondRow.rows.map((row) => row.cells[0])).toEqual(['Jan', 'Mar', 'Apr', '']);
  });

  it('clears sample values but keeps an editable blank row and existing headers', () => {
    const cleared = clearData(createSampleData());

    expect(cleared.columns.map((column) => column.name)).toEqual(['Month', 'Sales']);
    expect(cleared.rows).toEqual([{ cells: ['', ''], id: 'row-5' }]);
  });

  it('adds, renames, and removes numeric series columns', () => {
    const data = createSampleData();
    const withSeries = addColumn(data);

    expect(withSeries.columns.at(-1)).toEqual({
      id: 'column-3',
      kind: 'number',
      name: 'Series 2',
    });
    expect(withSeries.rows.every((row) => row.cells.length === 3 && row.cells[2] === '')).toBe(true);

    const renamed = renameColumn(withSeries, 'column-3', 'Profit');
    expect(renamed.columns[2].name).toBe('Profit');

    const removed = removeColumn(renamed, 'column-2');
    expect(removed.columns.map((column) => column.name)).toEqual(['Month', 'Profit']);
    expect(removed.rows[0].cells).toEqual(['Jan', '']);
  });
});

describe('clipboard table parsing', () => {
  it('parses rectangular data copied from Excel and recognizes headers', () => {
    const result = parseClipboardTable('Month\tSales\r\nJan\t32\r\nFeb\t47\r\n');
    expect(result).toEqual({
      ok: true,
      rows: [
        ['Month', 'Sales'],
        ['Jan', '32'],
        ['Feb', '47'],
      ],
    });

    if (!result.ok) throw new Error('Expected valid clipboard data');
    const data = createDataFromClipboard(result.rows);
    expect(data.columns.map((column) => column.name)).toEqual(['Month', 'Sales']);
    expect(data.rows.map((row) => row.cells)).toEqual([['Jan', '32'], ['Feb', '47']]);
  });

  it('parses Google Sheets rows and preserves empty cells', () => {
    const result = parseClipboardTable('Jan\t32\t\nFeb\t\t18');
    expect(result).toEqual({
      ok: true,
      rows: [
        ['Jan', '32', ''],
        ['Feb', '', '18'],
      ],
    });
  });

  it('rejects malformed non-rectangular clipboard data', () => {
    expect(parseClipboardTable('Jan\t32\nFeb')).toEqual({
      error: 'Row 2 has 1 cells; expected 2.',
      ok: false,
    });
  });

  it('pastes a rectangular selection and expands rows and columns', () => {
    const pasted = pasteRectangularData(
      createSampleData(),
      [['May', '70', '14'], ['Jun', '81', '19']],
      4,
      0,
    );

    expect(pasted.columns).toHaveLength(3);
    expect(pasted.rows).toHaveLength(6);
    expect(pasted.rows[4].cells).toEqual(['May', '70', '14']);
    expect(pasted.rows[5].cells).toEqual(['Jun', '81', '19']);
  });
});

describe('numeric validation', () => {
  it('allows empty numeric cells', () => {
    const data = updateCell(createSampleData(), 'row-1', 'column-2', '');
    expect(validateData(data)).toEqual([]);
  });

  it('reports non-empty invalid numeric values with their location', () => {
    const data = updateCell(createSampleData(), 'row-2', 'column-2', 'forty-seven');
    expect(validateData(data)).toEqual([
      {
        columnId: 'column-2',
        message: 'Sales in row 2 must be a number.',
        rowId: 'row-2',
      },
    ]);
  });

  it('keeps a mostly numeric imported series numeric so invalid cells remain actionable', () => {
    const data = createDataFromRows([
      ['Month', 'Revenue'],
      ['Jan', '10'],
      ['Feb', 'invalid'],
      ['Mar', '30'],
    ]);

    expect(data.columns[1].kind).toBe('number');
    expect(validateData(data)).toEqual([{
      columnId: 'column-2',
      message: 'Revenue in row 2 must be a number.',
      rowId: 'row-2',
    }]);
  });
});
