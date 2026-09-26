import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  parseCsvText,
  parseXlsxBuffer,
} from '../../src/lib/import/tabularImport';

function createWorkbookBuffer(rows: Array<Array<string | number>>): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Data');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

describe('CSV import', () => {
  it('parses a normal CSV and detects its header', () => {
    const result = parseCsvText('Month,Sales\nJan,32\nFeb,47');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a valid CSV');
    expect(result.headerDetected).toBe(true);
    expect(result.data.columns.map((column) => column.name)).toEqual(['Month', 'Sales']);
    expect(result.data.rows.map((row) => row.cells)).toEqual([
      ['Jan', '32'],
      ['Feb', '47'],
    ]);
  });

  it('preserves quoted commas, line breaks, and escaped quotes', () => {
    const result = parseCsvText('Label,Sales\n"North, East",12\n"Multi\nline ""label""",15');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a valid quoted CSV');
    expect(result.data.rows.map((row) => row.cells)).toEqual([
      ['North, East', '12'],
      ['Multi\nline "label"', '15'],
    ]);
  });

  it('pads missing cells instead of dropping their columns', () => {
    const result = parseCsvText('Month,Sales,Profit\nJan,32,8\nFeb,47');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a CSV with missing cells to import');
    expect(result.data.rows[1].cells).toEqual(['Feb', '47', '']);
  });

  it('supports multiple numeric columns', () => {
    const result = parseCsvText('Month,Sales,Profit,Cost\nJan,32,8,19\nFeb,47,12,25');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a multi-series CSV');
    expect(result.data.columns.map((column) => [column.name, column.kind])).toEqual([
      ['Month', 'label'],
      ['Sales', 'number'],
      ['Profit', 'number'],
      ['Cost', 'number'],
    ]);
  });

  it('assigns default headers when the first row is data', () => {
    const result = parseCsvText('Jan,32\nFeb,47');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a headerless CSV');
    expect(result.headerDetected).toBe(false);
    expect(result.data.columns.map((column) => column.name)).toEqual(['Label', 'Series 1']);
    expect(result.data.rows[0].cells).toEqual(['Jan', '32']);
  });

  it('rejects malformed and blank CSV files', () => {
    expect(parseCsvText('Month,Sales\n"Jan,32')).toMatchObject({ ok: false });
    expect(parseCsvText('\n  \n')).toEqual({
      error: 'This CSV file is blank. Choose a file with at least one row of data.',
      ok: false,
    });
  });
});

describe('XLSX import', () => {
  it('reads the first worksheet and preserves missing cells', async () => {
    const result = await parseXlsxBuffer(createWorkbookBuffer([
      ['Month', 'Sales', 'Profit'],
      ['Jan', 32, 8],
      ['Feb', 47],
    ]));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a valid XLSX workbook');
    expect(result.headerDetected).toBe(true);
    expect(result.data.columns.map((column) => column.name)).toEqual(['Month', 'Sales', 'Profit']);
    expect(result.data.rows.map((row) => row.cells)).toEqual([
      ['Jan', '32', '8'],
      ['Feb', '47', ''],
    ]);
  });

  it('rejects malformed and blank workbooks', async () => {
    const malformed = new TextEncoder().encode('not an xlsx file').buffer;
    expect(await parseXlsxBuffer(malformed)).toMatchObject({
      error: 'This XLSX file is malformed or is not a supported Excel workbook.',
      ok: false,
    });

    expect(await parseXlsxBuffer(createWorkbookBuffer([]))).toEqual({
      error: 'This Excel workbook is blank. Add data to its first sheet and try again.',
      ok: false,
    });
  });
});
