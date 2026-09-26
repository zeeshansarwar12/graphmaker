import type { DataInterpretation } from './dataInterpretation';
import { detectDataShape, detectNumericColumnIndexes } from './dataInterpretation';
import { parseDateValue } from './dateTime';
import type { TabularData } from './tabularData';

export interface CartesianSeriesData {
  name: string;
  values: Array<number | null>;
}

export interface CartesianData {
  categories: string[];
  interpretation: DataInterpretation;
  series: CartesianSeriesData[];
}

export interface TimeSeriesData {
  endTimestamp: number | null;
  invalidDates: Array<{ rowIndex: number; value: string }>;
  series: Array<CartesianSeriesData & { points: Array<[number, number | null]> }>;
  startTimestamp: number | null;
  timestamps: number[];
}

export interface ScatterData {
  extraNumericColumnCount: number;
  numericColumnIndexes: number[];
  points: Array<[number, number]>;
  skippedRowCount: number;
  xColumnIndex: number | null;
  xName: string;
  yColumnIndex: number | null;
  yName: string;
}

export interface PieSlice {
  name: string;
  percentage: number;
  value: number;
}

export interface PieData {
  categoryColumnIndex: number | null;
  categoryName: string;
  isCompatible: boolean;
  issues: string[];
  numericColumnIndexes: number[];
  selectedColumnIndex: number | null;
  seriesName: string;
  slices: PieSlice[];
}

export function createCartesianData(data: TabularData): CartesianData {
  const interpretation = detectDataShape(data);
  const populatedRows = data.rows.filter((row) => row.cells.some((value) => value.trim() !== ''));
  const dimensionIndex = interpretation.dimensionColumnIndex;
  const categories = populatedRows.map((row, index) => (
    dimensionIndex === null ? String(index + 1) : row.cells[dimensionIndex] ?? ''
  ));
  const series = interpretation.seriesColumnIndexes.map((columnIndex, seriesIndex) => ({
    name: data.columns[columnIndex]?.name.trim() || `Series ${seriesIndex + 1}`,
    values: populatedRows.map((row) => {
      const value = row.cells[columnIndex]?.trim() ?? '';
      return value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
    }),
  }));

  return { categories, interpretation, series };
}

export function createTimeSeriesData(
  data: TabularData,
  interpretation = detectDataShape(data),
): TimeSeriesData {
  const dimensionIndex = interpretation.dimensionColumnIndex;
  if (dimensionIndex === null) {
    return { endTimestamp: null, invalidDates: [], series: [], startTimestamp: null, timestamps: [] };
  }

  const invalidDates: TimeSeriesData['invalidDates'] = [];
  const datedRows = data.rows.flatMap((row, rowIndex) => {
    const originalDate = row.cells[dimensionIndex]?.trim() ?? '';
    if (!originalDate) return [];
    const timestamp = parseDateValue(originalDate);
    if (timestamp === null) {
      invalidDates.push({ rowIndex, value: originalDate });
      return [];
    }
    return [{ originalIndex: rowIndex, row, timestamp }];
  }).sort((left, right) => left.timestamp - right.timestamp || left.originalIndex - right.originalIndex);

  const timestamps = datedRows.map(({ timestamp }) => timestamp);
  const series = interpretation.seriesColumnIndexes.map((columnIndex, seriesIndex) => {
    const values = datedRows.map(({ row }) => {
      const value = row.cells[columnIndex]?.trim() ?? '';
      return value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
    });
    return {
      name: data.columns[columnIndex]?.name.trim() || `Series ${seriesIndex + 1}`,
      points: datedRows.map(({ timestamp }, index) => [timestamp, values[index]] as [number, number | null]),
      values,
    };
  });

  return {
    endTimestamp: timestamps.at(-1) ?? null,
    invalidDates,
    series,
    startTimestamp: timestamps[0] ?? null,
    timestamps,
  };
}

