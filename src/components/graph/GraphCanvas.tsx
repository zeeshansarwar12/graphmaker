import { BarChart, BoxplotChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts';
import { AriaComponent, GridComponent, LegendComponent, RadarComponent, TooltipComponent } from 'echarts/components';
import { init, use as registerECharts } from 'echarts/core';
import type { EChartsType } from 'echarts/core';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

import { createBarChartView } from '../../graph/configs/barChart';
import { createBoxPlotChartView } from '../../graph/configs/boxPlotChart';
import { createHistogramChartView } from '../../graph/configs/histogramChart';
import { createLineChartView } from '../../graph/configs/lineChart';
import { createPieChartView } from '../../graph/configs/pieChart';
import { createRadarChartView } from '../../graph/configs/radarChart';
import { createScatterChartView } from '../../graph/configs/scatterChart';
import { createXyChartView } from '../../graph/configs/xyChart';
import type { GraphSettings } from '../../graph/configs/graphSettings';
import { detectDataShape } from '../../graph/transforms/dataInterpretation';
import { createScatterData } from '../../graph/transforms/chartData';
import type { TabularData } from '../../graph/transforms/tabularData';

registerECharts([AriaComponent, BarChart, BoxplotChart, CanvasRenderer, GridComponent, LegendComponent, LineChart, PieChart, RadarChart, RadarComponent, ScatterChart, SVGRenderer, TooltipComponent]);

export interface GraphCanvasHandle {
  exportImage: (type: 'png' | 'svg') => string | null;
}

interface GraphCanvasProps {
  chartType: 'bar' | 'boxplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'xy';
  data: TabularData;
  incompatibleAction?: {
    label: string;
    onClick: () => void;
  };
  onToggleSeries?: (columnId: string) => boolean;
  settings: GraphSettings;
}

interface EChartProps {
  axisType: 'category' | 'none' | 'time' | 'value';
  chartRef: RefObject<EChartsType | null>;
  labelInterval: number;
  legendSeries: Array<{ columnId: string; name: string }>;
  onToggleSeries?: (columnId: string) => boolean;
  options: NonNullable<Extract<ReturnType<typeof createBarChartView>, { status: 'ready' }>['options']>;
  seriesCount: number;
  summary: string;
  warning?: string;
}

function EChart({
  axisType,
  chartRef,
  labelInterval,
  legendSeries,
  onToggleSeries,
  options,
  seriesCount,
  summary,
  warning,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    chartRef.current?.setOption(options, { notMerge: true });
  }, [chartRef, options]);

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
      <div aria-hidden="true" className="h-72 w-full sm:h-80" ref={containerRef}></div>
      <p aria-live="polite" className="sr-only">{summary}</p>
    </div>
  );
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { chartType, data, incompatibleAction, onToggleSeries, settings },
  ref,
) {
  const chartRef = useRef<EChartsType | null>(null);
  const view = useMemo(
    () => chartType === 'line'
      ? createLineChartView(data, settings)
      : chartType === 'boxplot'
        ? createBoxPlotChartView(data, settings)
      : chartType === 'histogram'
        ? createHistogramChartView(data, settings)
      : chartType === 'pie'
        ? createPieChartView(data, settings)
      : chartType === 'radar'
        ? createRadarChartView(data, settings)
      : chartType === 'scatter'
        ? createScatterChartView(data, settings)
      : chartType === 'xy'
        ? createXyChartView(data, settings)
        : createBarChartView(data, settings),
    [chartType, data, settings],
  );
  const interpretation = useMemo(() => detectDataShape(data), [data]);
  const legendSeries = useMemo(() => {
    const columnIndexes = chartType === 'histogram' || chartType === 'pie'
      ? []
      : chartType === 'scatter' || chartType === 'xy'
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
        svgChart.setOption(view.options, { notMerge: true });
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
        ? `This data isn’t suitable for ${chartType === 'scatter' ? 'Scatter' : chartType === 'xy' ? 'XY' : chartType === 'boxplot' ? 'Box Plot' : chartType.charAt(0).toUpperCase() + chartType.slice(1)}.`
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
        axisType={chartType === 'pie' || chartType === 'radar'
          ? 'none'
          : chartType === 'scatter' || chartType === 'xy'
          ? 'value'
          : chartType === 'line' && interpretation.shape === 'date-series' ? 'time' : 'category'}
        chartRef={chartRef}
        labelInterval={labelInterval}
        legendSeries={legendSeries}
        onToggleSeries={chartType === 'boxplot' || chartType === 'histogram' || chartType === 'pie' ? undefined : onToggleSeries}
        options={view.options}
        seriesCount={view.series.length}
        summary={view.summary}
        warning={'warning' in view && typeof view.warning === 'string' ? view.warning : undefined}
      />
    </div>
  );
});
