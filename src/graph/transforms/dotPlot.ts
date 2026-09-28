import {
  detectDataShape,
  detectNumericColumnIndexes,
  isClearlyPairedNumericData,
} from './dataInterpretation';
import type { RecommendedChartType } from './dataInterpretation';
import type { TabularData } from './tabularData';

export interface DotPlotPoint {
  stack: number;
  value: number;
}

export interface DotPlotFrequency {
  count: number;
  value: number;
}

export interface DotPlotData {
  frequencies: DotPlotFrequency[];
  isCompatible: boolean;
  numericColumnIndexes: number[];
  points: DotPlotPoint[];
  recommendedChart: RecommendedChartType | null;
  selectedColumnIndex: number | null;
  seriesName: string;
  skippedRowCount: number;
  values: number[];
}

export function createDotPlotSuggestedLabels(
  data: TabularData,
  preferredColumnId?: string | null,
): { title: string; xAxisTitle: string; yAxisTitle: string } | null {
  const numericColumnIndexes = detectNumericColumnIndexes(data);
  const preferredIndex = preferredColumnId
    ? numericColumnIndexes.find((index) => data.columns[index]?.id === preferredColumnId)
    : undefined;
  const selectedColumnIndex = preferredIndex ?? numericColumnIndexes[0] ?? null;
  if (selectedColumnIndex === null) return null;
  const seriesName = data.columns[selectedColumnIndex]?.name.trim() || 'Value';
  return {
    title: `Dot Plot of ${seriesName}`,
    xAxisTitle: seriesName,
    yAxisTitle: 'Frequency',
  };
}

export function createDotPlotData(
  data: TabularData,
  preferredColumnId?: string | null,
): DotPlotData {
  const interpretation = detectDataShape(data);
  const numericColumnIndexes = detectNumericColumnIndexes(data);
  const preferredIndex = preferredColumnId
    ? numericColumnIndexes.find((index) => data.columns[index]?.id === preferredColumnId)
    : undefined;
  const selectedColumnIndex = preferredIndex ?? numericColumnIndexes[0] ?? null;
  const isStructuredSeries = interpretation.shape === 'category-series'
    || interpretation.shape === 'date-series';
  const isPairedRelationship = isClearlyPairedNumericData(data, numericColumnIndexes);
  const isCompatible = selectedColumnIndex !== null && !isStructuredSeries && !isPairedRelationship;
  const values: number[] = [];
  let skippedRowCount = 0;

  if (isCompatible && selectedColumnIndex !== null) {
    data.rows.forEach((row) => {
      if (!row.cells.some((value) => value.trim() !== '')) return;
      const rawValue = row.cells[selectedColumnIndex]?.trim() ?? '';
      if (!rawValue || !Number.isFinite(Number(rawValue))) {
        skippedRowCount += 1;
        return;
      }
      values.push(Number(rawValue));
    });
  }

  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const frequencies = [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([value, count]) => ({ count, value }));
  const points = frequencies.flatMap(({ count, value }) => (
    Array.from({ length: count }, (_, index) => ({ stack: index + 1, value }))
  ));

  return {
    frequencies,
    isCompatible,
    numericColumnIndexes,
    points,
    recommendedChart: isCompatible ? null : interpretation.recommendation,
    selectedColumnIndex,
    seriesName: selectedColumnIndex === null ? '' : data.columns[selectedColumnIndex]?.name.trim() ?? '',
    skippedRowCount,
    values,
  };
}
