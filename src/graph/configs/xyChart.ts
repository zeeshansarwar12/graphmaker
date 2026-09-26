import type { LineSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { createScatterData } from '../transforms/chartData';
import type { TabularData } from '../transforms/tabularData';

export type XyChartView =
  | { message: string; status: 'empty' }
  | {
    options: EChartsOption;
    points: Array<[number, number]>;
    series: Array<{ name: string; values: number[] }>;
    status: 'ready';
    summary: string;
    warning?: string;
  };

interface XyTooltipItem {
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

function formatXyTooltip(input: XyTooltipItem, xName: string, yName: string): string {
  const value = Array.isArray(input.value) ? input.value : [];
  return `${escapeHtml(xName || 'X')}: ${escapeHtml(String(value[0] ?? ''))}<br/>${escapeHtml(yName || 'Y')}: ${escapeHtml(String(value[1] ?? ''))}`;
}

export function createXyChartView(data: TabularData, settings: GraphSettings): XyChartView {
  const xy = createScatterData(data);
  if (xy.xColumnIndex === null || xy.yColumnIndex === null) {
    return { message: 'Add two numeric columns to create an XY graph.', status: 'empty' };
  }
  if (xy.points.length === 0) {
    return { message: 'Add at least one row with valid X and Y values to create an XY graph.', status: 'empty' };
  }

  const xName = xy.xName || 'X';
  const yName = xy.yName || 'Y';
  const series: LineSeriesOption | ScatterSeriesOption = settings.xyConnectPoints
    ? {
      connectNulls: false,
      data: xy.points,
      emphasis: { focus: 'series' },
      name: yName,
      showSymbol: true,
      symbolSize: 8,
      type: 'line',
    }
    : {
      data: xy.points,
      emphasis: { focus: 'series', scale: true },
      name: yName,
      symbolSize: 10,
      type: 'scatter',
    };
  const warning = xy.skippedRowCount > 0
    ? `${xy.skippedRowCount} row${xy.skippedRowCount === 1 ? ' was' : 's were'} ignored because X or Y was blank or invalid.`
    : undefined;

  return {
    options: {
      animationDuration: 250,
      aria: { enabled: true },
      color: [settings.seriesColors[0] ?? defaultSeriesColors[0]],
      grid: { bottom: 58, containLabel: true, left: 58, right: 20, top: 24 },
      series: [series],
      tooltip: {
        confine: true,
        formatter: (params) => formatXyTooltip(params as XyTooltipItem, xName, yName),
        trigger: 'item',
      },
      xAxis: {
        axisLabel: { color: '#52627a', fontSize: 12, hideOverlap: true },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        name: settings.xAxisTitle || xName,
        nameGap: 36,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: '#52627a', fontSize: 12, hideOverlap: true },
        axisLine: { show: false },
        name: settings.yAxisTitle || yName,
        nameGap: 42,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
    },
    points: xy.points,
    series: [{ name: yName, values: xy.points.map((point) => point[1]) }],
    status: 'ready',
    summary: `${settings.title.trim() || `${yName} by ${xName}`}. XY graph with ${xy.points.length} point${xy.points.length === 1 ? '' : 's'} ${settings.xyConnectPoints ? 'connected in data order' : 'shown as unconnected points'}. X axis: ${xName}. Y axis: ${yName}.`,
    warning,
  };
}
