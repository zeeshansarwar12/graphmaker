import type { ScatterSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { createScatterData } from '../transforms/chartData';
import type { TabularData } from '../transforms/tabularData';

export type ScatterChartView =
  | { message: string; status: 'empty' }
  | {
    options: EChartsOption;
    points: Array<[number, number]>;
    series: Array<{ name: string; values: Array<number | null> }>;
    status: 'ready';
    summary: string;
    warning?: string;
  };

interface ScatterTooltipItem {
  value?: unknown;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}

export function formatScatterTooltip(input: ScatterTooltipItem, xName: string, yName: string): string {
  const value = Array.isArray(input.value) ? input.value : [];
  return `${escapeHtml(xName || 'X')}: ${escapeHtml(String(value[0] ?? ''))}<br/>${escapeHtml(yName || 'Y')}: ${escapeHtml(String(value[1] ?? ''))}`;
}

export function createScatterChartView(data: TabularData, settings: GraphSettings): ScatterChartView {
  const scatter = createScatterData(data, settings.scatterXColumnId, settings.scatterYColumnId);
  if (scatter.xColumnIndex === null || scatter.yColumnIndex === null) {
    return {
      message: 'Scatter requires two numeric columns.',
      status: 'empty',
    };
  }
  if (scatter.points.length === 0) {
    return {
      message: 'Add at least one row with valid X and Y values to create a scatter plot.',
      status: 'empty',
    };
  }

  const xName = scatter.xName || 'X';
  const yName = scatter.yName || 'Y';
  const scatterSeries: ScatterSeriesOption = {
    data: scatter.points,
    emphasis: { focus: 'series', scale: true },
    large: scatter.points.length > 1_000,
    largeThreshold: 1_000,
    name: yName,
    progressive: scatter.points.length > 1_000 ? 2_000 : 0,
    symbolSize: scatter.points.length > 500 ? 4 : scatter.points.length > 100 ? 7 : 11,
    type: 'scatter',
  };
  const warning = scatter.skippedRowCount > 0
    ? `${scatter.skippedRowCount} row${scatter.skippedRowCount === 1 ? ' was' : 's were'} ignored because X or Y was blank or invalid.`
    : undefined;

  return {
    options: {
      animationDuration: scatter.points.length > 500 ? 0 : 250,
      aria: { enabled: true },
      color: [settings.seriesColors[0] ?? defaultSeriesColors[0]],
      grid: { bottom: 58, containLabel: true, left: 58, right: 20, top: 24 },
      series: [scatterSeries],
      tooltip: {
        confine: true,
        formatter: (params) => formatScatterTooltip(params as ScatterTooltipItem, xName, yName),
        trigger: 'item',
      },
      xAxis: {
        axisLabel: { color: '#52627a', fontSize: 12 },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        name: settings.xAxisTitle || xName,
        nameGap: 36,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: '#52627a', fontSize: 12 },
        axisLine: { show: false },
        name: settings.yAxisTitle || yName,
        nameGap: 42,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
    },
    points: scatter.points,
    series: [{ name: yName, values: scatter.points.map((point) => point[1]) }],
    status: 'ready',
    summary: `${settings.title.trim() || `${yName} by ${xName}`}. Scatter plot with ${scatter.points.length} point${scatter.points.length === 1 ? '' : 's'}. X axis: ${xName}. Y axis: ${yName}.`,
    warning,
  };
}
