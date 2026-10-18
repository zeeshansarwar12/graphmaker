import { linearRegression } from '../statistics/regression';
import { cartesianAxis } from './cartesian';
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
    insight?: string;
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

  const regression = settings.showTrendline ? linearRegression(scatter.points) : null;
  const insight = regression ? ('error' in regression ? regression.error : `y = ${Number(regression.slope.toPrecision(6))}x ${regression.intercept < 0 ? '-' : '+'} ${Number(Math.abs(regression.intercept).toPrecision(6))}; R² = ${regression.rSquared === null ? 'undefined (constant Y)' : Number(regression.rSquared.toPrecision(6))}`) : undefined;
  return {
    insight,
    options: {
      animationDuration: scatter.points.length > 500 ? 0 : 250,
      aria: { enabled: true },
      color: [settings.seriesColors[0] ?? defaultSeriesColors[0]],
      grid: { bottom: 58, containLabel: true, left: 58, right: 20, top: 24 },
      series: [scatterSeries, ...(regression && !('error' in regression) ? [{ type: 'line' as const, name: 'Linear trendline', data: regression.points, showSymbol: false, lineStyle: { type: 'dashed' as const }, silent: true }] : [])],
      tooltip: {
        confine: true,
        formatter: (params) => formatScatterTooltip(params as ScatterTooltipItem, xName, yName),
        trigger: 'item',
      },
      xAxis: cartesianAxis(settings.cartesian, 'x', settings.xAxisTitle || xName, settings.showGrid),
      yAxis: cartesianAxis(settings.cartesian, 'y', settings.yAxisTitle || yName, settings.showGrid),
    },
    points: scatter.points,
    series: [{ name: yName, values: scatter.points.map((point) => point[1]) }],
    status: 'ready',
    summary: `${settings.title.trim() || `${yName} by ${xName}`}. Scatter plot with ${scatter.points.length} point${scatter.points.length === 1 ? '' : 's'}. X axis: ${xName}. Y axis: ${yName}.`,
    warning,
  };
}
