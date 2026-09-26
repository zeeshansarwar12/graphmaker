import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

import {
  createDownloadFilename,
  downloadDataUrl,
  downloadTextFile,
  serializeDatasetAsCsv,
} from '../../graph/exporters/download';
import type { GraphEditorConfig } from '../../graph/configs/editor';
import {
  createDefaultGraphSettings,
  getVisibleSeriesIndexes,
  graphSettingsReducer,
} from '../../graph/configs/graphSettings';
import {
  createAdaptiveSettings,
  createSuggestedLabels,
  detectDataShape,
  hasMixedSeriesScale,
} from '../../graph/transforms/dataInterpretation';
import { createPieData, createScatterData } from '../../graph/transforms/chartData';
import { createHistogramData } from '../../graph/transforms/histogram';
import {
  createBoxPlotData,
  createBoxPlotSuggestedLabels,
} from '../../graph/statistics/boxPlot';
import { createSampleData } from '../../graph/transforms/tabularData';
import type { TabularData } from '../../graph/transforms/tabularData';
import {
  deleteCurrentProject,
  loadCurrentProject,
  saveCurrentProject,
} from '../../lib/storage/indexedDb';
import {
  createProjectSnapshot,
  deserializeGraphProject,
  serializeGraphProject,
} from '../../lib/storage/graphProject';
import { CustomizePanel } from './CustomizePanel';
import { DataGrid } from './DataGrid';
import { GraphCanvas } from './GraphCanvas';
import type { GraphCanvasHandle } from './GraphCanvas';

interface GraphEditorProps {
  config: GraphEditorConfig;
}

const chartTypes = [
  { label: 'Bar', glyph: '▥' },
  { label: 'Line', glyph: '⌁' },
  { label: 'Pie', glyph: '◕' },
  { label: 'XY', glyph: '⌗' },
  { label: 'Scatter', glyph: '⠿' },
  { label: 'Box Plot', glyph: '▣' },
  { label: 'Radar', glyph: '⬡' },
  { label: 'Histogram', glyph: '▥' },
] as const;

type RenderedChartType = 'bar' | 'boxplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'xy';

function ButtonIcon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true" className="text-brand text-base leading-none">{children}</span>;
}

function createConfiguredData(config: GraphEditorConfig): TabularData {
  if (!config.sampleData) return createSampleData();
  return {
    columns: config.sampleData.columns.map((column) => ({ ...column })),
    rows: config.sampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
  };
}

function createConfiguredSettings(config: GraphEditorConfig) {
  const defaults = createDefaultGraphSettings();
  return {
    ...defaults,
    ...config.initialSettings,
    hiddenSeriesIds: [...(config.initialSettings?.hiddenSeriesIds ?? defaults.hiddenSeriesIds)],
    seriesColors: [...(config.initialSettings?.seriesColors ?? defaults.seriesColors)],
  };
}

