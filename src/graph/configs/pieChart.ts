import type { PieSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { createPieData } from '../transforms/chartData';
import type { TabularData } from '../transforms/tabularData';

export type PieChartView =
  | { message: string; status: 'empty'; title?: string }
  | { message: string; status: 'invalid' }
  | {
    options: EChartsOption;
    series: Array<{ name: string; values: number[] }>;
    slices: ReturnType<typeof createPieData>['slices'];
    status: 'ready';
    summary: string;
  };

interface PieTooltipItem {
  name?: string;
  percent?: number;
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

function formatPercentage(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

export function formatPieTooltip(input: PieTooltipItem, seriesName: string): string {
  const value = typeof input.value === 'number' ? input.value : Number(input.value);
  const percent = typeof input.percent === 'number' ? input.percent : 0;
  return `${escapeHtml(input.name ?? 'Unnamed slice')}<br/>${escapeHtml(seriesName || 'Value')}: ${escapeHtml(Number.isFinite(value) ? String(value) : '')}<br/>Share: ${formatPercentage(percent)}`;
}

export function createPieChartView(data: TabularData, settings: GraphSettings): PieChartView {
  const pie = createPieData(data, settings.pieSeriesColumnId);
  if (!pie.isCompatible) {
    return {
      message: 'Pie charts need one category column and one numeric value column.',
      status: 'empty',
      title: 'This data isn’t suitable for a pie chart.',
    };
  }
  if (pie.issues.length > 0) return { message: pie.issues[0], status: 'invalid' };
  if (pie.slices.length === 0) {
    return { message: 'Add category labels and numeric values to create a pie chart.', status: 'empty' };
  }

  const showLabels = settings.showValueLabels && pie.slices.length <= 8;
  const series: PieSeriesOption = {
    avoidLabelOverlap: true,
    data: pie.slices.map(({ name, value }) => ({ name, value })),
    emphasis: { scale: true, scaleSize: 6 },
    label: {
      color: '#ffffff',
      fontWeight: 600,
      formatter: '{d}%',
      position: 'inside',
      show: showLabels,
    },
    labelLine: { show: false },
    minAngle: 1,
    name: pie.seriesName || 'Value',
    radius: ['0%', settings.showLegend ? '68%' : '76%'],
    type: 'pie',
  };

  return {
    options: {
      animationDuration: 250,
      aria: { decal: { show: true }, enabled: true },
      color: pie.slices.map((_, index) => settings.seriesColors[index]
        ?? defaultSeriesColors[index % defaultSeriesColors.length]),
      legend: {
        bottom: 0,
        data: pie.slices.map((slice) => slice.name),
        itemHeight: 10,
        itemWidth: 14,
        show: settings.showLegend,
        textStyle: { color: '#52627a', fontSize: 12, overflow: 'truncate', width: 100 },
        type: 'scroll',
      },
      series: [series],
      tooltip: {
        confine: true,
        formatter: (params) => formatPieTooltip(params as PieTooltipItem, pie.seriesName),
        trigger: 'item',
      },
    },
    series: [{ name: pie.seriesName, values: pie.slices.map((slice) => slice.value) }],
    slices: pie.slices,
    status: 'ready',
    summary: `${settings.title.trim() || 'Untitled graph'}. Pie chart with ${pie.slices.length} slices. ${pie.slices.map((slice) => `${slice.name}: ${slice.value}, ${formatPercentage(slice.percentage)}`).join('. ')}`,
  };
}
