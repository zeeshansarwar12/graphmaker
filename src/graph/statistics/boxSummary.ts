import { calculateBoxPlotStatistics, createBoxPlotData } from './boxPlot';
import type { BoxPlotGroup } from './boxPlot';
import type { TabularData } from '../transforms/tabularData';
import type { TabularImportResult } from '../../lib/import/tabularImport';

export const boxSummaryHeaders = ['Group', 'Minimum', 'Q1', 'Median', 'Q3', 'Maximum'];
const columnAliases = [
  ['group', 'group name', 'name', 'label'],
  ['minimum', 'min'], ['q1', 'lower quartile', 'first quartile'],
  ['median', 'q2'], ['q3', 'upper quartile', 'third quartile'], ['maximum', 'max'],
];

export const boxSummaryExample = {
  name: 'Class C scores',
  observations: [21, 12, 18, 58, 13, 16, 14],
};

export function boxSummaryTable(rows: string[][] = [boxSummaryHeaders.map(() => '')]): TabularData {
  return {
    columns: boxSummaryHeaders.map((name, index) => ({
      id: `column-${index + 1}`, name, kind: index === 0 ? 'label' : 'number',
    })),
    rows: rows.map((cells, index) => ({ id: `row-${index + 1}`, cells })),
  };
}

function statisticsRow(name: string, stats: NonNullable<ReturnType<typeof calculateBoxPlotStatistics>>) {
  return [name, stats.minimum, stats.q1, stats.median, stats.q3, stats.maximum].map(String);
}

export function createBoxSummaryExample() {
  const stats = calculateBoxPlotStatistics(boxSummaryExample.observations);
  if (!stats) throw new Error('The box summary example needs observations.');
  return boxSummaryTable([statisticsRow(boxSummaryExample.name, stats)]);
}

export function boxSummaryFromRaw(data: TabularData): TabularData | null {
  const { groups } = createBoxPlotData(data);
  return groups.length ? boxSummaryTable(groups.map(({ name, statistics }) => statisticsRow(name, statistics))) : null;
}

export function boxSummaryHeaderIndexes(row: string[]) {
  return row.map(cell => {
    const name = cell.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    return columnAliases.findIndex(aliases => aliases.includes(name));
  });
}

export function prepareBoxSummaryImport(rows: string[][]): TabularImportResult {
  const header = boxSummaryHeaderIndexes(rows[0] ?? []);
  const headerDetected = header.filter(index => index >= 0).length >= 2;
  const indexes = headerDetected ? boxSummaryHeaders.map((_, index) => header.indexOf(index)) : boxSummaryHeaders.map((_, index) => index);
  if (headerDetected && (indexes.some(index => index < 0) || header.filter(index => index >= 0).length !== indexes.length)) {
    return { ok: false, error: 'Include exactly one header for each field: Group, Minimum, Q1, Median, Q3 and Maximum.' };
  }
  if (!headerDetected && header.length !== boxSummaryHeaders.length) {
    return { ok: false, error: 'Enter six columns: Group, Minimum, Q1, Median, Q3 and Maximum.' };
  }
  const dataRows = headerDetected ? rows.slice(1) : rows;
  if (!dataRows.length) return { ok: false, error: 'Add at least one group below the headers.' };
  return { ok: true, headerDetected, data: boxSummaryTable(dataRows.map(row => indexes.map(index => row[index] ?? ''))) };
}

export function validateBoxSummary(data: TabularData) {
  const groups: BoxPlotGroup[] = [];
  const errors = new Map<string, string[]>();
  const names = new Map<string, number>();
  data.rows.forEach(({ cells }) => {
    const name = (cells[0] ?? '').trim().toLowerCase();
    names.set(name, (names.get(name) ?? 0) + 1);
  });

  data.rows.forEach(({ id, cells }, index) => {
    if (cells.every(cell => !cell.trim())) return;
    const name = (cells[0] ?? '').trim();
    const label = name ? `${name} (row ${index + 1})` : `Row ${index + 1}`;
    const problems: string[] = [];
    if (!name) problems.push(`${label}: enter a group name.`);
    else if ((names.get(name.toLowerCase()) ?? 0) > 1) problems.push(`${label}: group names must be unique.`);
    const values = boxSummaryHeaders.slice(1).map((_, field) => {
      const value = cells[field + 1]?.trim();
      return value ? Number(value) : NaN;
    });
    const invalid = boxSummaryHeaders.slice(1).filter((_, field) => !Number.isFinite(values[field]));
    if (invalid.length) problems.push(`${label}: enter finite numbers for ${invalid.join(', ')}.`);
    else if (values.some((value, field) => field > 0 && value < values[field - 1])) {
      problems.push(`${label}: use Minimum ≤ Q1 ≤ Median ≤ Q3 ≤ Maximum.`);
    }
    if (problems.length) {
      errors.set(id, problems);
      return;
    }

    const [minimum, q1, median, q3, maximum] = values;
    groups.push({
      columnId: id, columnIndex: index, invalidValueCount: 0, name, values,
      statistics: {
        minimum, q1, median, q3, maximum, lowerWhisker: minimum, upperWhisker: maximum,
        interquartileRange: q3 - q1, outliers: [],
      },
    });
  });

  return { groups, errors };
}