export function GraphEditor({ config }: GraphEditorProps) {
  const graphCanvasRef = useRef<GraphCanvasHandle>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const createdAtRef = useRef(new Date().toISOString());
  const [data, setData] = useState(() => createConfiguredData(config));
  const [isSampleData, setIsSampleData] = useState(true);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isProjectReady, setIsProjectReady] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [isStorageAvailable, setIsStorageAvailable] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<RenderedChartType>(config.graphType);
  const [saveStatus, setSaveStatus] = useState<'checking' | 'error' | 'saved' | 'saving'>('checking');
  const [settings, dispatchSettings] = useReducer(
    graphSettingsReducer,
    config,
    createConfiguredSettings,
  );
  const interpretation = useMemo(() => detectDataShape(data), [data]);
  const scatterData = useMemo(
    () => createScatterData(data, settings.scatterXColumnId, settings.scatterYColumnId),
    [data, settings.scatterXColumnId, settings.scatterYColumnId],
  );
  const pieData = useMemo(
    () => createPieData(data, settings.pieSeriesColumnId),
    [data, settings.pieSeriesColumnId],
  );
  const histogramData = useMemo(
    () => createHistogramData(data, settings.histogramSeriesColumnId, settings.histogramBinCount),
    [data, settings.histogramBinCount, settings.histogramSeriesColumnId],
  );
  const boxPlotData = useMemo(() => createBoxPlotData(data), [data]);
  const activeSeriesColumnIndexes = selectedChartType === 'boxplot'
    ? boxPlotData.groups.map((group) => group.columnIndex)
    : selectedChartType === 'histogram'
    ? histogramData.numericColumnIndexes
    : (selectedChartType === 'scatter' || selectedChartType === 'xy') && scatterData.yColumnIndex !== null
      ? [scatterData.yColumnIndex]
      : interpretation.seriesColumnIndexes;
  const seriesDefinitions = activeSeriesColumnIndexes.map((columnIndex, index) => ({
    columnId: data.columns[columnIndex].id,
    columnIndex,
    name: data.columns[columnIndex]?.name.trim() || `Series ${index + 1}`,
  }));
  const seriesNames = seriesDefinitions.map((series) => series.name);
  const seriesColumnIds = seriesDefinitions.map((series) => series.columnId);
  const visibleSeriesIndexes = getVisibleSeriesIndexes(settings, seriesColumnIds);
  const visibleSeriesColumnIndexes = visibleSeriesIndexes
    .map((index) => seriesDefinitions[index].columnIndex);
  const hasVisibleMixedScale = selectedChartType !== 'boxplot' && selectedChartType !== 'histogram'
    && hasMixedSeriesScale(data, visibleSeriesColumnIndexes);
  const dimensionName = interpretation.dimensionColumnIndex === null
    ? 'None'
    : data.columns[interpretation.dimensionColumnIndex]?.name.trim() || 'Unnamed column';
  const selectedChartLabel = selectedChartType === 'line'
    ? 'Line'
    : selectedChartType === 'boxplot'
      ? 'Box Plot'
    : selectedChartType === 'histogram'
      ? 'Histogram'
    : selectedChartType === 'pie'
      ? 'Pie'
    : selectedChartType === 'radar'
      ? 'Radar'
      : selectedChartType === 'scatter' ? 'Scatter' : selectedChartType === 'xy' ? 'XY' : 'Bar';
  const recommendedRenderedType = interpretation.recommendation === 'Line'
    ? 'line'
    : interpretation.recommendation === 'Box Plot'
      ? 'boxplot'
    : interpretation.recommendation === 'Histogram'
      ? 'histogram'
    : interpretation.recommendation === 'Bar'
      ? 'bar'
      : interpretation.recommendation === 'Pie'
        ? 'pie'
        : interpretation.recommendation === 'Scatter' ? 'scatter' : null;
  const recommendationLabel = interpretation.recommendation === 'Scatter'
    ? 'Scatter plot'
    : `${interpretation.recommendation} chart`;
  const hasUsableScatterColumns = scatterData.xColumnIndex !== null && scatterData.yColumnIndex !== null;
  const suppressRecommendation = (selectedChartType === 'xy' && interpretation.shape === 'numeric-xy')
    || (selectedChartType === 'scatter' && hasUsableScatterColumns)
    || (selectedChartType === 'radar' && interpretation.columns[0]?.type === 'text/category');
  const hasDifferentRecommendation = selectedChartLabel !== interpretation.recommendation
    && !suppressRecommendation;
  const isSelectedChartIncompatible = hasDifferentRecommendation && (
    ((selectedChartType === 'scatter' || selectedChartType === 'xy') && !hasUsableScatterColumns)
    || (selectedChartType === 'pie' && !pieData.isCompatible)
    || (selectedChartType === 'histogram' && !histogramData.isCompatible)
    || (selectedChartType === 'boxplot' && !boxPlotData.isCompatible)
    || (selectedChartType === 'radar' && interpretation.columns[0]?.type !== 'text/category')
  );
  const detectedRelationship = scatterData.xColumnIndex !== null && scatterData.yColumnIndex !== null
    && (interpretation.shape === 'numeric-xy' || selectedChartType === 'scatter' || selectedChartType === 'xy')
    ? `${scatterData.xName || 'X'} → ${scatterData.yName || 'Y'}`
    : [dimensionName !== 'None' ? dimensionName : '', seriesNames.join(', ')].filter(Boolean).join(' → ') || 'No usable columns';

  function selectChartType(chartType: RenderedChartType) {
    if (chartType === 'boxplot') {
      const labels = createBoxPlotSuggestedLabels(data);
      if (labels) dispatchSettings({ type: 'replace-settings', value: { ...settings, ...labels } });
    }
    setSelectedChartType(chartType);
  }

  function toggleSeriesVisibility(columnId: string): boolean {
    const seriesIndex = seriesColumnIds.indexOf(columnId);
    if (seriesIndex === -1) return false;
    const isVisible = visibleSeriesIndexes.includes(seriesIndex);
    if (isVisible && visibleSeriesIndexes.length === 1) return false;
    dispatchSettings({
      columnId,
      seriesColumnIds,
      type: 'toggle-series-visibility',
    });
    return true;
  }

  function setScatterColumn(axis: 'x' | 'y', columnId: string) {
    const selectedIndex = scatterData.numericColumnIndexes.find((index) => data.columns[index]?.id === columnId);
    if (selectedIndex === undefined) return;
    const xIndex = axis === 'x' ? selectedIndex : scatterData.xColumnIndex;
    const yIndex = axis === 'y' ? selectedIndex : scatterData.yColumnIndex;
    if (xIndex === null || yIndex === null || xIndex === yIndex) return;
    const xName = data.columns[xIndex]?.name.trim() || 'X';
    const yName = data.columns[yIndex]?.name.trim() || 'Y';
    dispatchSettings({
      type: 'replace-settings',
      value: {
        ...settings,
        scatterXColumnId: data.columns[xIndex].id,
        scatterYColumnId: data.columns[yIndex].id,
        title: `${yName} by ${xName}`,
        xAxisTitle: xName,
        yAxisTitle: yName,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await loadCurrentProject();
        if (cancelled) return;

        if (stored.status === 'ready') {
          setData(stored.project.data);
          dispatchSettings({ type: 'replace-settings', value: stored.project.settings });
          setSelectedChartType(stored.project.graphType);
          createdAtRef.current = stored.project.createdAt;
          setIsSampleData(false);
          setProjectNotice('Restored your previous project from this device.');
        } else if (stored.status === 'corrupt') {
          await deleteCurrentProject();
          if (cancelled) return;
          setProjectError('The saved local project was corrupted, so a new graph was opened instead.');
        }
        setSaveStatus('saving');
      } catch {
        if (!cancelled) {
          setIsStorageAvailable(false);
          setSaveStatus('error');
          setProjectError('Local saving is unavailable in this browser. Export a project file to keep a copy.');
        }
      } finally {
        if (!cancelled) setIsProjectReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isProjectReady || !isStorageAvailable) return;

    const timer = window.setTimeout(() => {
      setSaveStatus('saving');
      const project = createProjectSnapshot({
        createdAt: createdAtRef.current,
        data,
        graphType: selectedChartType,
        settings,
      });

      void saveCurrentProject(project)
        .then(() => {
          setProjectError(null);
          setSaveStatus('saved');
        })
        .catch(() => {
          setIsStorageAvailable(false);
          setSaveStatus('error');
          setProjectError('Local saving is unavailable in this browser. Export a project file to keep a copy.');
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [data, isProjectReady, isStorageAvailable, selectedChartType, settings]);

  function updateData(nextData: TabularData, intent: 'edit' | 'replace' | 'structure' = 'edit') {
    setData(nextData);
    setIsSampleData(false);
    if (intent === 'replace') {
      const adaptiveSettings = createAdaptiveSettings(nextData, settings);
      const boxPlotLabels = selectedChartType === 'boxplot'
        ? createBoxPlotSuggestedLabels(nextData)
        : null;
      dispatchSettings({
        type: 'replace-settings',
        value: { ...adaptiveSettings, ...boxPlotLabels },
      });
    } else {
      const suggested = createSuggestedLabels(data, interpretation);
      const defaults = createDefaultGraphSettings();
      const labelsAreAutomatic = isSampleData || (
        settings.title === suggested.title
        && settings.xAxisTitle === suggested.xAxisTitle
        && settings.yAxisTitle === suggested.yAxisTitle
      ) || (
        settings.title === defaults.title
        && settings.xAxisTitle === defaults.xAxisTitle
        && settings.yAxisTitle === defaults.yAxisTitle
      );
      if (labelsAreAutomatic) {
        dispatchSettings({
          type: 'replace-settings',
          value: { ...settings, ...createSuggestedLabels(nextData) },
        });
      }
    }
  }

  async function saveNow() {
    setSaveStatus('saving');
    try {
      await saveCurrentProject(createProjectSnapshot({
        createdAt: createdAtRef.current,
        data,
        graphType: selectedChartType,
        settings,
      }));
      setIsStorageAvailable(true);
      setProjectError(null);
      setProjectNotice(null);
      setSaveStatus('saved');
    } catch {
      setIsStorageAvailable(false);
      setSaveStatus('error');
      setProjectError('Local saving is unavailable in this browser. Export a project file to keep a copy.');
    }
  }

  function exportGraph(type: 'png' | 'svg') {
    const dataUrl = graphCanvasRef.current?.exportImage(type);
    if (!dataUrl) {
      setProjectError('Add valid data before exporting the graph.');
      return;
    }

    setProjectError(null);
    downloadDataUrl(dataUrl, createDownloadFilename(settings.title, type));
  }

  function exportCsv() {
    downloadTextFile(
      serializeDatasetAsCsv(data),
      createDownloadFilename(settings.title, 'csv'),
      'text/csv;charset=utf-8',
    );
  }

  function exportProject() {
    const project = createProjectSnapshot({
      createdAt: createdAtRef.current,
      data,
      graphType: selectedChartType,
      settings,
    });
    downloadTextFile(
      serializeGraphProject(project),
      createDownloadFilename(settings.title, 'graphmaker.json'),
      'application/json',
    );
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = deserializeGraphProject(await file.text());
      if (!parsed.ok) {
        setProjectError(parsed.error);
        return;
      }
      setData(parsed.project.data);
      dispatchSettings({ type: 'replace-settings', value: parsed.project.settings });
      setSelectedChartType(parsed.project.graphType);
      createdAtRef.current = parsed.project.createdAt;
      setIsSampleData(false);
      setProjectError(null);
      setProjectNotice(`Imported ${file.name}. It will be saved locally on this device.`);
      setSaveStatus('saving');
    } catch {
      setProjectError('This project file could not be opened. Choose a valid GraphMaker JSON file.');
    }
  }

  async function resetGraph() {
    const createdAt = new Date().toISOString();
    try {
      await deleteCurrentProject();
    } catch {
      // The new project will still replace the old record during the next autosave.
    }

    setData(createConfiguredData(config));
    dispatchSettings({ type: 'replace-settings', value: createConfiguredSettings(config) });
    setSelectedChartType(config.graphType);
    createdAtRef.current = createdAt;
    setIsSampleData(true);
    setIsCustomizeOpen(false);
    setIsResetConfirming(false);
    setProjectError(null);
    setProjectNotice('Started a new graph.');
    setSaveStatus('saving');
  }

  return (
    <section
      aria-labelledby="editor-heading"
      aria-busy={!isProjectReady}
      className="border-border bg-surface shadow-editor overflow-hidden rounded-xl border"
      data-graph-type={config.graphType}
    >
      <h2 className="sr-only" id="editor-heading">Graph editor</h2>

      {!isProjectReady && (
        <p className="border-border bg-surface-subtle border-b px-4 py-2 text-center text-sm font-medium" role="status">
          Loading your locally saved graph…
        </p>
      )}

      <fieldset className="contents" disabled={!isProjectReady}>

      <div aria-label="Choose a graph type" className="border-border flex min-w-0 gap-2 overflow-x-auto border-b p-3" role="group">
        {chartTypes.map(({ label, glyph }) => {
          const renderedType = label === 'Bar'
            ? 'bar'
            : label === 'Line'
              ? 'line'
                : label === 'Pie'
                  ? 'pie'
                : label === 'Radar'
                  ? 'radar'
                : label === 'Box Plot'
                  ? 'boxplot'
                : label === 'XY'
                  ? 'xy'
                : label === 'Scatter'
                  ? 'scatter'
                  : label === 'Histogram' ? 'histogram' : null;
          const isSelected = renderedType === selectedChartType;

          return (
            <button
              aria-pressed={isSelected}
              className={isSelected
                ? 'bg-brand shrink-0 rounded-md border border-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm'
                : 'border-border text-text hover:border-slate-300 hover:bg-surface-subtle shrink-0 rounded-md border bg-white px-3.5 py-2 text-sm font-medium'}
              key={label}
              onClick={() => renderedType && selectChartType(renderedType)}
              type="button"
            >
              <span aria-hidden="true" className="mr-2">{glyph}</span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid min-w-0 lg:grid-cols-[2fr_3fr]">
        <section aria-labelledby="data-heading" className="border-border order-2 min-w-0 border-t p-4 sm:p-5 lg:order-1 lg:border-t-0 lg:border-r">
          <DataGrid data={data} isSampleData={isSampleData} onChange={updateData} />
        </section>

        <section aria-labelledby="preview-heading" className="order-1 min-w-0 p-4 sm:p-5 lg:order-2">
          <h3 className="sr-only" id="preview-heading">Graph preview</h3>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-lg font-bold">
              {settings.title.trim() || 'Untitled graph'}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              {selectedChartType === 'xy' && (
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold">
                  <input
                    checked={settings.xyConnectPoints}
                    className="accent-brand h-4 w-4"
                    onChange={(event) => dispatchSettings({
                      type: 'set-xy-connect-points',
                      value: event.target.checked,
                    })}
                    type="checkbox"
                  />
                  Connect points
                </label>
              )}
              <button
                aria-controls="customize-panel"
                aria-expanded={isCustomizeOpen}
                className="button-secondary"
                onClick={() => setIsCustomizeOpen((isOpen) => !isOpen)}
                type="button"
              >
                <ButtonIcon>⚙</ButtonIcon>Customize
              </button>
            </div>
          </div>

          {isCustomizeOpen && (
            <CustomizePanel
              chartType={selectedChartType}
              dispatch={dispatchSettings}
              onScatterColumnChange={setScatterColumn}
              scatterMapping={selectedChartType === 'scatter' && hasUsableScatterColumns ? {
                columns: scatterData.numericColumnIndexes.map((index) => ({
                  id: data.columns[index].id,
                  name: data.columns[index].name || `Column ${index + 1}`,
                })),
                xColumnId: data.columns[scatterData.xColumnIndex!].id,
                yColumnId: data.columns[scatterData.yColumnIndex!].id,
              } : undefined}
              series={seriesDefinitions}
              settings={settings}
            />
          )}

          <section aria-label="Detected data" className="border-border bg-surface-subtle mt-3 rounded-md border px-3 py-2 text-sm">
            <p className="text-text-muted flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span><span className="text-text font-semibold">Detected:</span> {detectedRelationship}</span>
              <span aria-hidden="true">·</span>
              {suppressRecommendation
                ? <span><span className="text-text font-semibold">Chart:</span> {selectedChartLabel}</span>
                : <span><span className="text-text font-semibold">Recommended:</span> {recommendationLabel}</span>}
              {hasDifferentRecommendation && recommendedRenderedType && !isSelectedChartIncompatible && (
                <button className="text-brand font-semibold underline underline-offset-2" onClick={() => selectChartType(recommendedRenderedType)} type="button">
                  Switch to {interpretation.recommendation}
                </button>
              )}
            </p>
            {selectedChartType === 'scatter' && scatterData.extraNumericColumnCount > 0 && (
              <p className="text-text-muted mt-1">{scatterData.extraNumericColumnCount} additional numeric column{scatterData.extraNumericColumnCount === 1 ? ' is' : 's are'} available in Customize.</p>
            )}
            {selectedChartType === 'pie' && pieData.isCompatible && pieData.numericColumnIndexes.length > 1 && (
              <p className="text-text-muted mt-1">Pie chart uses {pieData.seriesName || 'the first numeric series'}. Change series in Customize.</p>
            )}
            {selectedChartType === 'histogram' && histogramData.isCompatible && histogramData.numericColumnIndexes.length > 1 && (
              <p className="text-text-muted mt-1">Histogram uses {histogramData.seriesName || 'the first numeric series'}. Change series in Customize.</p>
            )}
            {selectedChartType === 'boxplot' && boxPlotData.isCompatible && (
              <p className="text-text-muted mt-1">Box plot groups: {boxPlotData.groups.map((group) => group.name).join(', ') || 'None'}.</p>
            )}
          </section>
          {hasVisibleMixedScale && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              These series use very different scales. Hide a series for a clearer comparison.
            </p>
          )}
          {selectedChartType === 'pie' && interpretation.pointCount > 8 && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              Pie charts are harder to read with many categories. Bar chart may be clearer.
            </p>
          )}

          <div className="mt-2 w-full overflow-hidden">
            <GraphCanvas
              chartType={selectedChartType}
              data={data}
              incompatibleAction={isSelectedChartIncompatible && recommendedRenderedType ? {
                label: `Switch to ${interpretation.recommendation}`,
                onClick: () => selectChartType(recommendedRenderedType),
              } : undefined}
              onToggleSeries={toggleSeriesVisibility}
              ref={graphCanvasRef}
              settings={settings}
            />
          </div>

          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <button className="button-secondary" onClick={() => exportGraph('png')} type="button"><ButtonIcon>▧</ButtonIcon>PNG</button>
              <button className="button-secondary" onClick={() => exportGraph('svg')} type="button"><ButtonIcon>⌁</ButtonIcon>SVG</button>
              <button className="button-secondary" onClick={exportCsv} type="button"><ButtonIcon>▤</ButtonIcon>CSV</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="button-secondary" onClick={saveNow} type="button"><ButtonIcon>♡</ButtonIcon>Save locally</button>
              <button className="button-primary" onClick={() => exportGraph('png')} type="button"><ButtonIcon>↓</ButtonIcon>Download</button>
            </div>
          </div>

          <div className="border-border mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-text-muted text-xs" role="status">
              {saveStatus === 'checking' && 'Checking this device for a saved project…'}
              {saveStatus === 'saving' && 'Saving locally…'}
              {saveStatus === 'saved' && 'Saved locally on this device. No cloud backup.'}
              {saveStatus === 'error' && 'Local autosave unavailable.'}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <button className="text-text-muted hover:text-text font-medium" onClick={() => setIsResetConfirming(true)} type="button">New graph</button>
              <button className="text-text-muted hover:text-text font-medium" onClick={() => projectInputRef.current?.click()} type="button">Import project</button>
              <button className="text-text-muted hover:text-text font-medium" onClick={exportProject} type="button">Export project</button>
              <input
                accept=".json,application/json"
                aria-label="Choose GraphMaker project file"
                hidden
                onChange={importProject}
                ref={projectInputRef}
                type="file"
              />
            </div>
          </div>

          {isResetConfirming && (
            <div className="border-border bg-surface-subtle mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2" role="alertdialog" aria-labelledby="reset-graph-heading">
              <div>
                <p className="font-semibold" id="reset-graph-heading">Start a new graph?</p>
                <p className="text-text-muted text-sm">This replaces the current data and settings on this device.</p>
              </div>
              <div className="flex gap-2">
                <button className="button-secondary" onClick={() => setIsResetConfirming(false)} type="button">Cancel</button>
                <button className="button-primary" onClick={resetGraph} type="button">Reset graph</button>
              </div>
            </div>
          )}

          {projectError && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{projectError}</p>}
          {projectNotice && <p className="text-success mt-3 text-sm font-medium" role="status">{projectNotice}</p>}
        </section>
      </div>
      </fieldset>
    </section>
  );
}
