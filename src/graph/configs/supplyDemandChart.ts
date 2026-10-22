import { createSupplyDemandModel } from '../transforms/supplyDemandModel';
import type { LineSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import type { EChartsOption } from 'echarts';

import type { GraphSettings } from './graphSettings';
import { createSupplyDemandData } from '../transforms/supplyDemand';
import type { SupplyDemandEquilibrium } from '../transforms/supplyDemand';
import type { TabularData } from '../transforms/tabularData';

export type SupplyDemandChartView =
  | { message: string; status: 'empty'; title?: string }
  | {
    canvasHeight: number;
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
  return value.toFixed(2);
}

export function createSupplyDemandChartView(
  data: TabularData,
  settings: GraphSettings,
): SupplyDemandChartView {
  const model = createSupplyDemandModel(data, settings);
  const mapped = { ...model.mapped, equilibrium: model.equilibrium };
  const originalVisible = model.shifted && (settings.supplyDemandShowOriginal ?? true);
  const mono = settings.supplyDemandMonochrome ?? false;
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
    data: model.shiftedDemand,
    emphasis: { focus: 'series' },
    lineStyle: { width: 3 },
    name: 'Demand',
    itemStyle: { color: mono ? '#10213a' : '#2563eb' },
    showSymbol: false,
    symbolSize: 7,
    type: 'line',
  };
  const supplySeries: LineSeriesOption = {
    data: model.shiftedSupply,
    emphasis: { focus: 'series' },
    lineStyle: { width: 3, type: mono ? 'dashed' : 'solid' },
    name: 'Supply',
    itemStyle: { color: mono ? '#10213a' : '#e11d48' },
    showSymbol: false,
    symbolSize: 7,
    type: 'line',
  };
  const equilibriumSeries: ScatterSeriesOption | null = mapped.equilibrium && settings.showEquilibrium
    ? {
      data: [[mapped.equilibrium.quantity, mapped.equilibrium.value]],
      itemStyle: { color: mono ? '#10213a' : '#d97706', borderColor: '#ffffff', borderWidth: 2 },
      label: {
        color: mono ? '#10213a' : '#92400e',
        formatter: model.shifted ? 'E₂' : 'E',
        fontSize: 11,
        fontWeight: 'bold',
        position: 'right',
        distance: 9,
        show: true,
      },
      markLine: { silent: true, symbol: ['none','none'], label: { show: false }, lineStyle: { color:'#94a3b8',type:'dashed' }, data: [ {xAxis: mapped.equilibrium.quantity}, {yAxis: mapped.equilibrium.value} ] },
      labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
      name: 'Equilibrium',
      symbol: 'diamond',
      symbolSize: 17,
      type: 'scatter',
    }
    : null;
  const warning = model.limited ? 'Only the first 300 valid rows are plotted. Reduce the dataset to compare the full range.' : mapped.skippedRowCount > 0
    ? `${mapped.skippedRowCount} row${mapped.skippedRowCount === 1 ? ' was' : 's were'} ignored because Quantity, Demand, or Supply was blank or non-numeric.`
    : undefined;
  const insight = mapped.equilibrium
    ? `${model.shifted ? 'New equilibrium' : 'Equilibrium'}: quantity ${formatNumber(mapped.equilibrium.quantity)}, price ${formatNumber(mapped.equilibrium.value)}.`
    : 'No equilibrium appears within the supplied quantity range.';
  const comparison = originalVisible && model.original ? ` Original equilibrium: quantity ${formatNumber(model.original.quantity)}, price ${formatNumber(model.original.value)}.` : '';
  const originals: LineSeriesOption[] = [];
  if(originalVisible && (settings.supplyDemandDemandShift??0)!==0) originals.push({type:'line',name:'Original demand',data:model.demand,showSymbol:false,lineStyle:{type:'dashed',opacity:0.5,width:2},itemStyle:{color:mono?'#64748b':'#2563eb'}});
  if(originalVisible && (settings.supplyDemandSupplyShift??0)!==0) originals.push({type:'line',name:'Original supply',data:model.supply,showSymbol:false,lineStyle:{type:'dotted',opacity:0.5,width:2},itemStyle:{color:mono?'#64748b':'#e11d48'}});
  const originalPoint: ScatterSeriesOption[] = originalVisible && settings.showEquilibrium && model.original ? [{type:'scatter',name:'Original equilibrium',labelLayout:{hideOverlap:true,moveOverlap:'shiftY'},data:[[model.original.quantity,model.original.value]],symbolSize:10,itemStyle:{color:'#64748b'},label:{show:true,formatter:'E₁',position:'left',distance:9,color:'#52627a'}}] : [];

  return {
    canvasHeight: 360,
    equilibrium: mapped.equilibrium,
    insight: insight + comparison,
    options: {
      animationDuration: 250,
      aria: { decal: { show: true }, enabled: true },
      color: ['#2563eb', '#e11d48'],
      grid: { bottom: 100, containLabel: true, left: 44, right: 18, top: 22 },
      legend: {
        data: [demandSeries.name as string, supplySeries.name as string, ...(originals.length ? ['', ...originals.map(s=>s.name as string)] : [])],
        itemHeight: 10,
        itemWidth: 20,
        show: settings.showLegend,
        textStyle: { color: '#52627a', fontSize: 12 },
        bottom: 0,
        left: 'center',
        itemGap: 12,
      },
      series: [...originals, demandSeries, supplySeries, ...originalPoint, ...(equilibriumSeries ? [equilibriumSeries] : [])],
      tooltip: { confine: true, trigger: 'item' },
      media: [{query:{maxWidth:450},option:{grid:{left:18,right:12,top:22,bottom:100},legend:{textStyle:{fontSize:11}},xAxis:{splitNumber:4},yAxis:{splitNumber:4}}}],
      xAxis: {
        min: settings.supplyDemandInputMode === 'schedule' ? 0 : undefined,
        axisLabel: { color: '#52627a', fontSize: 12, hideOverlap: true },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        name: settings.xAxisTitle || (settings.supplyDemandInputMode === 'schedule' ? 'Quantity' : mapped.xName),
        nameGap: 36,
        nameLocation: 'middle',
        nameTextStyle: { color: '#52627a', fontSize: 12 },
        scale: true,
        splitLine: { lineStyle: { color: '#e2e8f0' }, show: settings.showGrid },
        type: 'value',
      },
      yAxis: {
        min: settings.supplyDemandInputMode === 'schedule' ? 0 : undefined,
        axisLabel: { color: '#52627a', fontSize: 12 },
        axisLine: { show: false },
        name: settings.yAxisTitle || 'Price / Value',
        nameGap: 34,
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
    summary: `${settings.title.trim() || 'Supply and Demand Graph'}. ${mapped.points.length} quantity points. ${mapped.demandName} and ${mapped.supplyName}. ${insight}${comparison}`,
    warning,
  };
}
