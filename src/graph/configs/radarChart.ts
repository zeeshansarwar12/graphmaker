import type { RadarSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors, getVisibleSeriesIndexes } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { detectDataShape } from '../transforms/dataInterpretation';
import type { TabularData } from '../transforms/tabularData';

export interface RadarSeries {
  columnId: string;
  name: string;
  values: number[];
}

export type RadarChartView =
  | { message: string; status: 'empty'; title?: string }
  | { message: string; status: 'invalid' }
  | {
    indicators: Array<{ max: number; min: number; name: string }>;
    isPercentageScale: boolean;
    options: EChartsOption;
    series: RadarSeries[];
    status: 'ready';
    summary: string;
    warning?: string;
  };

function niceCeiling(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = [1, 1.2, 1.5, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate) ?? 10;
  return step * magnitude;
}

function niceFloor(value: number): number {
  return value >= 0 ? 0 : -niceCeiling(Math.abs(value));
}

function incompatibilityMessage(shape: ReturnType<typeof detectDataShape>['shape']): string {
  if (shape === 'date-series') {
    return 'Radar charts compare categories, not dates over time. Use a Line chart for this time-series data.';
  }
  if (shape === 'numeric-xy') {
    return 'Radar charts need metric labels in the first column. Use a Scatter chart for this paired X/Y data.';
  }
  if (shape === 'single-numeric-distribution') {
    return 'Radar charts need metric labels plus one or more numeric series. Use a Histogram for this raw numeric distribution.';
  }
  if (shape === 'multi-numeric-distribution') {
    return 'Radar charts need metric labels in the first column. Use a Box Plot for these raw numeric groups.';
  }
  return 'Radar charts need metric labels in the first column and numeric series in the remaining columns.';
}

export function createRadarChartView(data: TabularData, settings: GraphSettings): RadarChartView {
  const interpretation = detectDataShape(data);
  const firstColumnIsCategory = interpretation.columns[0]?.type === 'text/category';
  if (!firstColumnIsCategory) {
    return {
      message: incompatibilityMessage(interpretation.shape),
      status: 'empty',
      title: 'This data isn’t suitable for a radar chart.',
    };
  }

  const populatedRows = data.rows.filter((row) => row.cells.some((cell) => cell.trim() !== ''));
  if (populatedRows.length < 3) {
    return {
      message: 'Add at least 3 metrics to create a readable radar chart.',
      status: 'empty',
    };
  }

  const seriesColumnIndexes = data.columns.slice(1).map((_, index) => index + 1);
  if (seriesColumnIndexes.length === 0) {
    return { message: 'Add at least one numeric series after the metric column.', status: 'empty' };
  }

  for (let rowIndex = 0; rowIndex < populatedRows.length; rowIndex += 1) {
    const row = populatedRows[rowIndex];
    const metric = row.cells[0]?.trim() ?? '';
    if (!metric) {
      return { message: `Metric in row ${rowIndex + 1} needs a label.`, status: 'invalid' };
    }
    for (const columnIndex of seriesColumnIndexes) {
      const value = row.cells[columnIndex]?.trim() ?? '';
      const seriesName = data.columns[columnIndex]?.name.trim() || `Series ${columnIndex}`;
      if (!value) {
        return { message: `${seriesName} in row ${rowIndex + 1} is missing a value.`, status: 'invalid' };
      }
      if (!Number.isFinite(Number(value))) {
        return { message: `${seriesName} in row ${rowIndex + 1} must be a number.`, status: 'invalid' };
      }
    }
  }

  const allSeries: RadarSeries[] = seriesColumnIndexes.map((columnIndex, index) => ({
    columnId: data.columns[columnIndex].id,
    name: data.columns[columnIndex].name.trim() || `Series ${index + 1}`,
    values: populatedRows.map((row) => Number(row.cells[columnIndex])),
  }));
  const allValues = allSeries.flatMap((item) => item.values);
  const isPercentageScale = allValues.every((value) => value >= 0 && value <= 100);
  const minimum = isPercentageScale ? 0 : niceFloor(Math.min(0, ...allValues));
  const observedMaximum = Math.max(...allValues);
  const maximum = isPercentageScale ? 100 : niceCeiling(observedMaximum > minimum ? observedMaximum : minimum + 1);
  const indicators = populatedRows.map((row) => ({
    max: maximum,
    min: minimum,
    name: row.cells[0].trim(),
  }));
  const seriesColumnIds = allSeries.map((item) => item.columnId);
  const visibleSeriesIndexes = getVisibleSeriesIndexes(settings, seriesColumnIds);
  const visibleSeries = visibleSeriesIndexes.map((index) => allSeries[index]);
  const showLegend = settings.showLegend && allSeries.length > 1;
  const radarSeries: RadarSeriesOption = {
    areaStyle: settings.radarFilled ? { opacity: 0.16 } : { opacity: 0 },
    data: allSeries.map((item) => ({
      name: item.name,
      value: item.values,
    })),
    emphasis: { focus: 'series' },
    label: {
      color: '#10213a',
      fontSize: 11,
      show: settings.showValueLabels,
    },
    lineStyle: { width: 2 },
    symbolSize: 5,
    type: 'radar',
  };

  return {
    indicators,
    isPercentageScale,
    options: {
      animationDuration: 250,
      aria: { decal: { show: showLegend }, enabled: true },
      color: allSeries.map((_, index) => settings.seriesColors[index]
        ?? defaultSeriesColors[index % defaultSeriesColors.length]),
      legend: {
        data: allSeries.map((item) => item.name),
        itemHeight: 10,
        itemWidth: 16,
        selected: Object.fromEntries(allSeries.map((item, index) => [
          item.name,
          visibleSeriesIndexes.includes(index),
        ])),
        show: showLegend,
        textStyle: { color: '#52627a', fontSize: 12 },
        top: 8,
      },
      radar: {
        axisName: { color: '#52627a', fontSize: 12 },
        indicator: indicators,
        radius: showLegend ? '62%' : '70%',
        splitArea: { show: settings.showGrid },
        splitLine: { lineStyle: { color: '#dbe3ee' }, show: settings.showGrid },
      },
      series: [radarSeries],
      tooltip: { confine: true, trigger: 'item' },
    },
    series: visibleSeries,
    status: 'ready',
    summary: `${settings.title.trim() || 'Untitled graph'}. Radar chart with ${indicators.length} metrics and ${visibleSeries.length} series. ${visibleSeries.map((item) => `${item.name}: ${indicators.map((indicator, index) => `${indicator.name} ${item.values[index]}`).join(', ')}`).join('. ')}`,
    warning: indicators.length > 12
      ? 'Radar charts may become hard to read with more than 12 metrics. Consider a Bar chart or reduce the number of metrics.'
      : undefined,
  };
}
