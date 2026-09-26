import type { BarSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { createHistogramData } from '../transforms/histogram';
import type { TabularData } from '../transforms/tabularData';

export type HistogramChartView =
  | { message: string; status: 'empty'; title?: string }
  | {
    bins: ReturnType<typeof createHistogramData>['bins'];
    options: EChartsOption;
    series: Array<{ name: string; values: number[] }>;
    status: 'ready';
    summary: string;
    warning?: string;
  };

export function createHistogramChartView(data: TabularData, settings: GraphSettings): HistogramChartView {
  const histogram = createHistogramData(
    data,
    settings.histogramSeriesColumnId,
    settings.histogramBinCount,
  );
  if (!histogram.isCompatible) {
    return histogram.numericColumnIndexes.length > 0
      ? {
        message: 'Histograms work best with raw numeric observations.',
        status: 'empty',
        title: 'This data may not be suitable for a histogram.',
      }
      : {
        message: 'Add a numeric column of raw observations to create a histogram.',
        status: 'empty',
      };
  }
  if (histogram.values.length === 0 || histogram.bins.length === 0) {
    return {
      message: 'Add at least one valid numeric observation to create a histogram.',
      status: 'empty',
    };
  }

  const seriesName = histogram.seriesName || 'Observations';
  const counts = histogram.bins.map((bin) => bin.count);
  const histogramSeries: BarSeriesOption = {
    barCategoryGap: '0%',
    barGap: '0%',
    data: counts,
    emphasis: { focus: 'series' },
    itemStyle: { borderColor: '#ffffff', borderWidth: 1 },
    label: {
      color: '#10213a',
      position: 'top',
      show: settings.showValueLabels && histogram.bins.length <= 15,
    },
    name: seriesName,
    type: 'bar',
  };
  const warning = histogram.skippedRowCount > 0
    ? `${histogram.skippedRowCount} row${histogram.skippedRowCount === 1 ? ' was' : 's were'} excluded because the selected histogram value was blank or invalid.`
    : undefined;

  return {
    bins: histogram.bins,
    options: {
      animationDuration: 250,
      aria: { enabled: true },
      color: [settings.seriesColors[0] ?? defaultSeriesColors[0]],
      grid: { bottom: 64, containLabel: true, left: 52, right: 20, top: 28 },
      series: [histogramSeries],
      tooltip: {
        axisPointer: { type: 'shadow' },
        confine: true,
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const index = typeof item === 'object' && item !== null && 'dataIndex' in item
            ? Number(item.dataIndex)
            : -1;
          const bin = histogram.bins[index];
          return bin ? `Range: ${bin.label}<br/>Frequency: ${bin.count}` : '';
        },
        trigger: 'axis',
      },
      xAxis: {
        axisLabel: {
          color: '#52627a',
          fontSize: 12,
          hideOverlap: true,
          interval: 0,
          rotate: histogram.bins.length > 8 ? 30 : 0,
        },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisTick: { alignWithLabel: true },
        data: histogram.bins.map((bin) => bin.label),
        name: settings.xAxisTitle || seriesName,
        nameGap: histogram.bins.length > 8 ? 52 : 38,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        type: 'category',
      },
      yAxis: {
        axisLabel: { color: '#52627a', fontSize: 12 },
        axisLine: { show: false },
        minInterval: 1,
        name: settings.yAxisTitle || 'Frequency',
        nameGap: 38,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
    },
    series: [{ name: seriesName, values: counts }],
    status: 'ready',
    summary: `${settings.title.trim() || `Distribution of ${seriesName}`}. Histogram of ${seriesName} with ${histogram.values.length} observations in ${histogram.binCount} bin${histogram.binCount === 1 ? '' : 's'}. ${histogram.bins.map((bin) => `${bin.label}: ${bin.count}`).join(', ')}.`,
    warning,
  };
}
