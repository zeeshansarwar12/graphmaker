import { detectColumnType, isClearlyPairedNumericData } from '../transforms/dataInterpretation';
import type { TabularData } from '../transforms/tabularData';

export const minimumBoxPlotObservations = 5;

export interface BoxPlotStatistics {
  interquartileRange: number;
  lowerWhisker: number;
  maximum: number;
  median: number;
  minimum: number;
  outliers: number[];
  q1: number;
  q3: number;
  upperWhisker: number;
}

export interface BoxPlotGroup {
  columnId: string;
  columnIndex: number;
  invalidValueCount: number;
  name: string;
  statistics: BoxPlotStatistics;
  values: number[];
}

export interface BoxPlotData {
  groups: BoxPlotGroup[];
  isCompatible: boolean;
  recommendedChart: 'Bar' | 'Line' | 'Scatter' | null;
}

function medianOfSorted(values: readonly number[]): number {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[middle - 1] + values[middle]) / 2
    : values[middle];
}

/**
 * Uses the median-of-halves (exclusive median) quartile method: sort the sample,
 * find the median, then find Q1/Q3 from the lower/upper halves. For odd sample
 * sizes the overall median is excluded from both halves.
 */
export function calculateBoxPlotStatistics(input: readonly number[]): BoxPlotStatistics | null {
  const values = input.filter(Number.isFinite).slice().sort((left, right) => left - right);
  if (values.length === 0) return null;

  const middle = Math.floor(values.length / 2);
  const lowerHalf = values.slice(0, middle);
  const upperHalf = values.slice(values.length % 2 === 0 ? middle : middle + 1);
  const median = medianOfSorted(values);
  const q1 = lowerHalf.length > 0 ? medianOfSorted(lowerHalf) : median;
  const q3 = upperHalf.length > 0 ? medianOfSorted(upperHalf) : median;
  const interquartileRange = q3 - q1;
  const lowerFence = q1 - 1.5 * interquartileRange;
  const upperFence = q3 + 1.5 * interquartileRange;
  const inliers = values.filter((value) => value >= lowerFence && value <= upperFence);

  return {
    interquartileRange,
    lowerWhisker: inliers[0] ?? values[0],
    maximum: values.at(-1) ?? values[0],
    median,
    minimum: values[0],
    outliers: values.filter((value) => value < lowerFence || value > upperFence),
    q1,
    q3,
    upperWhisker: inliers.at(-1) ?? values.at(-1) ?? values[0],
  };
}

function populatedColumnValues(data: TabularData, columnIndex: number): string[] {
  return data.rows
    .map((row) => row.cells[columnIndex]?.trim() ?? '')
    .filter(Boolean);
}

export function createBoxPlotData(data: TabularData): BoxPlotData {
  const columnTypes = data.columns.map((_, index) => detectColumnType(
    data.rows.map((row) => row.cells[index] ?? ''),
  ));
  const numericColumnIndexes = data.columns.flatMap((_, columnIndex) => (
    populatedColumnValues(data, columnIndex).some((value) => Number.isFinite(Number(value)))
      ? [columnIndex]
      : []
  ));
  const hasDateDimension = columnTypes.includes('date/time');
  const hasCategoryDimension = columnTypes.includes('text/category');
  const clearlyPaired = isClearlyPairedNumericData(data, numericColumnIndexes);
  const recommendedChart = hasDateDimension
    ? 'Line'
    : hasCategoryDimension
      ? 'Bar'
      : clearlyPaired ? 'Scatter' : null;
  const isCompatible = numericColumnIndexes.length > 0
    && !hasDateDimension
    && !hasCategoryDimension
    && !clearlyPaired;

  const groups = isCompatible ? numericColumnIndexes.flatMap((columnIndex, groupIndex) => {
    const populated = populatedColumnValues(data, columnIndex);
    const values = populated
      .filter((value) => Number.isFinite(Number(value)))
      .map(Number);
    const statistics = calculateBoxPlotStatistics(values);
    if (!statistics) return [];
    return [{
      columnId: data.columns[columnIndex].id,
      columnIndex,
      invalidValueCount: populated.length - values.length,
      name: data.columns[columnIndex].name.trim() || `Group ${groupIndex + 1}`,
      statistics,
      values,
    }];
  }) : [];

  return { groups, isCompatible, recommendedChart };
}

export function createBoxPlotSuggestedLabels(data: TabularData) {
  const boxPlot = createBoxPlotData(data);
  if (!boxPlot.isCompatible || boxPlot.groups.length === 0) return null;
  if (boxPlot.groups.length === 1) {
    return {
      title: `Distribution of ${boxPlot.groups[0].name}`,
      xAxisTitle: '',
      yAxisTitle: boxPlot.groups[0].name,
    };
  }
  return {
    title: 'Score Distribution by Group',
    xAxisTitle: 'Group',
    yAxisTitle: 'Score',
  };
}
