import type { GraphSettings } from '../configs/graphSettings';
import { parseDateValue } from './dateTime';
import type { TabularData } from './tabularData';

export type DetectedColumnType = 'text/category' | 'number' | 'date/time' | 'empty/mixed';
export type DataShape =
  | 'category-series'
  | 'date-series'
  | 'numeric-xy'
  | 'single-numeric-distribution'
  | 'multi-numeric-distribution'
  | 'unknown';
export type RecommendedChartType = 'Bar' | 'Line' | 'Scatter' | 'Histogram' | 'Box Plot' | 'Pie';

export interface DetectedColumn {
  index: number;
  name: string;
  type: DetectedColumnType;
}

export interface DataInterpretation {
  columns: DetectedColumn[];
  dimensionColumnIndex: number | null;
  mixedScale: boolean;
  pointCount: number;
  recommendation: RecommendedChartType;
  seriesColumnIndexes: number[];
  shape: DataShape;
}

const placeholderHeader = /^(?:column\s*\d*|label|series\s*\d+|value\s*\d+)$/i;
const pairedHeaderPatterns: Array<[RegExp, RegExp]> = [
  [/^x(?:[-_\s]?axis)?$/i, /^y(?:[-_\s]?axis)?$/i],
  [/^height$/i, /^weight$/i],
  [/^(?:longitude|lon)$/i, /^(?:latitude|lat)$/i],
  [/^time$/i, /^(?:distance|position)$/i],
  [/^input$/i, /^output$/i],
];
function isNumber(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

function isDate(value: string): boolean {
  return parseDateValue(value) !== null;
}

export function detectColumnType(values: readonly string[]): DetectedColumnType {
  const populated = values.map((value) => value.trim()).filter(Boolean);
  if (populated.length === 0) return 'empty/mixed';
  if (populated.every(isNumber)) return 'number';
  if (populated.every(isDate)) return 'date/time';
  if (populated.every((value) => !isNumber(value) && !isDate(value))) return 'text/category';
  return 'empty/mixed';
}

function columnValues(data: TabularData, index: number): string[] {
  return data.rows.map((row) => row.cells[index] ?? '');
}

export function detectNumericColumnIndexes(data: TabularData): number[] {
  return data.columns.flatMap((_, index) => {
    const values = columnValues(data, index).filter((value) => value.trim() !== '');
    if (values.length === 0) return [];
    const numericCount = values.filter(isNumber).length;
    return numericCount === values.length || numericCount / values.length >= 0.5 ? [index] : [];
  });
}

export function isClearlyPairedNumericData(
  data: TabularData,
  numericColumnIndexes = detectNumericColumnIndexes(data),
): boolean {
  if (numericColumnIndexes.length !== 2) return false;
  const first = data.columns[numericColumnIndexes[0]]?.name.trim() ?? '';
  const second = data.columns[numericColumnIndexes[1]]?.name.trim() ?? '';
  if (placeholderHeader.test(first) && placeholderHeader.test(second)) return true;
  return pairedHeaderPatterns.some(([firstPattern, secondPattern]) => (
    firstPattern.test(first) && secondPattern.test(second)
  ));
}

function isLikelyMixedDateColumn(data: TabularData, column: DetectedColumn): boolean {
  if (column.type !== 'empty/mixed' || !/date|time|day|month|year/i.test(column.name)) return false;
  const populated = columnValues(data, column.index).filter((value) => value.trim() !== '');
  const validDates = populated.filter(isDate).length;
  return validDates > 0;
}

function hasShareSemantics(data: TabularData, categoryIndex: number, numericIndex: number): boolean {
  const header = data.columns[numericIndex]?.name ?? '';
  if (/percent|percentage|share|proportion|portion|mix/i.test(header)) return true;

  const values = columnValues(data, numericIndex).filter((value) => value.trim() !== '').map(Number);
  if (values.length < 2 || values.length > 12 || values.some((value) => value < 0)) return false;
  const total = values.reduce((sum, value) => sum + value, 0);
  const categories = columnValues(data, categoryIndex).filter((value) => value.trim() !== '');
  return categories.length === values.length && total >= 99 && total <= 101;
}

function typicalMagnitude(values: string[]): number | null {
  const magnitudes = values
    .filter(isNumber)
    .map((value) => Math.abs(Number(value)))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  if (magnitudes.length === 0) return null;
  const middle = Math.floor(magnitudes.length / 2);
  return magnitudes.length % 2 === 0
    ? (magnitudes[middle - 1] + magnitudes[middle]) / 2
    : magnitudes[middle];
}

export function hasMixedSeriesScale(data: TabularData, columnIndexes: readonly number[]): boolean {
  const magnitudes = columnIndexes
    .map((index) => typicalMagnitude(columnValues(data, index)))
    .filter((value): value is number => value !== null);
  return magnitudes.length > 1 && Math.max(...magnitudes) / Math.min(...magnitudes) >= 10;
}

export function detectDataShape(data: TabularData): DataInterpretation {
  const columns = data.columns.map((column, index) => ({
    index,
    name: column.name.trim(),
    type: detectColumnType(columnValues(data, index)),
  }));
  const dateColumn = columns.find((column) => column.type === 'date/time')
    ?? columns.find((column) => isLikelyMixedDateColumn(data, column));
  const categoryColumn = columns.find((column) => column.type === 'text/category');
  const numericColumnIndexes = detectNumericColumnIndexes(data);
  const numericColumns = numericColumnIndexes.map((index) => columns[index]);

  let shape: DataShape = 'unknown';
  let dimensionColumnIndex: number | null = null;
  let seriesColumnIndexes: number[] = [];

  if (dateColumn && numericColumns.length > 0) {
    shape = 'date-series';
    dimensionColumnIndex = dateColumn.index;
    seriesColumnIndexes = numericColumns.map((column) => column.index);
  } else if (categoryColumn && numericColumns.length > 0) {
    shape = 'category-series';
    dimensionColumnIndex = categoryColumn.index;
    seriesColumnIndexes = numericColumns.map((column) => column.index);
  } else if (numericColumns.length === 2 && isClearlyPairedNumericData(data, numericColumnIndexes)) {
    shape = 'numeric-xy';
    dimensionColumnIndex = numericColumns[0].index;
    seriesColumnIndexes = [numericColumns[1].index];
  } else if (numericColumns.length === 1) {
    shape = 'single-numeric-distribution';
    seriesColumnIndexes = [numericColumns[0].index];
  } else if (numericColumns.length >= 2) {
    shape = 'multi-numeric-distribution';
    seriesColumnIndexes = numericColumns.map((column) => column.index);
  }

  const mixedScale = hasMixedSeriesScale(data, seriesColumnIndexes);
  const pointCount = data.rows.filter((row) => row.cells.some((value) => value.trim() !== '')).length;
  let recommendation: RecommendedChartType = 'Bar';
  if (shape === 'date-series') recommendation = 'Line';
  else if (shape === 'numeric-xy') recommendation = 'Scatter';
  else if (shape === 'single-numeric-distribution') recommendation = 'Histogram';
  else if (shape === 'multi-numeric-distribution') recommendation = 'Box Plot';
  else if (
    shape === 'category-series'
    && seriesColumnIndexes.length === 1
    && dimensionColumnIndex !== null
    && pointCount <= 8
    && hasShareSemantics(data, dimensionColumnIndex, seriesColumnIndexes[0])
  ) recommendation = 'Pie';

  return {
    columns,
    dimensionColumnIndex,
    mixedScale,
    pointCount,
    recommendation,
    seriesColumnIndexes,
    shape,
  };
}

function usableHeader(name: string): string | null {
  const trimmed = name.trim();
  return trimmed && !placeholderHeader.test(trimmed) ? trimmed : null;
}

function joinHeaders(headers: string[]): string {
  if (headers.length < 2) return headers[0] ?? '';
  if (headers.length === 2) return `${headers[0]} and ${headers[1]}`;
  return `${headers.slice(0, -1).join(', ')} and ${headers.at(-1)}`;
}

export function createSuggestedLabels(data: TabularData, interpretation = detectDataShape(data)) {
  const dimension = interpretation.dimensionColumnIndex === null
    ? null
    : usableHeader(data.columns[interpretation.dimensionColumnIndex]?.name ?? '');
  const series = interpretation.seriesColumnIndexes
    .map((index) => usableHeader(data.columns[index]?.name ?? ''))
    .filter((name): name is string => name !== null);
  const allSeriesNamed = series.length === interpretation.seriesColumnIndexes.length;
  if (interpretation.shape === 'single-numeric-distribution' && series.length === 1) {
    return {
      title: `Distribution of ${series[0]}`,
      xAxisTitle: series[0],
      yAxisTitle: 'Frequency',
    };
  }
  if (interpretation.shape === 'multi-numeric-distribution' && allSeriesNamed) {
    return {
      title: 'Score Distribution by Group',
      xAxisTitle: 'Group',
      yAxisTitle: 'Score',
    };
  }

  const title = dimension && allSeriesNamed && series.length > 0
    ? `${joinHeaders(series)} by ${dimension}`
    : interpretation.shape === 'numeric-xy' && dimension && series.length === 1
      ? `${series[0]} by ${dimension}`
      : 'Untitled Graph';

  return {
    title,
    xAxisTitle: dimension ?? '',
    yAxisTitle: series.length === 1 ? series[0] : series.length > 1 ? 'Value' : '',
  };
}

export function createAdaptiveSettings(
  data: TabularData,
  current: GraphSettings,
  interpretation = detectDataShape(data),
): GraphSettings {
  return {
    ...current,
    ...createSuggestedLabels(data, interpretation),
    hiddenSeriesIds: [],
    histogramBinCount: null,
    histogramSeriesColumnId: null,
    orientation: 'vertical',
    pieSeriesColumnId: null,
    scatterXColumnId: null,
    scatterYColumnId: null,
    showValueLabels: interpretation.pointCount <= 15,
  };
}

export function axisLabelInterval(pointCount: number, isDateAxis: boolean): number {
  const targetTicks = isDateAxis ? 8 : 12;
  return pointCount > targetTicks ? Math.ceil(pointCount / targetTicks) - 1 : 0;
}
