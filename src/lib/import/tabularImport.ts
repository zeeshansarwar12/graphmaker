import Papa from 'papaparse';

import { createDataFromRows, rowsHaveHeader } from '../../graph/transforms/tabularData';
import type { TabularData } from '../../graph/transforms/tabularData';

export type TabularImportResult =
  | {
    data: TabularData;
    headerDetected: boolean;
    ok: true;
  }
  | { error: string; ok: false };

type ImportedCell = boolean | Date | number | string | null | undefined;

function cellToString(value: ImportedCell): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function normalizeImportedRows(inputRows: ImportedCell[][]): string[][] {
  const rows = inputRows.map((row) => row.map(cellToString));

  while (rows.length > 0 && rows.at(-1)?.every((value) => value.trim() === '')) rows.pop();
  if (rows[0]?.[0]?.startsWith('\uFEFF')) rows[0][0] = rows[0][0].slice(1);

  const columnCount = rows.reduce((largest, row) => Math.max(largest, row.length), 0);
  return rows.map((row) => Array.from(
    { length: columnCount },
    (_, index) => row[index] ?? '',
  ));
}

export function prepareTabularImport(inputRows: ImportedCell[][], blankMessage: string): TabularImportResult {
  const rows = normalizeImportedRows(inputRows);
  if (rows.length === 0 || rows.every((row) => row.every((value) => value.trim() === ''))) {
    return { error: blankMessage, ok: false };
  }

  return {
    data: createDataFromRows(rows),
    headerDetected: rowsHaveHeader(rows),
    ok: true,
  };
}

export function parseCsvText(input: string): TabularImportResult {
  if (input.trim() === '') {
    return { error: 'This CSV file is blank. Choose a file with at least one row of data.', ok: false };
  }

  const parsed = Papa.parse<string[]>(input, {
    skipEmptyLines: 'greedy',
  });
  const fatalError = parsed.errors.find((error) => error.code !== 'UndetectableDelimiter');
  if (fatalError) {
    const row = typeof fatalError.row === 'number' ? ` near row ${fatalError.row + 1}` : '';
    return { error: `This CSV could not be read${row}: ${fatalError.message}`, ok: false };
  }

  return prepareTabularImport(
    parsed.data,
    'This CSV file is blank. Choose a file with at least one row of data.',
  );
}

export async function parseXlsxBuffer(input: ArrayBuffer): Promise<TabularImportResult> {
  const bytes = new Uint8Array(input);
  const isZipFile = bytes.length >= 4
    && bytes[0] === 0x50
    && bytes[1] === 0x4b
    && bytes[2] === 0x03
    && bytes[3] === 0x04;

  if (!isZipFile) {
    return { error: 'This XLSX file is malformed or is not a supported Excel workbook.', ok: false };
  }

  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(input, { cellDates: true, type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!firstSheet) {
      return { error: 'This Excel workbook is blank. Add data to its first sheet and try again.', ok: false };
    }

    const rows = XLSX.utils.sheet_to_json<ImportedCell[]>(firstSheet, {
      blankrows: false,
      defval: '',
      header: 1,
      raw: false,
    });
    return prepareTabularImport(
      rows,
      'This Excel workbook is blank. Add data to its first sheet and try again.',
    );
  } catch {
    return { error: 'This XLSX file is malformed or could not be read.', ok: false };
  }
}
