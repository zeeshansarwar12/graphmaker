import { BarChart, BoxplotChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts';
import { AriaComponent, DataZoomComponent, GridComponent, LegendComponent, RadarComponent, TooltipComponent } from 'echarts/components';
import { init, use as registerECharts } from 'echarts/core';
import type { EChartsType } from 'echarts/core';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

import { createEquationChartView } from '../../graph/configs/equationChart';
import { fitCartesianGrid } from '../../graph/configs/cartesian';
import type { CartesianSettings } from '../../graph/configs/cartesian';
import { xyColumns } from '../../graph/transforms/xy';
import { createBarChartView } from '../../graph/configs/barChart';
import { createBoxPlotChartView } from '../../graph/configs/boxPlotChart';
import { createDotPlotChartView } from '../../graph/configs/dotPlotChart';
import { createHistogramChartView } from '../../graph/configs/histogramChart';
import { createLineChartView } from '../../graph/configs/lineChart';
import { createPieChartView } from '../../graph/configs/pieChart';
import { createRadarChartView } from '../../graph/configs/radarChart';
import { createScatterChartView } from '../../graph/configs/scatterChart';
import { createSupplyDemandChartView } from '../../graph/configs/supplyDemandChart';
import { createXyChartView } from '../../graph/configs/xyChart';
import type { GraphSettings } from '../../graph/configs/graphSettings';
import { detectDataShape } from '../../graph/transforms/dataInterpretation';
import { createScatterData } from '../../graph/transforms/chartData';
import type { TabularData } from '../../graph/transforms/tabularData';

registerECharts([AriaComponent, DataZoomComponent, BarChart, BoxplotChart, CanvasRenderer, GridComponent, LegendComponent, LineChart, PieChart, RadarChart, RadarComponent, ScatterChart, SVGRenderer, TooltipComponent]);

export interface GraphCanvasHandle {
  exportImage: (type: 'png' | 'svg') => string | null;
}

interface GraphCanvasProps {
  chartType: 'bar' | 'boxplot' | 'dotplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'supplydemand' | 'xy' | 'equation';
  data: TabularData;
  incompatibleAction?: {
    label: string;
    onClick: () => void;
  };
  onToggleSeries?: (columnId: string) => boolean;
  settings: GraphSettings;
  onPlotPoint?: (x: number, y: number) => void;
  onViewportChange?: (axes: CartesianSettings) => void;
}

interface EChartProps {
  axes?: CartesianSettings;
  onPlotPoint?: (x: number, y: number) => void;
  onViewportChange?: (axes: CartesianSettings) => void;
  snap?: boolean;
  axisType: 'category' | 'none' | 'time' | 'value';
  chartRef: RefObject<EChartsType | null>;
  insight?: string;
  labelInterval: number;
  legendSeries: Array<{ columnId: string; name: string }>;
  onToggleSeries?: (columnId: string) => boolean;
  options: NonNullable<Extract<ReturnType<typeof createBarChartView>, { status: 'ready' }>['options']>;
  seriesCount: number;
  summary: string;
  warning?: string;
}

function EChart({
  axes, onPlotPoint, onViewportChange, snap,
  axisType,
  chartRef,
  insight,
  labelInterval,
  legendSeries,
  onToggleSeries,
  options,
  seriesCount,
  summary,
  warning,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{point:number[];id:number} | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = init(container, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    const resize = () => chart.resize();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(container);
    window.addEventListener('resize', resize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [chartRef]);

  useEffect(() => {
    const chart = chartRef.current; if (!chart) return;
    const apply = () => chart.setOption(axes ? fitCartesianGrid(options, axes, chart.getWidth(), chart.getHeight()) : options, {notMerge:true});
    apply();
    const observer = new ResizeObserver(apply); if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [axes, chartRef, options]);

  useEffect(() => {
    const chart = chartRef.current; if (!chart) return;
    const click = (event: {offsetX: number; offsetY: number}) => {
      if (!onPlotPoint || !chart.containPixel('grid', [event.offsetX,event.offsetY])) return;
      const point = chart.convertFromPixel('grid',[event.offsetX,event.offsetY]) as number[];
      if (!point?.every(Number.isFinite)) return;
      const xStep = axes?.xStep ?? 1, yStep = axes?.yStep ?? 1;
      onPlotPoint(snap ? Number((Math.round(point[0]/xStep)*xStep).toPrecision(12)) : Number(point[0].toPrecision(12)), snap ? Number((Math.round(point[1]/yStep)*yStep).toPrecision(12)) : Number(point[1].toPrecision(12)));
    };
    const zoom = () => {
      if (!axes || !onViewportChange) return;
      const option = chart.getOption(), zooms = option.dataZoom as Array<{start?:number;end?:number}>;
      const next = {...axes, origin:false, xStep:null, yStep:null};
      for (const [index, axis] of (['x','y'] as const).entries()) {
        const min = axes[`${axis}Min`] ?? -10, max = axes[`${axis}Max`] ?? 10, range = max-min;
        next[`${axis}Min`] = min + range * (zooms[index]?.start ?? 0)/100;
        next[`${axis}Max`] = min + range * (zooms[index]?.end ?? 100)/100;
      }
      if (next.xMax! - next.xMin! >= 1e-8 && next.yMax! - next.yMin! >= 1e-8) onViewportChange(next);
    };
    chart.getZr().on('click',click); chart.on('datazoom',zoom);
    return () => {if (!chart.isDisposed()) {chart.getZr().off('click',click);chart.off('datazoom',zoom);}};
  }, [axes, chartRef, onPlotPoint, onViewportChange, snap]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onToggleSeries) return;

    const handleLegendToggle = (...args: unknown[]) => {
      const event = args[0];
      const name = typeof event === 'object' && event !== null && 'name' in event
        && typeof event.name === 'string' ? event.name : null;
      const series = legendSeries.find((item) => item.name === name);
      if (!series) return;
      if (!onToggleSeries(series.columnId)) chart.setOption(options, { notMerge: true });
    };
    chart.on('legendselectchanged', handleLegendToggle);
    return () => {
      chart.off('legendselectchanged', handleLegendToggle);
    };
  }, [chartRef, legendSeries, onToggleSeries, options]);

  return (
    <div data-axis-type={axisType} data-chart-status="ready" data-label-interval={labelInterval} data-series-count={seriesCount}>
      {warning && <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">{warning}</p>}
      {insight && <p className="border-border bg-surface-subtle mb-2 rounded-md border px-3 py-2 text-sm font-semibold" data-chart-insight role="status">{insight}</p>}
      <div data-chart-canvas aria-hidden="true" className="h-72 w-full sm:h-80" ref={containerRef}
        style={{touchAction:onViewportChange ? 'none' : undefined,cursor:onViewportChange ? 'grab' : onPlotPoint ? 'crosshair' : undefined}}
        onPointerDown={event => {
          const chart=chartRef.current;if(!chart || !onViewportChange) return;
          if(pointerStart.current) {pointerStart.current=null;return;}
          const rect=event.currentTarget.getBoundingClientRect(), pixel=[event.clientX-rect.left,event.clientY-rect.top];
          if(chart.containPixel('grid',pixel)) {pointerStart.current={point:chart.convertFromPixel('grid',pixel) as number[],id:event.pointerId};event.currentTarget.setPointerCapture(event.pointerId);}
        }}
        onPointerCancel={() => {pointerStart.current=null;}}
        onPointerUp={event => {
          const start=pointerStart.current;pointerStart.current=null;
          const chart=chartRef.current;if(!start || !chart || !axes || !onViewportChange || start.id!==event.pointerId) return;
          const rect=event.currentTarget.getBoundingClientRect(), end=chart.convertFromPixel('grid',[event.clientX-rect.left,event.clientY-rect.top]) as number[];
          const dx=start.point[0]-end[0],dy=start.point[1]-end[1];
          if(!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx)+Math.abs(dy)<1e-8) return;
          onViewportChange({...axes,xMin:(axes.xMin ?? -10)+dx,xMax:(axes.xMax ?? 10)+dx,yMin:(axes.yMin ?? -10)+dy,yMax:(axes.yMax ?? 10)+dy,origin:false});
        }}
      ></div>
      <p aria-live="polite" className="sr-only">{summary}</p>
    </div>
  );
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { chartType, data, incompatibleAction, onToggleSeries, settings, onPlotPoint, onViewportChange },
  ref,
) {
  const chartRef = useRef<EChartsType | null>(null);
  const view = useMemo(
    () => chartType === 'equation' ? createEquationChartView(data, settings) : chartType === 'line'
      ? createLineChartView(data, settings)
      : chartType === 'boxplot'
        ? createBoxPlotChartView(data, settings)
      : chartType === 'dotplot'
        ? createDotPlotChartView(data, settings)
      : chartType === 'histogram'
        ? createHistogramChartView(data, settings)
      : chartType === 'pie'
        ? createPieChartView(data, settings)
      : chartType === 'radar'
        ? createRadarChartView(data, settings)
      : chartType === 'scatter'
        ? createScatterChartView(data, settings)
      : chartType === 'supplydemand'
        ? createSupplyDemandChartView(data, settings)
      : chartType === 'xy'
        ? createXyChartView(data, settings)
        : createBarChartView(data, settings),
    [chartType, data, settings],
  );
  const interpretation = useMemo(() => detectDataShape(data), [data]);
  const legendSeries = useMemo(() => {
    const columnIndexes = chartType === 'dotplot' || chartType === 'histogram' || chartType === 'pie' || chartType === 'supplydemand'
      ? []
      : chartType === 'xy' || chartType === 'equation' ? xyColumns(data).slice(1)
      : chartType === 'scatter'
      ? [createScatterData(
        data,
        chartType === 'scatter' ? settings.scatterXColumnId : null,
        chartType === 'scatter' ? settings.scatterYColumnId : null,
      ).yColumnIndex].filter((index): index is number => index !== null)
      : interpretation.seriesColumnIndexes;
    return columnIndexes.map((columnIndex, index) => ({
      columnId: data.columns[columnIndex].id,
      name: data.columns[columnIndex].name.trim() || `Series ${index + 1}`,
    }));
  }, [chartType, data, interpretation.seriesColumnIndexes, settings.scatterXColumnId, settings.scatterYColumnId]);
  const labelInterval = interpretation.pointCount > (interpretation.shape === 'date-series' ? 8 : 12)
    ? Math.ceil(interpretation.pointCount / (interpretation.shape === 'date-series' ? 8 : 12)) - 1
    : 0;

  useImperativeHandle(ref, () => ({
    exportImage(type) {
      const chart = chartRef.current;
      if (!chart || view.status !== 'ready') return null;

      if (type === 'png') {
        return chart.getDataURL({
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          type: 'png',
        });
      }

      const container = document.createElement('div');
      const height = Math.max(chart.getHeight(), 288);
      const width = Math.max(chart.getWidth(), 320);
      container.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;`;
      document.body.append(container);

      const svgChart = init(container, undefined, { height, renderer: 'svg', width });
      try {
        svgChart.setOption({ ...chart.getOption(), animation:false }, { notMerge: true });
        return svgChart.getDataURL({ backgroundColor: '#ffffff', type: 'svg' });
      } finally {
        svgChart.dispose();
        container.remove();
      }
    },
  }), [view]);

  if (view.status !== 'ready') {
    const isInvalid = view.status === 'invalid';
    const isIncompatible = view.status === 'empty' && incompatibleAction !== undefined;
    const emptyStateTitle = 'title' in view && typeof view.title === 'string'
      ? view.title
      : isIncompatible
        ? `This data isn’t suitable for ${chartType === 'scatter' ? 'Scatter' : chartType === 'xy' ? 'XY' : chartType === 'boxplot' ? 'Box Plot' : chartType === 'dotplot' ? 'Dot Plot' : chartType === 'supplydemand' ? 'Supply & Demand' : chartType.charAt(0).toUpperCase() + chartType.slice(1)}.`
        : 'Your graph will appear here';
    return (
      <div
        className={isIncompatible
          ? 'border-border bg-surface-subtle grid min-h-40 place-items-center rounded-md border border-dashed px-5 py-5 text-center sm:min-h-44'
          : 'border-border bg-surface-subtle grid h-72 place-items-center rounded-md border border-dashed px-6 text-center sm:h-80'}
        data-chart-status={view.status}
        role={isInvalid ? 'alert' : 'status'}
      >
        <div>
          <p className="font-semibold">{isInvalid ? 'Check your data' : emptyStateTitle}</p>
          <p className="text-text-muted mx-auto mt-1.5 max-w-md text-sm leading-6">{view.message}</p>
          {isIncompatible && (
            <button className="button-primary mt-3" onClick={incompatibleAction.onClick} type="button">
              {incompatibleAction.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-chart-orientation={settings.orientation} data-rendered-chart-type={chartType}>
      <EChart
        axes={chartType === 'xy' || chartType === 'scatter' || chartType === 'equation' ? settings.cartesian : undefined}
        onPlotPoint={onPlotPoint}
        onViewportChange={onViewportChange}
        snap={settings.xySnapToGrid}
        axisType={chartType === 'pie' || chartType === 'radar'
          ? 'none'
          : chartType === 'equation' || chartType === 'dotplot' || chartType === 'scatter' || chartType === 'supplydemand' || chartType === 'xy'
          ? 'value'
          : chartType === 'line' && interpretation.shape === 'date-series' ? 'time' : 'category'}
        chartRef={chartRef}
        insight={'insight' in view && typeof view.insight === 'string' ? view.insight : undefined}
        labelInterval={labelInterval}
        legendSeries={legendSeries}
        onToggleSeries={chartType === 'boxplot' || chartType === 'dotplot' || chartType === 'histogram' || chartType === 'pie' || chartType === 'supplydemand' ? undefined : onToggleSeries}
        options={view.options}
        seriesCount={view.series.length}
        summary={view.summary}
        warning={'warning' in view && typeof view.warning === 'string' ? view.warning : undefined}
      />
    </div>
  );
});
