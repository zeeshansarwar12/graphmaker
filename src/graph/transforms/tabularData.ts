export type DataColumnKind = 'label' | 'number';

export interface DataColumn {
  id: string;
  kind: DataColumnKind;
  name: string;
}

export interface DataRow {
  cells: string[];
  id: string;
}

export interface TabularData {
  columns: DataColumn[];
  rows: DataRow[];
}

export interface CellIssue {
  columnId: string;
  message: string;
  rowId: string;
}

export type ClipboardParseResult =
  | { ok: true; rows: string[][] }
  | { error: string; ok: false };

const sampleValues = [
  ['Jan', '32'],
  ['Feb', '47'],
  ['Mar', '61'],
  ['Apr', '52'],
];

export function createSampleData(): TabularData {
  return {
    columns: [
      { id: 'column-1', kind: 'label', name: 'Month' },
      { id: 'column-2', kind: 'number', name: 'Sales' },
    ],
    rows: sampleValues.map((cells, index) => ({
      cells: [...cells],
      id: `row-${index + 1}`,
    })),
  };
}

function nextId(items: readonly { id: string }[], prefix: string): string {
  const highestId = items.reduce((highest, item) => {
    const value = Number.parseInt(item.id.replace(`${prefix}-`, ''), 10);
    return Number.isNaN(value) ? highest : Math.max(highest, value);
  }, 0);

  return `${prefix}-${highestId + 1}`;
}

export function updateCell(
  data: TabularData,
  rowId: string,
  columnId: string,
  value: string,
): TabularData {
  const columnIndex = data.columns.findIndex((column) => column.id === columnId);
  if (columnIndex === -1) return data;

  return {
    ...data,
    rows: data.rows.map((row) => row.id === rowId
      ? { ...row, cells: row.cells.map((cell, index) => index === columnIndex ? value : cell) }
      : row),
  };
}

export function renameColumn(data: TabularData, columnId: string, name: string): TabularData {
  return {
    ...data,
    columns: data.columns.map((column) => column.id === columnId ? { ...column, name } : column),
  };
}

export function addRow(data: TabularData): TabularData {
  return {
    ...data,
    rows: [
      ...data.rows,
      {
        cells: data.columns.map(() => ''),
        id: nextId(data.rows, 'row'),
      },
    ],
  };
}

export function removeRow(data: TabularData, rowId: string): TabularData {
  return {
    ...data,
    rows: data.rows.filter((row) => row.id !== rowId),
  };
}

export function addColumn(data: TabularData, name?: string): TabularData {
  const numericColumnCount = data.columns.filter((column) => column.kind === 'number').length;

  return {
    columns: [
      ...data.columns,
      {
        id: nextId(data.columns, 'column'),
        kind: 'number',
        name: name ?? `Series ${numericColumnCount + 1}`,
      },
    ],
    rows: data.rows.map((row) => ({ ...row, cells: [...row.cells, ''] })),
  };
}

export function removeColumn(data: TabularData, columnId: string): TabularData {
  const columnIndex = data.columns.findIndex((column) => column.id === columnId);
  if (columnIndex <= 0) return data;

  return {
    columns: data.columns.filter((column) => column.id !== columnId),
    rows: data.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, index) => index !== columnIndex),
    })),
  };
}

export function clearData(data: TabularData): TabularData {
  return {
    ...data,
    rows: [{ cells: data.columns.map(() => ''), id: nextId(data.rows, 'row') }],
  };
}

export function validateData(data: TabularData): CellIssue[] {
  const issues: CellIssue[] = [];

  data.rows.forEach((row, rowIndex) => {
    data.columns.forEach((column, columnIndex) => {
      const value = row.cells[columnIndex] ?? '';
      if (column.kind === 'number' && value.trim() !== '' && !Number.isFinite(Number(value))) {
        issues.push({
          columnId: column.id,
          message: `${column.name || 'Series'} in row ${rowIndex + 1} must be a number.`,
          rowId: row.id,
        });
      }
    });
  });

  return issues;
}

export function parseClipboardTable(input: string): ClipboardParseResult {
  if (input.trim() === '') return { error: 'The clipboard does not contain tabular data.', ok: false };

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell === '') {
      quoted = true;
    } else if (character === '\t') {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) return { error: 'The pasted table contains an unclosed quoted cell.', ok: false };

  row.push(cell);
  rows.push(row);

  while (rows.length > 1 && rows.at(-1)?.every((value) => value === '')) rows.pop();
  if (rows[0]?.[0]?.startsWith('\uFEFF')) rows[0][0] = rows[0][0].slice(1);

  const columnCount = rows[0]?.length ?? 0;
  const malformedRowIndex = rows.findIndex((values) => values.length !== columnCount);
  if (malformedRowIndex !== -1) {
    return {
      error: `Row ${malformedRowIndex + 1} has ${rows[malformedRowIndex].length} cells; expected ${columnCount}.`,
      ok: false,
    };
  }

  return { ok: true, rows };
}

export function pasteRectangularData(
  data: TabularData,
  values: string[][],
  startRowIndex: number,
  startColumnIndex: number,
): TabularData {
  let nextData = data;
  const requiredColumnCount = startColumnIndex + (values[0]?.length ?? 0);
  const requiredRowCount = startRowIndex + values.length;

  while (nextData.columns.length < requiredColumnCount) nextData = addColumn(nextData);
  while (nextData.rows.length < requiredRowCount) nextData = addRow(nextData);

  return {
    ...nextData,
    rows: nextData.rows.map((row, rowIndex) => {
      if (rowIndex < startRowIndex || rowIndex >= requiredRowCount) return row;

      const pastedRow = values[rowIndex - startRowIndex];
      return {
        ...row,
        cells: row.cells.map((cellValue, columnIndex) => {
          const pastedColumnIndex = columnIndex - startColumnIndex;
          return pastedColumnIndex >= 0 && pastedColumnIndex < pastedRow.length
            ? pastedRow[pastedColumnIndex]
            : cellValue;
        }),
      };
    }),
  };
}

export function rowsHaveHeader(rows: string[][]): boolean {
  if (rows.length < 2 || (rows[0]?.length ?? 0) < 1) return false;

  const firstRow = rows[0];
  const headersAreText = firstRow.every(
    (value) => value.trim() === '' || !Number.isFinite(Number(value)),
  );
  const hasHeaderText = firstRow.some((value) => value.trim() !== '');
  const dataContainsNumericValues = rows.slice(1).some((values) => values.some(
    (value) => value.trim() !== '' && Number.isFinite(Number(value)),
  ));

  return hasHeaderText && headersAreText && dataContainsNumericValues;
}

export function createDataFromRows(rows: string[][]): TabularData {
  const hasHeader = rowsHaveHeader(rows);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const columnCount = rows[0]?.length ?? 0;

  return {
    columns: Array.from({ length: columnCount }, (_, index) => ({
      id: `column-${index + 1}`,
      kind: dataRows.some((values) => values[index]?.trim() !== '')
        && dataRows.filter((values) => values[index]?.trim() !== '').filter((values) => (
          Number.isFinite(Number(values[index]?.trim()))
        )).length / dataRows.filter((values) => values[index]?.trim() !== '').length >= 0.5
        ? 'number'
        : 'label',
      name: hasHeader
        ? rows[0][index].trim() || (index === 0 ? 'Label' : `Series ${index}`)
        : index === 0 ? 'Label' : `Series ${index}`,
    })),
    rows: dataRows.map((cells, index) => ({ cells: [...cells], id: `row-${index + 1}` })),
  };
}

export function createDataFromClipboard(rows: string[][]): TabularData {
  return createDataFromRows(rows);
}