export function createScatterData(
  data: TabularData,
  preferredXColumnId?: string | null,
  preferredYColumnId?: string | null,
): ScatterData {
  const numericColumnIndexes = detectNumericColumnIndexes(data);
  const preferredXIndex = preferredXColumnId
    ? numericColumnIndexes.find((index) => data.columns[index]?.id === preferredXColumnId)
    : undefined;
  const xColumnIndex = preferredXIndex ?? numericColumnIndexes[0] ?? null;
  const preferredYIndex = preferredYColumnId
    ? numericColumnIndexes.find((index) => (
      index !== xColumnIndex && data.columns[index]?.id === preferredYColumnId
    ))
    : undefined;
  const yColumnIndex = preferredYIndex
    ?? numericColumnIndexes.find((index) => index !== xColumnIndex)
    ?? null;
  const points: Array<[number, number]> = [];
  let skippedRowCount = 0;

  data.rows.forEach((row) => {
    if (!row.cells.some((value) => value.trim() !== '')) return;
    const xValue = xColumnIndex === null ? '' : row.cells[xColumnIndex]?.trim() ?? '';
    const yValue = yColumnIndex === null ? '' : row.cells[yColumnIndex]?.trim() ?? '';
    if (!xValue || !yValue || !Number.isFinite(Number(xValue)) || !Number.isFinite(Number(yValue))) {
      skippedRowCount += 1;
      return;
    }
    points.push([Number(xValue), Number(yValue)]);
  });

  return {
    extraNumericColumnCount: Math.max(0, numericColumnIndexes.length - 2),
    numericColumnIndexes,
    points,
    skippedRowCount,
    xColumnIndex,
    xName: xColumnIndex === null ? '' : data.columns[xColumnIndex].name.trim(),
    yColumnIndex,
    yName: yColumnIndex === null ? '' : data.columns[yColumnIndex].name.trim(),
  };
}

export function createPieData(data: TabularData, preferredColumnId?: string | null): PieData {
  const interpretation = detectDataShape(data);
  const categoryColumn = interpretation.columns.find((column) => column.type === 'text/category');
  const categoryColumnIndex = categoryColumn?.index ?? null;
  const numericColumnIndexes = detectNumericColumnIndexes(data);
  const preferredIndex = preferredColumnId
    ? numericColumnIndexes.find((index) => data.columns[index]?.id === preferredColumnId)
    : undefined;
  const selectedColumnIndex = preferredIndex ?? numericColumnIndexes[0] ?? null;
  const issues: string[] = [];
  const rawSlices: Array<{ name: string; value: number }> = [];

  if (categoryColumnIndex !== null && selectedColumnIndex !== null) {
    data.rows.forEach((row, rowIndex) => {
      if (!row.cells.some((value) => value.trim() !== '')) return;
      const name = row.cells[categoryColumnIndex]?.trim() ?? '';
      const rawValue = row.cells[selectedColumnIndex]?.trim() ?? '';
      if (!name) {
        issues.push(`${categoryColumn?.name || 'Category'} in row ${rowIndex + 1} needs a label.`);
        return;
      }
      if (!rawValue || !Number.isFinite(Number(rawValue))) {
        issues.push(`${data.columns[selectedColumnIndex]?.name || 'Value'} in row ${rowIndex + 1} must be a number.`);
        return;
      }
      const value = Number(rawValue);
      if (value < 0) {
        issues.push(`${data.columns[selectedColumnIndex]?.name || 'Value'} in row ${rowIndex + 1} cannot be negative for a pie chart.`);
        return;
      }
      rawSlices.push({ name, value });
    });
  }

  const total = rawSlices.reduce((sum, slice) => sum + slice.value, 0);
  if (rawSlices.length > 0 && total === 0 && issues.length === 0) {
    issues.push('Pie chart values cannot all be zero. Enter at least one positive value.');
  }

  return {
    categoryColumnIndex,
    categoryName: categoryColumn?.name ?? '',
    isCompatible: categoryColumnIndex !== null && selectedColumnIndex !== null,
    issues,
    numericColumnIndexes,
    selectedColumnIndex,
    seriesName: selectedColumnIndex === null ? '' : data.columns[selectedColumnIndex]?.name.trim() ?? '',
    slices: rawSlices.map((slice) => ({
      ...slice,
      percentage: total > 0 ? slice.value / total * 100 : 0,
    })),
  };
}
