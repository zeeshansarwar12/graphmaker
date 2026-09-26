import {
  detectDataShape,
  detectNumericColumnIndexes,
  isClearlyPairedNumericData,
} from './dataInterpretation';
import type { TabularData } from './tabularData';

export interface HistogramBin {
  count: number;
  label: string;
  lowerBound: number;
  upperBound: number;
}

export interface HistogramData {
  bins: HistogramBin[];
  binCount: number;
  isCompatible: boolean;
  numericColumnIndexes: number[];
  selectedColumnIndex: number | null;
  seriesName: string;
  skippedRowCount: number;
  values: number[];
}

function formatBoundary(value: number, binWidth: number): string {
  if (Number.isInteger(value)) return String(value);
  const decimals = binWidth >= 1 ? 2 : Math.min(6, Math.max(2, Math.ceil(-Math.log10(binWidth)) + 1));
  return String(Number(value.toFixed(decimals)));
}

export function automaticHistogramBinCount(sampleSize: number): number {
  if (sampleSize <= 1) return 1;
  return Math.min(30, Math.max(2, Math.ceil(Math.log2(sampleSize) + 1)));
}

export function createHistogramBins(values: readonly number[], requestedBinCount?: number | null): HistogramBin[] {
  if (values.length === 0) return [];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) {
    return [{ count: values.length, label: String(minimum), lowerBound: minimum, upperBound: maximum }];
  }

  const binCount = requestedBinCount === null || requestedBinCount === undefined
    ? automaticHistogramBinCount(values.length)
    : Math.min(50, Math.max(1, Math.round(requestedBinCount)));
  const binWidth = (maximum - minimum) / binCount;
  const counts = Array.from({ length: binCount }, () => 0);
  values.forEach((value) => {
    const index = value === maximum
      ? binCount - 1
      : Math.min(binCount - 1, Math.floor((value - minimum) / binWidth));
    counts[index] += 1;
  });

  return counts.map((count, index) => {
    const lowerBound = minimum + index * binWidth;
    const upperBound = index === binCount - 1 ? maximum : minimum + (index + 1) * binWidth;
    return {
      count,
      label: `${formatBoundary(lowerBound, binWidth)}–${formatBoundary(upperBound, binWidth)}`,
      lowerBound,
      upperBound,
    };
  });
}

export function createHistogramData(
  data: TabularData,
  preferredColumnId?: string | null,
  requestedBinCount?: number | null,
): HistogramData {
  const interpretation = detectDataShape(data);
  const numericColumnIndexes = detectNumericColumnIndexes(data);
  const preferredIndex = preferredColumnId
    ? numericColumnIndexes.find((index) => data.columns[index]?.id === preferredColumnId)
    : undefined;
  const selectedColumnIndex = preferredIndex ?? numericColumnIndexes[0] ?? null;
  const isStructuredSeries = interpretation.shape === 'category-series'
    || interpretation.shape === 'date-series';
  const isCompatible = selectedColumnIndex !== null
    && !isStructuredSeries
    && !isClearlyPairedNumericData(data, numericColumnIndexes);
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

  const bins = createHistogramBins(values, requestedBinCount);
  return {
    bins,
    binCount: bins.length,
    isCompatible,
    numericColumnIndexes,
    selectedColumnIndex,
    seriesName: selectedColumnIndex === null ? '' : data.columns[selectedColumnIndex]?.name.trim() ?? '',
    skippedRowCount,
    values,
  };
}
