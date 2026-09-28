import type { LineSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import type { GraphSettings } from './graphSettings';
import { createSupplyDemandData } from '../transforms/supplyDemand';
import type { SupplyDemandEquilibrium } from '../transforms/supplyDemand';
import type { TabularData } from '../transforms/tabularData';

export type SupplyDemandChartView =
  | { message: string; status: 'empty'; title?: string }
  | {
    equilibrium: SupplyDemandEquilibrium | null;
    insight: string;
    options: EChartsOption;
    points: ReturnType<typeof createSupplyDemandData>['points'];
    series: Array<{ name: string; values: number[] }>;
    status: 'ready';
    summary: string;
    warning?: string;
  };

function formatNumber(value: number): string {
  return String(Number(value.toFixed(6)));
}

export function createSupplyDemandChartView(
  data: TabularData,
  settings: GraphSettings,
): SupplyDemandChartView {
  const mapped = createSupplyDemandData(data, {
    demandColumnId: settings.supplyDemandDemandColumnId,
    supplyColumnId: settings.supplyDemandSupplyColumnId,
    xColumnId: settings.supplyDemandXColumnId,
  });
  if (!mapped.isCompatible) {
    return {
      message: 'Add or map three distinct numeric columns for Quantity, Demand, and Supply.',
      status: 'empty',
      title: 'This data may not be suitable for a supply and demand graph.',
    };
  }
  if (mapped.points.length === 0) {
    return {
      message: 'Add at least one row with valid Quantity, Demand, and Supply values.',
      status: 'empty',
    };
  }

  const demandSeries: LineSeriesOption = {
    data: mapped.points.map((point) => [point.quantity, point.demand]),
    emphasis: { focus: 'series' },
    lineStyle: { width: 3 },
    name: mapped.demandName,
    showSymbol: true,
    symbolSize: 7,
    type: 'line',
  };
  const supplySeries: LineSeriesOption = {
    data: mapped.points.map((point) => [point.quantity, point.supply]),
    emphasis: { focus: 'series' },
    lineStyle: { width: 3 },
    name: mapped.supplyName,
    showSymbol: true,
    symbolSize: 7,
    type: 'line',
  };
  const equilibriumSeries: ScatterSeriesOption | null = mapped.equilibrium && settings.showEquilibrium
    ? {
      data: [[mapped.equilibrium.quantity, mapped.equilibrium.value]],
      itemStyle: { color: '#d97706', borderColor: '#ffffff', borderWidth: 2 },
      label: {
        color: '#92400e',
        formatter: `Equilibrium\nQ ${formatNumber(mapped.equilibrium.quantity)} · ${formatNumber(mapped.equilibrium.value)}`,
        fontSize: 11,
        fontWeight: 'bold',
        position: 'top',
        show: true,
      },
      name: 'Equilibrium',
      symbol: 'diamond',
      symbolSize: 17,
      type: 'scatter',
    }
    : null;
  const warning = mapped.skippedRowCount > 0
    ? `${mapped.skippedRowCount} row${mapped.skippedRowCount === 1 ? ' was' : 's were'} ignored because Quantity, Demand, or Supply was blank or non-numeric.`
    : undefined;
  const insight = mapped.equilibrium
    ? `Equilibrium: quantity ${formatNumber(mapped.equilibrium.quantity)}, value ${formatNumber(mapped.equilibrium.value)}.`
    : 'No equilibrium appears within the supplied quantity range.';

  return {
    equilibrium: mapped.equilibrium,
    insight,
    options: {
      animationDuration: 250,
      aria: { decal: { show: true }, enabled: true },
      color: ['#2563eb', '#e11d48'],
      grid: { bottom: 60, containLabel: true, left: 58, right: 24, top: 60 },
      legend: {
        data: [mapped.demandName, mapped.supplyName],
        itemHeight: 10,
        itemWidth: 20,
        show: true,
        textStyle: { color: '#52627a', fontSize: 12 },
        top: 8,
      },
      series: equilibriumSeries ? [demandSeries, supplySeries, equilibriumSeries] : [demandSeries, supplySeries],
      tooltip: { confine: true, trigger: 'item' },
      xAxis: {
        axisLabel: { color: '#52627a', fontSize: 12, hideOverlap: true },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        name: settings.xAxisTitle || mapped.xName,
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
        name: settings.yAxisTitle || 'Price / Value',
        nameGap: 44,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        scale: true,
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
    },
    points: mapped.points,
    series: [
      { name: mapped.demandName, values: mapped.points.map((point) => point.demand) },
      { name: mapped.supplyName, values: mapped.points.map((point) => point.supply) },
    ],
    status: 'ready',
    summary: `${settings.title.trim() || 'Supply and Demand Graph'}. ${mapped.points.length} quantity points. ${mapped.demandName} and ${mapped.supplyName}. ${insight}`,
    warning,
  };
}
