import type { EChartsOption, LineSeriesOption, ScatterSeriesOption } from 'echarts';
import type { GraphSettings } from './graphSettings';
import { getVisibleSeriesIndexes } from './graphSettings';
import { cartesianAxis, cartesianError } from './cartesian';
import { xyColumns } from '../transforms/xy';
import type { TabularData } from '../transforms/tabularData';

export function createXyChartView(data: TabularData, settings: GraphSettings) {
  const error = cartesianError(settings.cartesian);
  if (error) return { status: 'invalid' as const, message: error };
  const numeric = xyColumns(data);
  const [xIndex, ...yIndexes] = numeric.length ? numeric : settings.cartesian.origin ? data.columns.flatMap((column,index) => column.kind === 'number' ? [index] : []) : [];
  if (xIndex === undefined || yIndexes.length === 0) return { status: 'empty' as const, message: 'Add two numeric columns to create an XY graph.' };
  const xName = data.columns[xIndex].name || 'X';
  const labelIndex = data.columns.findIndex((_, index) => ![xIndex, ...yIndexes].includes(index) && data.rows.some(row => row.cells[index]?.trim()));
  const visible = getVisibleSeriesIndexes(settings, yIndexes.map(i => data.columns[i].id));
  let skipped = 0;
  const groups = visible.map((seriesIndex) => {
    const yIndex = yIndexes[seriesIndex], name = data.columns[yIndex].name || `Series ${seriesIndex + 1}`;
    const names = data.rows.map(row => labelIndex < 0 ? '' : row.cells[labelIndex]);
    const values = data.rows.map(row => {
      const x = row.cells[xIndex]?.trim(), y = row.cells[yIndex]?.trim();
      if (!x || !y || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
        if (row.cells.some(value => value.trim())) skipped++;
        return null;
      }
      return [Number(x), Number(y)] as [number, number];
    });
    return { name, names, values, seriesIndex };
  });
  const points = groups[0]?.values.filter((point): point is [number, number] => point !== null) ?? [];
  if (!settings.cartesian.origin && !groups.some(group => group.values.some(Boolean))) return { status: 'empty' as const, message: 'Add at least one row with valid X and Y values to create an XY graph.' };
  const series: Array<LineSeriesOption | ScatterSeriesOption> = groups.map(group => ({
    name: group.name, type: settings.xyConnectPoints ? 'line' : 'scatter',
    data: group.values, connectNulls: false, showSymbol: true, symbolSize: 8,
    itemStyle: { color: settings.seriesColors[group.seriesIndex % settings.seriesColors.length] },
    lineStyle: { color: settings.seriesColors[group.seriesIndex % settings.seriesColors.length] },
    label: { show: settings.showValueLabels, position: 'top', formatter: (params) => {
      const value = params.value as number[];
      return `${group.names[params.dataIndex] ? group.names[params.dataIndex] + ' ' : ''}(${value[0]}, ${value[1]})`;
    } },
    emphasis: { focus: 'series' },
  }));
  const options: EChartsOption = {
    animation: false, aria: { enabled: true },
    color: settings.seriesColors,
    grid: { bottom: 58, containLabel: true, left: 58, right: 25, top: 36 },
    legend: { show: settings.showLegend, data: groups.map(group => group.name), top: 0 },
    tooltip: { trigger: 'item', confine: true, renderMode: 'richText', formatter: (params) => {
      const item = (Array.isArray(params) ? params[0] : params), value = item.value as number[];
      return `${item.seriesName}\n${xName}: ${value[0]}\nY: ${value[1]}`;
    } },
    xAxis: cartesianAxis(settings.cartesian, 'x', settings.xAxisTitle || xName, settings.showGrid),
    yAxis: cartesianAxis(settings.cartesian, 'y', settings.yAxisTitle || groups[0].name, settings.showGrid),
    series,
  };
  return {
    status: 'ready' as const, options, points,
    series: groups.map(group => ({ name: group.name, values: group.values.map(point => point?.[1] ?? null) })),
    warning: skipped ? `${skipped} row${skipped === 1 ? ' was' : 's were'} ignored because X or Y was blank or invalid.` : undefined,
    summary: `${settings.title.trim() || `${groups[0].name} by ${xName}`}. XY graph with ${points.length} point${points.length === 1 ? '' : 's'} ${settings.xyConnectPoints ? 'connected in data order' : 'shown as unconnected points'}. X axis: ${xName}. Y axis: ${groups[0].name}. ${groups.length} series.`,
  };
}
