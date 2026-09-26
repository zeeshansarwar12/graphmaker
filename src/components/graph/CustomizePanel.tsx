import type { Dispatch } from 'react';

import { getVisibleSeriesIndexes } from '../../graph/configs/graphSettings';
import type { GraphSettings, GraphSettingsAction } from '../../graph/configs/graphSettings';

export interface CustomizableSeries {
  columnId: string;
  name: string;
}

interface CustomizePanelProps {
  chartType: 'bar' | 'boxplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'xy';
  dispatch: Dispatch<GraphSettingsAction>;
  onScatterColumnChange?: (axis: 'x' | 'y', columnId: string) => void;
  scatterMapping?: {
    columns: Array<{ id: string; name: string }>;
    xColumnId: string;
    yColumnId: string;
  };
  series: CustomizableSeries[];
  settings: GraphSettings;
}

const fieldClassName = 'border-border focus:border-brand mt-1 min-h-10 w-full rounded-md border bg-white px-3 text-sm outline-none';

export function CustomizePanel({
  chartType,
  dispatch,
  onScatterColumnChange,
  scatterMapping,
  series,
  settings,
}: CustomizePanelProps) {
  const seriesColumnIds = series.map((item) => item.columnId);
  const visibleSeriesIndexes = getVisibleSeriesIndexes(settings, seriesColumnIds);
  const visibleSeriesIndexSet = new Set(visibleSeriesIndexes);

  return (
    <aside aria-label="Customize graph" className="border-border bg-surface-subtle mt-4 rounded-lg border p-4" id="customize-panel">
      <div className="grid gap-4 sm:grid-cols-3">
        {chartType !== 'radar' && <label className="text-sm font-semibold">
          Graph title
          <input
            className={fieldClassName}
            onChange={(event) => dispatch({ type: 'set-title', value: event.target.value })}
            type="text"
            value={settings.title}
          />
        </label>}
        {chartType !== 'radar' && <label className="text-sm font-semibold">
          X-axis title
          <input
            className={fieldClassName}
            onChange={(event) => dispatch({ type: 'set-x-axis-title', value: event.target.value })}
            type="text"
            value={settings.xAxisTitle}
          />
        </label>}
        <label className="text-sm font-semibold">
          Y-axis title
          <input
            className={fieldClassName}
            onChange={(event) => dispatch({ type: 'set-y-axis-title', value: event.target.value })}
            type="text"
            value={settings.yAxisTitle}
          />
        </label>
      </div>

      <fieldset className="border-border mt-4 border-t pt-4">
        <legend className="sr-only">Graph visibility</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {chartType !== 'boxplot' && <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={settings.showLegend}
              className="accent-brand h-4 w-4"
              onChange={(event) => dispatch({ type: 'set-legend', value: event.target.checked })}
              type="checkbox"
            />
            Show legend
          </label>}
          {chartType === 'radar' && <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={settings.radarFilled}
              className="accent-brand h-4 w-4"
              onChange={(event) => dispatch({ type: 'set-radar-filled', value: event.target.checked })}
              type="checkbox"
            />
            Filled areas
          </label>}
          {chartType !== 'boxplot' && <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={settings.showGrid}
              className="accent-brand h-4 w-4"
              onChange={(event) => dispatch({ type: 'set-grid', value: event.target.checked })}
              type="checkbox"
            />
            Show grid
          </label>}
          {chartType === 'boxplot' && <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={settings.showOutliers}
              className="accent-brand h-4 w-4"
              onChange={(event) => dispatch({ type: 'set-outliers', value: event.target.checked })}
              type="checkbox"
            />
            Show outliers
          </label>}
          {chartType !== 'boxplot' && <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={settings.showValueLabels}
              className="accent-brand h-4 w-4"
              onChange={(event) => dispatch({ type: 'set-value-labels', value: event.target.checked })}
              type="checkbox"
            />
            Show value labels
          </label>}
        </div>
      </fieldset>

      {chartType === 'scatter' && scatterMapping && onScatterColumnChange && (
        <fieldset className="border-border mt-4 border-t pt-4">
          <legend className="text-sm font-semibold">Scatter columns</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              X column
              <select
                className={fieldClassName}
                onChange={(event) => onScatterColumnChange('x', event.target.value)}
                value={scatterMapping.xColumnId}
              >
                {scatterMapping.columns.filter((column) => column.id !== scatterMapping.yColumnId).map((column) => (
                  <option key={column.id} value={column.id}>{column.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Y column
              <select
                className={fieldClassName}
                onChange={(event) => onScatterColumnChange('y', event.target.value)}
                value={scatterMapping.yColumnId}
              >
                {scatterMapping.columns.filter((column) => column.id !== scatterMapping.xColumnId).map((column) => (
                  <option key={column.id} value={column.id}>{column.name}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      )}

      {chartType === 'pie' && series.length > 1 && (
        <label className="border-border mt-4 block max-w-xs border-t pt-4 text-sm font-semibold">
          Pie value series
          <select
            className={fieldClassName}
            onChange={(event) => dispatch({ type: 'set-pie-series', value: event.target.value })}
            value={settings.pieSeriesColumnId ?? series[0].columnId}
          >
            {series.map((item) => <option key={item.columnId} value={item.columnId}>{item.name}</option>)}
          </select>
        </label>
      )}

      {chartType === 'histogram' && (
        <div className="border-border mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
          {series.length > 1 && (
            <label className="text-sm font-semibold">
              Histogram series
              <select
                className={fieldClassName}
                onChange={(event) => dispatch({ type: 'set-histogram-series', value: event.target.value })}
                value={settings.histogramSeriesColumnId ?? series[0].columnId}
              >
                {series.map((item) => <option key={item.columnId} value={item.columnId}>{item.name}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm font-semibold">
            Bin count
            <select
              className={fieldClassName}
              onChange={(event) => dispatch({
                type: 'set-histogram-bin-count',
                value: event.target.value === 'auto' ? null : Number(event.target.value),
              })}
              value={settings.histogramBinCount ?? 'auto'}
            >
              <option value="auto">Auto</option>
              {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {chartType !== 'histogram' && chartType !== 'pie' && series.length > 0 && (
        <fieldset className="border-border mt-4 border-t pt-4">
          <legend className="text-sm font-semibold">Series</legend>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
            {series.map((item, index) => {
              const isVisible = visibleSeriesIndexSet.has(index);
              return (
                <label className="flex items-center gap-2 text-sm font-medium" key={item.columnId}>
                  <input
                    aria-label={`Show ${item.name} series`}
                    checked={isVisible}
                    className="accent-brand h-4 w-4"
                    disabled={isVisible && visibleSeriesIndexes.length === 1}
                    onChange={() => dispatch({
                      columnId: item.columnId,
                      seriesColumnIds,
                      type: 'toggle-series-visibility',
                    })}
                    type="checkbox"
                  />
                  {item.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {chartType !== 'boxplot' && chartType !== 'histogram' && chartType !== 'pie' && <fieldset className="border-border mt-4 border-t pt-4">
        <legend className="text-sm font-semibold">Series colors</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {series.map(({ columnId, name }, index) => (
            <label className="border-border bg-surface flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium" key={columnId}>
              <input
                aria-label={`${name || `Series ${index + 1}`} color`}
                className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                onChange={(event) => dispatch({ index, type: 'set-series-color', value: event.target.value })}
                type="color"
                value={settings.seriesColors[index] ?? '#2563eb'}
              />
              {name || `Series ${index + 1}`}
            </label>
          ))}
        </div>
      </fieldset>}

      {chartType !== 'radar' && <details className="border-border mt-4 border-t pt-4">
        <summary className="text-text-muted hover:text-text cursor-pointer text-sm font-semibold">Advanced controls</summary>
        <label className="mt-4 block max-w-xs text-sm font-semibold">
          Orientation
          <select
            className={fieldClassName}
            onChange={(event) => dispatch({
              type: 'set-orientation',
              value: event.target.value as GraphSettings['orientation'],
            })}
            value={settings.orientation}
          >
            <option value="vertical">{chartType === 'boxplot' ? 'Vertical boxes' : 'Vertical bars'}</option>
            <option value="horizontal">{chartType === 'boxplot' ? 'Horizontal boxes' : 'Horizontal bars'}</option>
          </select>
        </label>
      </details>}
    </aside>
  );
}
