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
    ...(settings.barLayout === 'stacked' ? { stack: 'total', stackStrategy: 'samesign' as const } : {}),
    data: item.values,
    emphasis: {
      focus: 'series',
    },
    label: {
      color: settings.barLayout === 'stacked' ? '#ffffff' : '#10213a',
      fontSize: 12,
      position: settings.barLayout === 'stacked' ? 'inside' : settings.orientation === 'vertical' ? 'top' : 'right',
      show: settings.showValueLabels && interpretation.pointCount <= 15,
    },
    ...(settings.barLayout === 'stacked' ? { labelLayout: { hideOverlap: true } } : {}),
    name: item.name,
    type: 'bar',
  }));

  const isVertical = settings.orientation === 'vertical';
  const rotatedLabels = isVertical && (categories.length > 12 || categories.some((category) => category.length > 14));
  // Axis names sit outside the label band; containLabel does not reserve this space.
  const categoryNameGap = isVertical ? (rotatedLabels ? 86 : 38) : 156;
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
    axisLabel: { color: '#52627a', fontSize: 12, hideOverlap: true },
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

  const options: EChartsOption = {
    animationDuration: 250,
    aria: {
      decal: { show: showLegend },
      enabled: true,
    },
    color: allSeries.map((_, seriesIndex) => settings.seriesColors[seriesIndex]
      ?? defaultSeriesColors[seriesIndex % defaultSeriesColors.length]),
    grid: {
      bottom: isVertical && rotatedLabels ? 116 : 60,
      containLabel: false,
      left: isVertical ? 64 : (settings.yAxisTitle ? 184 : 152),
      right: 36,
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
    media: [{
      query: { maxWidth: 450 },
      option: {
        grid: {
          left: isVertical ? 58 : (settings.yAxisTitle ? 146 : 118),
          right: 32,
          bottom: isVertical ? (rotatedLabels ? 120 : 62) : 60,
        },
        xAxis: isVertical
          ? { axisLabel: { width: Math.max(28, Math.min(72, 160 / categories.length)), fontSize: 11, lineHeight: 14, overflow: 'break', rotate: 0, hideOverlap: false }, nameGap: rotatedLabels ? 88 : 38 }
          : { splitNumber: 2, axisLabel: { hideOverlap: true, fontSize: 11 } },
        yAxis: isVertical
          ? { splitNumber: 4 }
          : { axisLabel: { width: 102, fontSize: 11, lineHeight: 14, overflow: 'break' }, nameGap: 126 },
      },
    }],
    series: barSeries,
    tooltip: {
      axisPointer: { type: 'shadow' },
      confine: true,
      trigger: 'axis',
    },
    xAxis: isVertical
      ? { ...categoryAxis, ...commonAxisName, name: settings.xAxisTitle, nameGap: categoryNameGap }
      : { ...valueAxis, ...commonAxisName, name: settings.xAxisTitle, nameGap: 34 },
    yAxis: isVertical
      ? { ...valueAxis, ...commonAxisName, name: settings.yAxisTitle, nameGap: 36 }
      : { ...categoryAxis, ...commonAxisName, name: settings.yAxisTitle, nameGap: categoryNameGap },
  };

  const summaryParts = series.map((item) => `${item.name}: ${categories.map(
    (category, index) => `${category || `row ${index + 1}`} ${item.values[index] ?? 'blank'}`,
  ).join(', ')}`);

  return {
    categories,
    options,
    series,
    status: 'ready',
    summary: `${settings.title.trim() || 'Untitled graph'}. ${settings.orientation} ${settings.barLayout === 'stacked' ? 'stacked ' : ''}bar graph with ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} and ${series.length} series. X axis: ${settings.xAxisTitle || 'untitled'}. Y axis: ${settings.yAxisTitle || 'untitled'}. ${summaryParts.join('. ')}`,
  };
}
