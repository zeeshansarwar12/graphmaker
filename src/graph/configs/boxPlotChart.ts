import type { BoxplotSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors, getVisibleSeriesIndexes } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import {
  createBoxPlotData,
  minimumBoxPlotObservations,
} from '../statistics/boxPlot';
import type { BoxPlotGroup } from '../statistics/boxPlot';
import type { TabularData } from '../transforms/tabularData';

export type BoxPlotChartView =
  | { message: string; status: 'empty'; title?: string }
  | {
    groups: BoxPlotGroup[];
    options: EChartsOption;
    series: Array<{ name: string; values: number[] }>;
    status: 'ready';
    summary: string;
    warning?: string;
  };

export function createBoxPlotChartView(data: TabularData, settings: GraphSettings): BoxPlotChartView {
  const boxPlot = createBoxPlotData(data);
  if (!boxPlot.isCompatible) {
    if (boxPlot.recommendedChart) {
      return {
        message: `Box plots work best with raw numeric observations or grouped numeric columns. Try a ${boxPlot.recommendedChart} chart instead.`,
        status: 'empty',
        title: 'This data may not be suitable for a box plot.',
      };
    }
    return {
      message: 'Add a numeric column of raw observations to create a box plot.',
      status: 'empty',
    };
  }

  const columnIds = boxPlot.groups.map((group) => group.columnId);
  const visibleIndexes = getVisibleSeriesIndexes(settings, columnIds);
  const groups = visibleIndexes.map((index) => boxPlot.groups[index]).filter(Boolean);
  if (groups.length === 0) {
    return {
      message: 'Add a numeric column of raw observations to create a box plot.',
      status: 'empty',
    };
  }

  const isVertical = settings.orientation === 'vertical';
  const colors = groups.map((_, index) => (
    settings.seriesColors[visibleIndexes[index]]
      ?? defaultSeriesColors[visibleIndexes[index] % defaultSeriesColors.length]
  ));
  const boxSeries: BoxplotSeriesOption = {
    data: groups.map((group, index) => ({
      itemStyle: { borderColor: colors[index], color: `${colors[index]}33` },
      value: [
        group.statistics.lowerWhisker,
        group.statistics.q1,
        group.statistics.median,
        group.statistics.q3,
        group.statistics.upperWhisker,
      ],
    })),
    name: 'Distribution',
    type: 'boxplot',
  };
  const outlierData = groups.flatMap((group, groupIndex) => group.statistics.outliers.map(
    (value) => isVertical ? [groupIndex, value] : [value, groupIndex],
  ));
  const outlierSeries: ScatterSeriesOption = {
    data: outlierData,
    itemStyle: { color: '#e11d48' },
    name: 'Outliers',
    symbolSize: 9,
    type: 'scatter',
  };
  const categoryAxis = {
    axisLabel: { color: '#52627a', fontSize: 12, hideOverlap: true },
    axisLine: { lineStyle: { color: '#94a3b8' } },
    data: groups.map((group) => group.name),
    type: 'category' as const,
  };
  const valueAxis = {
    axisLabel: { color: '#52627a', fontSize: 12 },
    axisLine: { show: false },
    splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
    type: 'value' as const,
  };
  const smallGroups = groups.filter((group) => group.values.length < minimumBoxPlotObservations);
  const invalidValueCount = groups.reduce((sum, group) => sum + group.invalidValueCount, 0);
  const warnings = [
    smallGroups.length > 0
      ? `${smallGroups.map((group) => group.name).join(', ')} ${smallGroups.length === 1 ? 'has' : 'have'} fewer than ${minimumBoxPlotObservations} valid observations; quartiles may be unreliable.`
      : '',
    invalidValueCount > 0
      ? `${invalidValueCount} invalid non-numeric value${invalidValueCount === 1 ? ' was' : 's were'} ignored.`
      : '',
  ].filter(Boolean);
  const summary = groups.map((group) => {
    const stats = group.statistics;
    return `${group.name}: minimum ${stats.minimum}, Q1 ${stats.q1}, median ${stats.median}, Q3 ${stats.q3}, maximum ${stats.maximum}, IQR ${stats.interquartileRange}, ${stats.outliers.length} outlier${stats.outliers.length === 1 ? '' : 's'}`;
  }).join('. ');

  return {
    groups,
    options: {
      animationDuration: 250,
      aria: { enabled: true },
      grid: { bottom: 58, containLabel: true, left: 58, right: 24, top: 28 },
      series: settings.showOutliers ? [boxSeries, outlierSeries] : [boxSeries],
      tooltip: { confine: true, trigger: 'item' },
      xAxis: isVertical
        ? { ...categoryAxis, name: settings.xAxisTitle || 'Group', nameGap: 36, nameLocation: 'middle' }
        : { ...valueAxis, name: settings.xAxisTitle || 'Score', nameGap: 38, nameLocation: 'middle' },
      yAxis: isVertical
        ? { ...valueAxis, name: settings.yAxisTitle || 'Score', nameGap: 42, nameLocation: 'middle' }
        : { ...categoryAxis, name: settings.yAxisTitle || 'Group', nameGap: 48, nameLocation: 'middle' },
    },
    series: groups.map((group) => ({ name: group.name, values: group.values })),
    status: 'ready',
    summary: `${settings.title.trim() || (groups.length === 1 ? `Distribution of ${groups[0].name}` : 'Score Distribution by Group')}. Box plot with ${groups.length} group${groups.length === 1 ? '' : 's'}. ${summary}.`,
    warning: warnings.length > 0 ? warnings.join(' ') : undefined,
  };
}
