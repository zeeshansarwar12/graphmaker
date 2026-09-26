import type { LineSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors, getVisibleSeriesIndexes } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { createCartesianData, createTimeSeriesData } from '../transforms/chartData';
import { axisLabelInterval } from '../transforms/dataInterpretation';
import {
  dateAxisGranularity,
  formatDateAxisLabel,
  formatTooltipDate,
} from '../transforms/dateTime';
import type { TabularData } from '../transforms/tabularData';
import { validateData } from '../transforms/tabularData';

export type LineChartView =
  | { message: string; status: 'empty' }
  | { message: string; status: 'invalid' }
  | {
    options: EChartsOption;
    series: ReturnType<typeof createCartesianData>['series'];
    status: 'ready';
    summary: string;
  };

interface TimeTooltipItem {
  marker?: string;
  seriesName?: string;
  value?: unknown;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function formatTimeTooltip(input: TimeTooltipItem | TimeTooltipItem[]): string {
  const items = Array.isArray(input) ? input : [input];
  const firstValue = items[0]?.value;
  const timestamp = Array.isArray(firstValue) ? Number(firstValue[0]) : Number.NaN;
  if (!Number.isFinite(timestamp)) return '';

  const lines = items.map((item) => {
    const value = Array.isArray(item.value) ? item.value[1] : null;
    const displayValue = value === null || value === undefined ? 'No value' : String(value);
    return `${item.marker ?? ''}${escapeHtml(item.seriesName ?? 'Series')}: ${escapeHtml(displayValue)}`;
  });
  return `${formatTooltipDate(timestamp)}<br/>${lines.join('<br/>')}`;
}

export function createLineChartView(data: TabularData, settings: GraphSettings): LineChartView {
  const issues = validateData(data);
  if (issues.length > 0) {
    return { message: `${issues[0].message} Fix the highlighted cell to update the graph.`, status: 'invalid' };
  }

  const { categories, interpretation, series } = createCartesianData(data);
  const isTimeSeries = interpretation.shape === 'date-series';
  const timeData = isTimeSeries ? createTimeSeriesData(data, interpretation) : null;
  if (timeData?.invalidDates.length) {
    const invalid = timeData.invalidDates[0];
    const columnName = interpretation.dimensionColumnIndex === null
      ? 'Date'
      : data.columns[interpretation.dimensionColumnIndex]?.name || 'Date';
    return {
      message: `${columnName} in row ${invalid.rowIndex + 1} is not a valid date. Fix it to update the graph.`,
      status: 'invalid',
    };
  }
  const allRenderedSeries = timeData?.series ?? series;
  const seriesColumnIds = interpretation.seriesColumnIndexes.map((index) => data.columns[index].id);
  const visibleSeriesIndexes = getVisibleSeriesIndexes(settings, seriesColumnIds);
  const renderedSeries = visibleSeriesIndexes.map((index) => allRenderedSeries[index]);
  const pointCount = timeData?.timestamps.length ?? categories.length;
  if (pointCount === 0 || renderedSeries.length === 0) {
    return { message: 'Add an X-axis column and at least one numeric series to create a line graph.', status: 'empty' };
  }
  if (!renderedSeries.some((item) => item.values.some((value) => value !== null))) {
    return { message: 'Enter at least one numeric value to create a line graph.', status: 'empty' };
  }

  const showLegend = settings.showLegend && allRenderedSeries.length > 1;
  const lineSeries: LineSeriesOption[] = allRenderedSeries.map((item, seriesIndex) => ({
    connectNulls: false,
    data: isTimeSeries && timeData
      ? timeData.series[seriesIndex].points
      : item.values,
    emphasis: { focus: 'series' },
    label: {
      color: '#10213a',
      fontSize: 12,
      position: 'top',
      show: settings.showValueLabels && pointCount <= 15,
    },
    name: item.name,
    showSymbol: pointCount <= 30,
    symbolSize: 6,
    type: 'line',
  }));
  const interval = axisLabelInterval(categories.length, interpretation.shape === 'date-series');
  const startTimestamp = timeData?.startTimestamp ?? null;
  const endTimestamp = timeData?.endTimestamp ?? null;
  const timestamps = timeData?.timestamps ?? [];
  const granularity = dateAxisGranularity(timestamps);
  const spansMultipleYears = startTimestamp !== null && endTimestamp !== null
    && new Date(startTimestamp).getUTCFullYear() !== new Date(endTimestamp).getUTCFullYear();
  const categoryAxis = {
    axisLabel: {
      color: '#52627a',
      fontSize: 12,
      hideOverlap: true,
      interval,
      overflow: 'truncate' as const,
      rotate: categories.some((category) => category.length > 14) ? 30 : 0,
      width: 96,
    },
    axisLine: { lineStyle: { color: '#94a3b8' } },
    axisTick: { alignWithLabel: true },
    data: categories,
    name: settings.xAxisTitle,
    nameGap: 42,
    nameLocation: 'middle' as const,
    nameTextStyle: { color: '#52627a', fontSize: 12 },
    type: 'category' as const,
  };
  const timeAxis = {
    axisLabel: {
      color: '#52627a',
      fontSize: 12,
      formatter: (value: number) => formatDateAxisLabel(value, granularity, spansMultipleYears),
      hideOverlap: true,
      showMaxLabel: true,
      showMinLabel: true,
    },
    axisLine: { lineStyle: { color: '#94a3b8' } },
    axisTick: { show: true },
    boundaryGap: [0, 0] as [number, number],
    max: endTimestamp ?? undefined,
    min: startTimestamp ?? undefined,
    name: settings.xAxisTitle,
    nameGap: 42,
    nameLocation: 'middle' as const,
    nameTextStyle: { color: '#52627a', fontSize: 12 },
    splitNumber: Math.min(8, Math.max(2, timestamps.length - 1)),
    type: 'time' as const,
  };

  return {
    options: {
      animationDuration: 250,
      aria: { decal: { show: showLegend }, enabled: true },
      color: allRenderedSeries.map((_, seriesIndex) => settings.seriesColors[seriesIndex]
        ?? defaultSeriesColors[seriesIndex % defaultSeriesColors.length]),
      grid: { bottom: 64, containLabel: true, left: 52, right: 20, top: showLegend ? 52 : 26 },
      legend: {
        data: allRenderedSeries.map((item) => item.name),
        itemHeight: 10,
        itemWidth: 16,
        show: showLegend,
        selected: Object.fromEntries(allRenderedSeries.map((item, index) => [
          item.name,
          visibleSeriesIndexes.includes(index),
        ])),
        textStyle: { color: '#52627a', fontSize: 12 },
        top: 8,
      },
      series: lineSeries,
      tooltip: isTimeSeries
        ? {
          confine: true,
          formatter: (params) => formatTimeTooltip(params as TimeTooltipItem | TimeTooltipItem[]),
          trigger: 'axis',
        }
        : { confine: true, trigger: 'axis' },
      xAxis: isTimeSeries ? timeAxis : categoryAxis,
      yAxis: {
        axisLabel: { color: '#52627a', fontSize: 12 },
        axisLine: { show: false },
        name: settings.yAxisTitle,
        nameGap: 40,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
    },
    series: renderedSeries,
    status: 'ready',
    summary: `${settings.title.trim() || 'Untitled graph'}. Line graph with ${pointCount} points and ${renderedSeries.length} series. ${renderedSeries.map((item) => `${item.name}: ${item.values.join(', ')}`).join('. ')}`,
  };
}
