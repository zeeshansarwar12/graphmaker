import type { ScatterSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { createDotPlotData } from '../transforms/dotPlot';
import type { TabularData } from '../transforms/tabularData';

export type DotPlotChartView =
  | { message: string; status: 'empty'; title?: string }
  | {
    frequencies: ReturnType<typeof createDotPlotData>['frequencies'];
    options: EChartsOption;
    points: ReturnType<typeof createDotPlotData>['points'];
    series: Array<{ name: string; values: number[] }>;
    status: 'ready';
    summary: string;
    warning?: string;
  };

export function createDotPlotChartView(data: TabularData, settings: GraphSettings): DotPlotChartView {
  const dotPlot = createDotPlotData(data, settings.dotPlotSeriesColumnId);
  if (!dotPlot.isCompatible) {
    const recommendation = dotPlot.recommendedChart
      ? ` Try a ${dotPlot.recommendedChart} chart instead.`
      : '';
    return dotPlot.numericColumnIndexes.length > 0
      ? {
        message: `Dot plots work best with a single numeric series of observations.${recommendation}`,
        status: 'empty',
        title: 'This data may not be suitable for a dot plot.',
      }
      : {
        message: 'Dot plots work best with a single numeric series of observations.',
        status: 'empty',
        title: 'This data may not be suitable for a dot plot.',
      };
  }
  if (dotPlot.points.length === 0) {
    return {
      message: 'Add at least one valid numeric observation to create a dot plot.',
      status: 'empty',
    };
  }

  const seriesName = dotPlot.seriesName || 'Value';
  const maximumFrequency = Math.max(...dotPlot.frequencies.map((item) => item.count));
  const scatterSeries: ScatterSeriesOption = {
    data: dotPlot.points.map((point) => [point.value, point.stack]),
    emphasis: { focus: 'series', scale: 1.35 },
    itemStyle: { color: settings.seriesColors[0] ?? defaultSeriesColors[0] },
    name: seriesName,
    symbolSize: settings.dotSize,
    type: 'scatter',
  };
  const warning = dotPlot.skippedRowCount > 0
    ? `${dotPlot.skippedRowCount} invalid value${dotPlot.skippedRowCount === 1 ? ' was' : 's were'} excluded from the dot plot.`
    : undefined;

  return {
    frequencies: dotPlot.frequencies,
    options: {
      animationDuration: 250,
      aria: { enabled: true },
      grid: { bottom: 58, containLabel: true, left: 58, right: 24, top: 28 },
      series: [scatterSeries],
      tooltip: {
        confine: true,
        formatter: (params) => {
          const value = typeof params === 'object' && params !== null && 'value' in params
            && Array.isArray(params.value) ? Number(params.value[0]) : null;
          const frequency = dotPlot.frequencies.find((item) => item.value === value);
          return frequency ? `${seriesName}: ${frequency.value}<br/>Frequency: ${frequency.count}` : '';
        },
        trigger: 'item',
      },
      xAxis: {
        axisLabel: { color: '#52627a', fontSize: 12, hideOverlap: true },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        name: settings.xAxisTitle || seriesName,
        nameGap: 36,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        scale: true,
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: '#52627a', fontSize: 12 },
        axisLine: { show: false },
        interval: 1,
        max: maximumFrequency,
        min: 0,
        name: settings.yAxisTitle,
        nameGap: 40,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
    },
    points: dotPlot.points,
    series: [{ name: seriesName, values: dotPlot.values }],
    status: 'ready',
    summary: `${settings.title.trim() || `Dot Plot of ${seriesName}`}. Dot plot with ${dotPlot.values.length} observations. ${dotPlot.frequencies.map(({ count, value }) => `${value}: ${count}`).join(', ')}.`,
    warning,
  };
}
