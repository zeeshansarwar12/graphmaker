import type { BarSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import { defaultSeriesColors, getVisibleSeriesIndexes } from './graphSettings';
import type { GraphSettings } from './graphSettings';
import { axisLabelInterval } from '../transforms/dataInterpretation';
import { createCartesianData } from '../transforms/chartData';
import type { TabularData } from '../transforms/tabularData';
import { validateData } from '../transforms/tabularData';

export interface BarChartSeries {
  name: string;
  values: Array<number | null>;
}

export type BarChartView =
  | { message: string; status: 'empty' }
  | { message: string; status: 'invalid' }
  | {
    categories: string[];
    options: EChartsOption;
    series: BarChartSeries[];
    status: 'ready';
    summary: string;
  };

export function createBarChartView(data: TabularData, settings: GraphSettings): BarChartView {
  const issues = validateData(data);
  if (issues.length > 0) {
    return {
      message: `${issues[0].message} Fix the highlighted cell to update the graph.`,
      status: 'invalid',
    };
  }

  const { categories, interpretation, series: allSeries } = createCartesianData(data);
  const seriesColumnIds = interpretation.seriesColumnIndexes.map((index) => data.columns[index].id);
  const visibleSeriesIndexes = getVisibleSeriesIndexes(settings, seriesColumnIds);
  const series = visibleSeriesIndexes.map((index) => allSeries[index]);

  if (series.length === 0 || categories.length === 0) {
    return {
      message: 'Add category labels and at least one numeric series to create a bar graph.',
      status: 'empty',
    };
  }

  if (!series.some((item) => item.values.some((value) => value !== null))) {
    return {
      message: 'Enter at least one numeric value to create a bar graph.',
      status: 'empty',
    };
  }

  const showLegend = settings.showLegend && allSeries.length > 1;
  const barSeries: BarSeriesOption[] = allSeries.map((item) => ({
    barMaxWidth: 64,
    data: item.values,
    emphasis: {
      focus: 'series',
    },
    label: {
      color: '#10213a',
      fontSize: 12,
      position: settings.orientation === 'vertical' ? 'top' : 'right',
      show: settings.showValueLabels && interpretation.pointCount <= 15,
    },
    name: item.name,
    type: 'bar',
  }));

  const categoryAxis = {
    axisLabel: {
      color: '#52627a',
      fontSize: 12,
      hideOverlap: true,
      interval: axisLabelInterval(categories.length, interpretation.shape === 'date-series'),
      overflow: 'truncate' as const,
      rotate: settings.orientation === 'vertical'
        && (categories.length > 12 || categories.some((category) => category.length > 14)) ? 35 : 0,
      width: settings.orientation === 'vertical' ? 88 : 132,
    },
    axisLine: { lineStyle: { color: '#94a3b8' } },
    axisTick: { alignWithLabel: true },
    data: categories,
    inverse: settings.orientation === 'horizontal',
    type: 'category' as const,
  };
  const valueAxis = {
    axisLabel: { color: '#52627a', fontSize: 12 },
    axisLine: { show: false },
    splitLine: {
      lineStyle: { color: '#e2e8f0' },
      show: settings.showGrid,
    },
    type: 'value' as const,
  };
  const commonAxisName = {
    nameLocation: 'middle' as const,
    nameTextStyle: { color: '#52627a', fontSize: 12 },
  };
  const isVertical = settings.orientation === 'vertical';

  const options: EChartsOption = {
    animationDuration: 250,
    aria: {
      decal: { show: showLegend },
      enabled: true,
    },
    color: allSeries.map((_, seriesIndex) => settings.seriesColors[seriesIndex]
      ?? defaultSeriesColors[seriesIndex % defaultSeriesColors.length]),
    grid: {
      bottom: isVertical && (categories.length > 12 || categories.some((category) => category.length > 14)) ? 76 : 56,
      containLabel: true,
      left: isVertical ? 48 : 64,
      right: 16,
      top: showLegend ? 52 : 26,
    },
    legend: {
      data: allSeries.map((item) => item.name),
      itemHeight: 10,
      itemWidth: 16,
      show: showLegend,
      selected: Object.fromEntries(allSeries.map((item, index) => [
        item.name,
        visibleSeriesIndexes.includes(index),
      ])),
      textStyle: {
        color: '#52627a',
        fontSize: 12,
      },
      top: 8,
    },
    series: barSeries,
    tooltip: {
      axisPointer: { type: 'shadow' },
      confine: true,
      trigger: 'axis',
    },
    xAxis: isVertical
      ? { ...categoryAxis, ...commonAxisName, name: settings.xAxisTitle, nameGap: categories.length > 6 ? 50 : 34 }
      : { ...valueAxis, ...commonAxisName, name: settings.xAxisTitle, nameGap: 34 },
    yAxis: isVertical
      ? { ...valueAxis, ...commonAxisName, name: settings.yAxisTitle, nameGap: 36 }
      : { ...categoryAxis, ...commonAxisName, name: settings.yAxisTitle, nameGap: 48 },
  };

  const summaryParts = series.map((item) => `${item.name}: ${categories.map(
    (category, index) => `${category || `row ${index + 1}`} ${item.values[index] ?? 'blank'}`,
  ).join(', ')}`);

  return {
    categories,
    options,
    series,
    status: 'ready',
    summary: `${settings.title.trim() || 'Untitled graph'}. ${settings.orientation} bar graph with ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} and ${series.length} series. X axis: ${settings.xAxisTitle || 'untitled'}. Y axis: ${settings.yAxisTitle || 'untitled'}. ${summaryParts.join('. ')}`,
  };
}
