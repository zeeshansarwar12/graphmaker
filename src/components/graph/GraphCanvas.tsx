import { createTreeChartView } from '../../graph/configs/treeChart';
import { loadChartEngine } from '../../graph/engines/loadChartEngine';
import type { ChartEngine } from '../../graph/engines/loadChartEngine';
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { init, use as registerECharts } from 'echarts/core';
import type { EChartsType } from 'echarts/core';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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

registerECharts([AriaComponent, CanvasRenderer, GridComponent, LegendComponent, SVGRenderer, TooltipComponent]);

export interface GraphCanvasHandle {
  exportImage: (type: 'png' | 'svg') => Promise<string | null>;
}

interface GraphCanvasProps {
  onRetryChart?: () => void;
  treeFitRequest?: number;
  chartType: 'bar' | 'boxplot' | 'dotplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'supplydemand' | 'xy' | 'equation' | 'tree';
  data: TabularData;
  incompatibleAction?: {
    label: string;
    onClick: () => void;
  };
  onToggleSeries?: (columnId: string) => boolean;
  settings: GraphSettings;
  onRenameTreeNode?: (id: string, label: string) => void;
  onPlotPoint?: (x: number, y: number) => void;
  onViewportChange?: (axes: CartesianSettings) => void;
}

interface EChartProps {
  onRetryChart?: () => void;
  engine: ChartEngine;
  treeFitRequest?: number;
  treeNodes?: Array<{ id: string; label: string }>;
  onRenameTreeNode?: (id: string, label: string) => void;
  canvasHeight?: number;
  canvasWidth?: number;
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
  onRetryChart, engine, treeFitRequest, treeNodes, onRenameTreeNode, canvasHeight, canvasWidth, axes, onPlotPoint, onViewportChange, snap,
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
  const [chartReady, setChartReady] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const [editingNode, setEditingNode] = useState<{id: string; label: string; x: number; y: number} | null>(null);
  const [treePan, setTreePan] = useState({x:0,y:0});
  const [treeZoom, setTreeZoom] = useState(1);
  const treeViewportRef = useRef<HTMLDivElement>(null);
  const fitTreeView = useCallback(() => {
    const viewport=treeViewportRef.current,chart=chartRef.current;if(!viewport || !chart) return;
    const width=chart.getWidth(),height=chart.getHeight();
    const zoom=Math.max(0.05,Math.floor(Math.min(1,viewport.clientWidth/width,viewport.clientHeight/height)*100)/100);
    setTreeZoom(zoom);setTreePan({x:(viewport.clientWidth-width*zoom)/2,y:(viewport.clientHeight-height*zoom)/2});
  }, [chartRef]);
  useEffect(() => {
    if(!treeFitRequest) return;
    const frame=requestAnimationFrame(fitTreeView);
    return () => cancelAnimationFrame(frame);
  }, [treeFitRequest,canvasWidth,canvasHeight,fitTreeView,chartReady]);
  function resetTreeView() { setTreePan({x:0,y:0}); setTreeZoom(1); }
  function zoomTree(value: number) {
    const next=Math.min(2,Math.max(0.05,Number(value.toFixed(2))));
    const viewport=treeViewportRef.current;if(!viewport) return;
    const x=viewport.clientWidth/2,y=viewport.clientHeight/2,ratio=next/treeZoom;
    setTreePan(pan => ({x:x-(x-pan.x)*ratio,y:y-(y-pan.y)*ratio}));
    setTreeZoom(next);
  }
  const [treeDragging, setTreeDragging] = useState(false);
  const treeDrag = useRef<{id:number;x:number;y:number;panX:number;panY:number} | null>(null);
  const suppressTreeClick = useRef(false);
  const nodePickerRef = useRef<HTMLSelectElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  function closeNodeEditor() { setEditingNode(null); nodePickerRef.current?.focus({preventScroll:true}); }
  const editingNodeId = editingNode?.id;
  useEffect(() => { if (editingNodeId) { labelInputRef.current?.focus(); labelInputRef.current?.select(); } }, [editingNodeId]);
  const latestView = useRef({options,axes});
  useEffect(() => {latestView.current={options,axes};},[options,axes]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{point:number[];id:number} | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let canceled=false;
    let chart: EChartsType | null=null;
    let resizeObserver: ResizeObserver | null=null;
    const resize = () => chart?.resize();
    loadChartEngine(engine).then(() => {
      if (canceled) return;
      chart = init(container, undefined, {renderer:'canvas'});
      chartRef.current=chart;
      const latest=latestView.current;
      chart.setOption(latest.axes ? fitCartesianGrid(latest.options,latest.axes,chart.getWidth(),chart.getHeight()) : latest.options,{notMerge:true});
      resizeObserver=typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
      resizeObserver?.observe(container);
      window.addEventListener('resize',resize);
      setEngineError(false);setChartReady(true);
    }).catch(() => { if(!canceled) setEngineError(true); });
    return () => {
      canceled=true;resizeObserver?.disconnect();window.removeEventListener('resize',resize);
      chart?.dispose();if(chartRef.current===chart) chartRef.current=null;
    };
  }, [chartRef,engine]);

  useEffect(() => {
    const chart = chartRef.current; if (!chart) return;
    const apply = () => chart.setOption(axes ? fitCartesianGrid(options, axes, chart.getWidth(), chart.getHeight()) : options, {notMerge:true});
    apply();
    const observer = new ResizeObserver(apply); if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [axes, chartRef, options,chartReady]);

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
  }, [axes, chartRef, onPlotPoint, onViewportChange, snap,chartReady]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onRenameTreeNode) return;
    const editNode = (...args: unknown[]) => {
      const event = args[0] as {seriesType?: string; data?: {id?: string}; event?: {offsetX: number; offsetY: number}};
      if (event.seriesType !== 'tree' || suppressTreeClick.current) return;
      const node = treeNodes?.find(node => node.id === event.data?.id);
      if (node) setEditingNode({...node, x: Math.max(8, Math.min(event.event?.offsetX ?? 8, chart.getWidth()-280)), y: Math.max(8, Math.min(event.event?.offsetY ?? 8, chart.getHeight()-170))});
    };
    chart.on('click', editNode);
    return () => { if (!chart.isDisposed()) chart.off('click', editNode); };
  }, [chartRef, treeNodes, onRenameTreeNode,chartReady]);

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
  }, [chartRef, legendSeries, onToggleSeries, options,chartReady]);

  return (
    <div data-axis-type={axisType} data-chart-status={chartReady ? 'ready' : 'loading'} data-label-interval={labelInterval} data-series-count={seriesCount}>
      {!chartReady && <p role={engineError ? 'alert' : 'status'} className="text-text-muted mb-2 text-sm">{engineError ? <>The chart renderer could not load. <button type="button" className="text-brand underline" onClick={onRetryChart}>Save and reload editor</button></> : 'Loading chart…'}</p>}
      {warning && <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">{warning}</p>}
      {insight && <p className="border-border bg-surface-subtle mb-2 rounded-md border px-3 py-2 text-sm font-semibold" data-chart-insight role="status">{insight}</p>}
      {treeNodes && <label className="text-text-muted mb-2 block text-xs">Edit a node
        <select ref={nodePickerRef} aria-label="Edit a node in preview" className="border-border ml-2 max-w-full rounded-md border bg-white p-2 text-sm" value="" onChange={event => {
          const node = treeNodes.find(node => node.id === event.target.value);
          if (node) { resetTreeView(); setEditingNode({...node,x:8,y:8}); }
        }}><option value="">Choose a node…</option>{treeNodes.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select>
      </label>}
      {treeNodes && <div className="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="Tree view controls">
        <button className="button-secondary" aria-label="Zoom out" disabled={treeZoom <= 0.05} type="button" onClick={() => zoomTree(treeZoom-0.25)}>−</button>
        <output aria-label="Tree zoom level" className="min-w-12 text-center text-sm" aria-live="polite">{Math.round(treeZoom*100)}%</output>
        <button className="button-secondary" aria-label="Zoom in" disabled={treeZoom >= 2} type="button" onClick={() => zoomTree(treeZoom+0.25)}>＋</button>
        <button className="button-secondary" type="button" onClick={fitTreeView}>Fit to view</button>
        <button className="button-secondary" type="button" onClick={resetTreeView}>Reset view</button>
      </div>}
      <div className={treeNodes ? 'relative max-w-full overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-blue-600' : 'max-w-full overflow-auto'}
        ref={treeNodes ? treeViewportRef : undefined}
        data-tree-viewport={treeNodes ? true : undefined}
        role={treeNodes ? 'region' : undefined} aria-label={treeNodes ? 'Tree canvas. Drag to pan, use arrow keys to move, plus and minus to zoom, Home to reset.' : undefined} tabIndex={treeNodes ? 0 : undefined}
        style={treeNodes ? {height:Math.min(canvasHeight ?? 320,480),touchAction:'none',cursor:treeDragging ? 'grabbing' : 'grab'} : undefined}
        onKeyDown={event => {
          if (!treeNodes || event.target !== event.currentTarget) return;
          const movement: Record<string,[number,number]> = {ArrowLeft:[-40,0],ArrowRight:[40,0],ArrowUp:[0,-40],ArrowDown:[0,40]};
          if (event.key === 'Home' || event.key === '0') {event.preventDefault();resetTreeView();}
          if (event.key === '+' || event.key === '=') {event.preventDefault();zoomTree(treeZoom+0.25);}
          if (event.key === '-') {event.preventDefault();zoomTree(treeZoom-0.25);}
          const delta=movement[event.key];if(delta) {event.preventDefault();setTreePan(pan => ({x:pan.x+delta[0],y:pan.y+delta[1]}));}
        }}
        onPointerDown={event => {
          if(!treeNodes || event.button !== 0 || (event.target as HTMLElement).closest('form,button,input,select')) return;
          suppressTreeClick.current=false;
          treeDrag.current={id:event.pointerId,x:event.clientX,y:event.clientY,panX:treePan.x,panY:treePan.y};
        }}
        onPointerMove={event => {
          const start=treeDrag.current;if(!start || start.id !== event.pointerId) return;
          const dx=event.clientX-start.x,dy=event.clientY-start.y;
          if(!suppressTreeClick.current && Math.hypot(dx,dy)<5) return;
          suppressTreeClick.current=true;setTreeDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          setTreePan({x:start.panX+dx,y:start.panY+dy});
        }}
        onPointerUp={() => {treeDrag.current=null;setTreeDragging(false);}}
        onPointerCancel={() => {treeDrag.current=null;setTreeDragging(false);}}
        onLostPointerCapture={() => {treeDrag.current=null;setTreeDragging(false);}}
      ><div className="relative" data-tree-stage={treeNodes ? true : undefined} style={{minWidth:canvasWidth,transform:treeNodes ? `translate(${treePan.x}px, ${treePan.y}px) scale(${treeZoom})` : undefined,transformOrigin:treeNodes ? '0 0' : undefined}}><div data-chart-canvas aria-hidden="true" className="h-72 w-full sm:h-80" ref={containerRef}
        style={{height:canvasHeight, minWidth:canvasWidth, touchAction:onViewportChange ? 'none' : undefined,cursor:onViewportChange ? 'grab' : onPlotPoint ? 'crosshair' : undefined}}
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
      {editingNode && onRenameTreeNode && <form role="dialog" aria-label="Edit tree node" className="border-border absolute z-10 w-64 rounded-md border bg-white p-3 shadow-lg" style={{left:editingNode.x,top:editingNode.y,transform:treeNodes ? `scale(${1/treeZoom})` : undefined,transformOrigin:'0 0'}}
        onKeyDown={event => { if(event.key === 'Escape') {event.preventDefault();closeNodeEditor();} }}
        onSubmit={event => {event.preventDefault();const label=editingNode.label.trim();if(!label) return;onRenameTreeNode(editingNode.id,label);closeNodeEditor();}}>
        <label className="block text-sm font-semibold">Node label<input ref={labelInputRef} className="border-border mt-1 min-h-10 w-full rounded-md border px-2 font-normal" required maxLength={80} value={editingNode.label} onChange={event => setEditingNode({...editingNode,label:event.target.value})}/></label>
        {!editingNode.label.trim() && <p className="mt-1 text-xs" role="status">Enter a label for this node.</p>}
        <div className="mt-2 flex gap-2"><button className="button-primary" type="submit" disabled={!editingNode.label.trim()}>Save label</button><button className="button-secondary" type="button" onClick={closeNodeEditor}>Cancel</button></div>
      </form>}
      </div></div>
      <p aria-live="polite" className="sr-only">{summary}</p>
    </div>
  );
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { onRetryChart, treeFitRequest, chartType, data, incompatibleAction, onToggleSeries, settings, onPlotPoint, onViewportChange, onRenameTreeNode },
  ref,
) {
  const chartRef = useRef<EChartsType | null>(null);
  const view = useMemo(
    () => chartType === 'tree' ? createTreeChartView(data, settings) : chartType === 'equation' ? createEquationChartView(data, settings) : chartType === 'line'
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
    const columnIndexes = chartType === 'tree' || chartType === 'dotplot' || chartType === 'histogram' || chartType === 'pie' || chartType === 'supplydemand'
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
    async exportImage(type) {
      try { await loadChartEngine(chartType === 'histogram' ? 'bar' : chartType === 'dotplot' ? 'scatter' : chartType === 'equation' || chartType === 'supplydemand' ? 'xy' : chartType); } catch {return null;}
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
  }), [view,chartType]);

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
      {chartType === 'tree' && <p className="text-text-muted mb-2 text-xs">Drag the canvas to move the tree. Click a node to edit its label. Use + and − to zoom. Reset view restores size and position. Downloads include every branch.</p>}
      <EChart
        onRetryChart={onRetryChart}
        engine={chartType === 'histogram' ? 'bar' : chartType === 'dotplot' ? 'scatter' : chartType === 'equation' || chartType === 'supplydemand' ? 'xy' : chartType}
        // ECharts retains removed tree-node graphics during updates; remount on topology changes.
        key={chartType === 'tree' ? JSON.stringify([settings.orientation, data.rows.map(row => [row.cells[0], row.cells[2]])]) : chartType}
        treeFitRequest={treeFitRequest}
        treeNodes={chartType === 'tree' ? data.rows.map(row => ({id:row.cells[0].trim(),label:row.cells[1]})) : undefined}
        onRenameTreeNode={chartType === 'tree' ? onRenameTreeNode : undefined}
        canvasHeight={'canvasHeight' in view ? view.canvasHeight : undefined}
        canvasWidth={'canvasWidth' in view ? view.canvasWidth : undefined}
        axes={chartType === 'xy' || chartType === 'scatter' || chartType === 'equation' ? settings.cartesian : undefined}
        onPlotPoint={onPlotPoint}
        onViewportChange={onViewportChange}
        snap={settings.xySnapToGrid}
        axisType={chartType === 'tree' || chartType === 'pie' || chartType === 'radar'
          ? 'none'
          : chartType === 'equation' || chartType === 'dotplot' || chartType === 'scatter' || chartType === 'supplydemand' || chartType === 'xy'
          ? 'value'
          : chartType === 'line' && interpretation.shape === 'date-series' ? 'time' : 'category'}
        chartRef={chartRef}
        insight={'insight' in view && typeof view.insight === 'string' ? view.insight : undefined}
        labelInterval={labelInterval}
        legendSeries={legendSeries}
        onToggleSeries={chartType === 'tree' || chartType === 'boxplot' || chartType === 'dotplot' || chartType === 'histogram' || chartType === 'pie' || chartType === 'supplydemand' ? undefined : onToggleSeries}
        options={view.options}
        seriesCount={view.series.length}
        summary={view.summary}
        warning={'warning' in view && typeof view.warning === 'string' ? view.warning : undefined}
      />
    </div>
  );
});
