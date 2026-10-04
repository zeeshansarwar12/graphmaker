import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { graphTools } from '../../content/graphTools';
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
import { createDotPlotData, createDotPlotSuggestedLabels } from '../../graph/transforms/dotPlot';
import {
  createSupplyDemandData,
  createSupplyDemandSuggestedLabels,
} from '../../graph/transforms/supplyDemand';
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

type RenderedChartType = 'bar' | 'boxplot' | 'dotplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'supplydemand' | 'xy';

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
  const dataSectionRef = useRef<HTMLElement>(null);
  const graphCanvasRef = useRef<GraphCanvasHandle>(null);
  const previewSectionRef = useRef<HTMLElement>(null);
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

  function scrollToEditorSection(section: 'customize' | 'data' | 'preview') {
    if (section === 'customize') {
      setIsCustomizeOpen(true);
      window.requestAnimationFrame(() => {
        document.getElementById('customize-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    const target = section === 'data' ? dataSectionRef.current : previewSectionRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
  const dotPlotData = useMemo(
    () => createDotPlotData(data, settings.dotPlotSeriesColumnId),
    [data, settings.dotPlotSeriesColumnId],
  );
  const supplyDemandData = useMemo(
    () => createSupplyDemandData(data, {
      demandColumnId: settings.supplyDemandDemandColumnId,
      supplyColumnId: settings.supplyDemandSupplyColumnId,
      xColumnId: settings.supplyDemandXColumnId,
    }),
    [
      data,
      settings.supplyDemandDemandColumnId,
      settings.supplyDemandSupplyColumnId,
      settings.supplyDemandXColumnId,
    ],
  );
  const boxPlotData = useMemo(() => createBoxPlotData(data), [data]);
  const activeSeriesColumnIndexes = selectedChartType === 'boxplot'
    ? boxPlotData.groups.map((group) => group.columnIndex)
    : selectedChartType === 'histogram'
    ? histogramData.numericColumnIndexes
    : selectedChartType === 'dotplot'
    ? dotPlotData.numericColumnIndexes
    : selectedChartType === 'supplydemand'
    ? [supplyDemandData.demandColumnIndex, supplyDemandData.supplyColumnIndex]
      .filter((index): index is number => index !== null)
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
  const hasVisibleMixedScale = selectedChartType !== 'boxplot' && selectedChartType !== 'dotplot' && selectedChartType !== 'histogram' && selectedChartType !== 'supplydemand'
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
    : selectedChartType === 'dotplot'
      ? 'Dot Plot'
    : selectedChartType === 'pie'
      ? 'Pie'
    : selectedChartType === 'radar'
      ? 'Radar'
    : selectedChartType === 'supplydemand'
      ? 'Supply & Demand'
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
    || (selectedChartType === 'dotplot' && dotPlotData.isCompatible)
    || (selectedChartType === 'supplydemand' && supplyDemandData.isCompatible)
    || (selectedChartType === 'radar' && interpretation.columns[0]?.type === 'text/category');
  const hasDifferentRecommendation = selectedChartLabel !== interpretation.recommendation
    && !suppressRecommendation;
  const isSelectedChartIncompatible = hasDifferentRecommendation && (
    ((selectedChartType === 'scatter' || selectedChartType === 'xy') && !hasUsableScatterColumns)
    || (selectedChartType === 'pie' && !pieData.isCompatible)
    || (selectedChartType === 'histogram' && !histogramData.isCompatible)
    || (selectedChartType === 'dotplot' && !dotPlotData.isCompatible)
    || (selectedChartType === 'supplydemand' && !supplyDemandData.isCompatible)
    || (selectedChartType === 'boxplot' && !boxPlotData.isCompatible)
    || (selectedChartType === 'radar' && interpretation.columns[0]?.type !== 'text/category')
  );
  const detectedRelationship = selectedChartType === 'supplydemand'
    ? `${supplyDemandData.xName || 'Quantity'} → ${[supplyDemandData.demandName, supplyDemandData.supplyName].filter(Boolean).join(', ') || 'Demand, Supply'}`
    : scatterData.xColumnIndex !== null && scatterData.yColumnIndex !== null
    && (interpretation.shape === 'numeric-xy' || selectedChartType === 'scatter' || selectedChartType === 'xy')
    ? `${scatterData.xName || 'X'} → ${scatterData.yName || 'Y'}`
    : [dimensionName !== 'None' ? dimensionName : '', seriesNames.join(', ')].filter(Boolean).join(' → ') || 'No usable columns';

  function selectChartType(chartType: RenderedChartType) {
    if (chartType === 'boxplot') {
      const labels = createBoxPlotSuggestedLabels(data);
      if (labels) dispatchSettings({ type: 'replace-settings', value: { ...settings, ...labels } });
    }
    if (chartType === 'dotplot') {
      const labels = createDotPlotSuggestedLabels(data, settings.dotPlotSeriesColumnId);
      if (labels) dispatchSettings({ type: 'replace-settings', value: { ...settings, ...labels } });
    }
    if (chartType === 'supplydemand') {
      dispatchSettings({
        type: 'replace-settings',
        value: { ...settings, ...createSupplyDemandSuggestedLabels(data) },
      });
    }
    setSelectedChartType(chartType);
  }

  function setDotPlotSeries(columnId: string) {
    const labels = createDotPlotSuggestedLabels(data, columnId);
    dispatchSettings({
      type: 'replace-settings',
      value: {
        ...settings,
        ...(labels ?? {}),
        dotPlotSeriesColumnId: columnId,
      },
    });
  }

  function setSupplyDemandColumn(role: 'demand' | 'supply' | 'x', columnId: string) {
    const actionType = role === 'x'
      ? 'set-supply-demand-x-column'
      : role === 'demand'
        ? 'set-supply-demand-demand-column'
        : 'set-supply-demand-supply-column';
    const selectedColumn = data.columns.find((column) => column.id === columnId);
    dispatchSettings({
      type: 'replace-settings',
      value: {
        ...settings,
        ...(role === 'x' && selectedColumn ? { xAxisTitle: selectedColumn.name || 'Quantity' } : {}),
        ...(actionType === 'set-supply-demand-x-column' ? { supplyDemandXColumnId: columnId } : {}),
        ...(actionType === 'set-supply-demand-demand-column' ? { supplyDemandDemandColumnId: columnId } : {}),
        ...(actionType === 'set-supply-demand-supply-column' ? { supplyDemandSupplyColumnId: columnId } : {}),
      },
    });
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
        const stored = await loadCurrentProject(config.slug);
        if (cancelled) return;

        const storedProjectMatchesPage = stored.status === 'ready'
          && (config.slug === '/' || stored.project.graphType === config.graphType);

        if (storedProjectMatchesPage) {
          setData(stored.project.data);
          dispatchSettings({ type: 'replace-settings', value: stored.project.settings });
          setSelectedChartType(stored.project.graphType);
          createdAtRef.current = stored.project.createdAt;
          setIsSampleData(false);
          setProjectNotice('Restored your previous project from this device.');
        } else if (stored.status === 'ready') {
          await deleteCurrentProject(config.slug);
          if (cancelled) return;
          setData(createConfiguredData(config));
          dispatchSettings({ type: 'replace-settings', value: createConfiguredSettings(config) });
          setSelectedChartType(config.graphType);
          createdAtRef.current = new Date().toISOString();
          setIsSampleData(true);
          setProjectNotice('Opened this tool with its recommended chart preset.');
        } else if (stored.status === 'corrupt') {
          await deleteCurrentProject(config.slug);
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
  }, [config]);

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

      void saveCurrentProject(project, config.slug)
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
  }, [config.slug, data, isProjectReady, isStorageAvailable, selectedChartType, settings]);

  function updateData(nextData: TabularData, intent: 'edit' | 'replace' | 'structure' = 'edit') {
    setData(nextData);
    setIsSampleData(false);
    if (intent === 'replace') {
      const adaptiveSettings = createAdaptiveSettings(nextData, settings);
      const boxPlotLabels = selectedChartType === 'boxplot'
        ? createBoxPlotSuggestedLabels(nextData)
        : null;
      const dotPlotLabels = selectedChartType === 'dotplot'
        ? createDotPlotSuggestedLabels(nextData)
        : null;
      const supplyDemandLabels = selectedChartType === 'supplydemand'
        ? createSupplyDemandSuggestedLabels(nextData)
        : null;
      dispatchSettings({
        type: 'replace-settings',
        value: { ...adaptiveSettings, ...boxPlotLabels, ...dotPlotLabels, ...supplyDemandLabels },
      });
    } else {
      const suggested = selectedChartType === 'supplydemand'
        ? createSupplyDemandSuggestedLabels(data)
        : selectedChartType === 'dotplot'
        ? createDotPlotSuggestedLabels(data, settings.dotPlotSeriesColumnId)
          ?? createSuggestedLabels(data, interpretation)
        : createSuggestedLabels(data, interpretation);
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
        const nextLabels = selectedChartType === 'supplydemand'
          ? createSupplyDemandSuggestedLabels(nextData)
          : selectedChartType === 'dotplot'
          ? createDotPlotSuggestedLabels(nextData, settings.dotPlotSeriesColumnId)
          : createSuggestedLabels(nextData);
        dispatchSettings({
          type: 'replace-settings',
          value: { ...settings, ...(nextLabels ?? {}) },
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
      }), config.slug);
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
      await deleteCurrentProject(config.slug);
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
        {graphTools.map(({ label, icon, type: renderedType }) => {
          const isSelected = renderedType === selectedChartType;

          return (
            <button
              aria-pressed={isSelected}
              className={isSelected
                ? 'bg-brand shrink-0 rounded-md border border-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm'
                : 'border-border text-text hover:border-slate-300 hover:bg-surface-subtle shrink-0 rounded-md border bg-white px-3.5 py-2 text-sm font-medium'}
              key={label}
              onClick={() => renderedType && selectChartType(renderedType)}
              type="b…20971 tokens truncated…       { title: 'Percentage-like values', description: 'When every value falls between 0 and 100, the chart uses a consistent 0–100 scale.' },
        { title: 'Other numeric ranges', description: 'For larger values, the radar chart generator chooses a rounded maximum above the highest observation.' },
        { title: 'Comparable units matter', description: 'Use metrics with compatible meanings or normalize them first; otherwise the polygon shape can give a misleading comparison.' },
      ],
      title: 'How radar scales work',
    },
  ],
  canonical: '/radar-chart-maker/',
  comparison: {
    first: {
      body: 'Use a radar chart to compare the overall profile of one or more series across the same set of metrics. The polygon shape makes relative strengths and weaknesses easy to scan.',
      title: 'Use a radar chart',
    },
    intro: 'Radar and bar charts can compare the same measurements, but they emphasize different aspects of the data.',
    second: {
      body: 'Use a bar chart when precise value comparison and straightforward ranking matter most, especially when there are many categories or readers need to judge small differences.',
      title: 'Use a bar chart',
    },
    title: 'Radar Chart vs Bar Chart',
  },
  definition: [
    'A radar chart places each metric on an axis radiating from a shared center. Values are connected into a polygon, making the overall profile of each series visible at a glance. Radar charts are also called spider charts or web charts.',
    'This radar graph maker uses the first text column for axis labels and turns every numeric column into a separate series. Real column headers appear in the legend, so teams, products, candidates, or scenarios remain clearly identified.',
    'Use the online radar chart maker to paste data or import CSV and Excel files, then customize and export the chart directly in your browser.',
  ],
  editor: {
    graphType: 'radar',
    initialSettings: {
      radarFilled: true,
      showGrid: true,
      showLegend: true,
      showValueLabels: false,
      title: 'Team Comparison by Metric',
      yAxisTitle: '',
    },
    sampleData: {
      columns: radarSampleData.columns.map((column) => ({ ...column })),
      rows: radarSampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/radar-chart-maker/',
  },
  example: {
    caption: 'Put metric names in the first column and one comparable numeric series in each following column.',
    headers: ['Metric', 'Team A', 'Team B'],
    rows: radarSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. The free radar chart maker requires no signup and exports clean PNG or SVG files without a watermark.',
      question: 'Is this radar chart maker free?',
    },
    {
      answer: 'Use a text column first for metric names. Add one or more numeric columns after it; each numeric header becomes a legend label and radar series.',
      question: 'How should I arrange radar chart data?',
    },
    {
      answer: 'Yes. The spider chart maker supports multiple numeric series, which are drawn on the same metric axes for profile comparison.',
      question: 'Can I compare multiple series?',
    },
    {
      answer: 'Values between 0 and 100 use a shared 0–100 scale. Other ranges use a sensible rounded maximum based on the largest value in the dataset.',
      question: 'How does the chart choose its scale?',
    },
    {
      answer: 'The editor shows an actionable message identifying the missing or invalid cell instead of drawing a misleading chart.',
      question: 'What happens when a value is missing or invalid?',
    },
    {
      answer: 'The chart still renders, but the editor warns when there are more than 12 metrics because labels and polygons can become difficult to read.',
      question: 'How many metrics should a radar chart contain?',
    },
    {
      answer: 'Yes. Paste a spreadsheet table or upload CSV and XLSX files. Your data remains in the browser.',
      question: 'Can I import radar data from Excel or CSV?',
    },
  ],
  features: [
    { title: 'Multiple series', description: 'Compare several teams, products, or options across one shared set of metrics.' },
    { title: 'Real legend labels', description: 'Use the original numeric column headers as series names in the chart legend.' },
    { title: 'Automatic scaling', description: 'Use 0–100 for percentage-like values and rounded maxima for other numeric ranges.' },
    { title: 'Readable metric guidance', description: 'Warn when too many axes may make the radar chart hard to interpret.' },
    { title: 'Spreadsheet imports', description: 'Paste tables or upload CSV and Excel files through the shared data grid.' },
    { title: 'Local save and export', description: 'Save on this device and download the finished chart as PNG, SVG, or CSV.' },
  ],
  h1: 'Radar Chart Maker',
  howTo: [
    { title: 'Add metrics and series', description: 'Enter metric names in the first column, then add one or more numeric series with clear headers.' },
    { title: 'Review the shared scale', description: 'Check that the metrics use comparable units and confirm the automatically selected range.' },
    { title: 'Customize and export', description: 'Adjust the fill, grid, legend, labels, and colors, then download the finished radar chart.' },
  ],
  intro: 'Compare strengths and patterns across multiple metrics with this online radar chart maker. Paste or upload data and create a polished spider chart for free.',
  metaDescription: 'Create radar and spider charts online from one or multiple data series. Import CSV or Excel data, use automatic scales, and export free with no signup.',
  relatedHeading: 'Related tools',
  relatedTools: [
    { name: 'Bar Graph Maker', description: 'Compare metric values precisely with familiar rectangular bars.', href: '/bar-graph-maker/' },
    { name: 'Pie Chart Maker', description: 'Show how categories contribute to one whole.', href: '/pie-chart-maker/' },
    { name: 'Line Graph Maker', description: 'Track one or more numeric series across ordered categories or time.', href: '/line-graph-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a radar chart?',
    example: 'Example radar chart data',
    faq: 'Radar chart maker FAQ',
    faqIntro: 'Answers about arranging metrics, comparing series, and choosing a readable scale.',
    features: 'Radar chart maker features',
    howTo: 'How to make a radar chart',
  },
  slug: '/radar-chart-maker/',
  title: 'Radar Chart Maker — Create Spider Charts Online | GraphMaker',
  useCases: {
    intro: 'Radar charts work best when a small set of comparable metrics describes an overall profile.',
    items: [
      { title: 'Team or candidate profiles', description: 'Compare strengths across skills, competencies, or performance measures.' },
      { title: 'Product comparisons', description: 'Contrast products or plans across shared attributes such as quality, cost, and support.' },
      { title: 'Before-and-after reviews', description: 'Show how a profile changes across the same assessment criteria.' },
    ],
    title: 'When to use a radar chart',
  },
} satisfies ToolPageConfig;

export const histogramToolPageConfig = {
  additionalSections: [
    {
      id: 'histogram-bins',
      intro: 'A histogram groups nearby observations into intervals so the overall distribution is easier to see.',
      items: [
        { title: 'Automatic bin count', description: 'The editor chooses a practical number of bins from the number of valid observations.' },
        { title: 'Manual adjustment', description: 'Open Customize when you need to compare the same data with fewer or more intervals.' },
        { title: 'Frequency counts', description: 'Each bar reports how many observations fall inside its displayed numeric range.' },
      ],
      title: 'How histogram bins work',
    },
  ],
  canonical: '/histogram-maker/',
  comparison: {
    first: {
      body: 'Use a histogram when the shape of one numeric distribution matters. Touching bars reveal concentrations, gaps, skew, and the frequency of value ranges.',
      title: 'Use a histogram',
    },
    intro: 'Both charts summarize raw numeric observations, but they answer different questions about a distribution.',
    second: {
      body: 'Use a box plot when you need a compact summary of median, quartiles, spread, and outliers, especially when comparing several groups.',
      title: 'Use a box plot',
    },
    title: 'Histogram vs Box Plot',
  },
  definition: [
    'A histogram displays the frequency distribution of numeric observations. Values are grouped into continuous intervals called bins, and the height of each touching bar shows how many observations fall in that range.',
    'Unlike a bar graph, a histogram uses numeric ranges rather than separate named categories. The order and width of the intervals carry meaning, so the bars touch instead of appearing as independent columns.',
    'This online histogram maker accepts pasted data plus CSV and Excel files, safely excludes invalid observations, and lets you review or adjust the automatic bin count before exporting.',
  ],
  editor: {
    graphType: 'histogram',
    initialSettings: {
      histogramBinCount: null,
      showGrid: true,
      showLegend: false,
      showValueLabels: true,
      title: 'Distribution of Scores',
      xAxisTitle: 'Score',
      yAxisTitle: 'Frequency',
    },
    sampleData: histogramSampleData,
    slug: '/histogram-maker/',
  },
  example: {
    caption: `These ${histogramSampleData.rows.length} sample observations each represent one measured score.`,
    headers: histogramSampleData.columns.map((column) => column.name),
    rows: histogramSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    { question: 'Is this histogram maker free?', answer: 'Yes. You can create and export a histogram without signing up or adding a watermark.' },
    { question: 'What data should I enter?', answer: 'Enter raw numeric observations in a column. Do not enter pre-counted categories unless you want a bar graph instead.' },
    { question: 'How are histogram bins selected?', answer: 'The automatic setting uses the number of valid observations to choose a readable bin count. You can select a different count inside Customize.' },
    { question: 'What happens to blank or invalid cells?', answer: 'Blank cells are ignored. Invalid non-numeric values are excluded and reported beside the chart so the source data can be corrected.' },
    { question: 'Can I import values from Excel or CSV?', answer: 'Yes. Paste a spreadsheet column or upload CSV and XLSX files. Processing remains in your browser.' },
  ],
  features: [
    { title: 'Automatic bins', description: 'Generate a practical interval count based on the size of the dataset.' },
    { title: 'Adjustable intervals', description: 'Choose a manual bin count from Customize when a different level of detail is useful.' },
    { title: 'Safe data cleanup', description: 'Ignore blanks and clearly report non-numeric observations that were excluded.' },
    { title: 'Frequency tooltips', description: 'Inspect the numeric range and observation count represented by each bar.' },
    { title: 'Spreadsheet imports', description: 'Paste raw values or import them from CSV and Excel files through the shared editor.' },
    { title: 'Local save and export', description: 'Save the project on this device and export the finished histogram as PNG, SVG, or CSV.' },
  ],
  h1: 'Histogram Maker',
  howTo: [
    { title: 'Add raw observations', description: 'Enter one numeric value per row, or paste and import a spreadsheet column.' },
    { title: 'Review the bins', description: 'Use the automatic intervals or open Customize to select a different bin count.' },
    { title: 'Customize and export', description: 'Adjust labels, color, and grid visibility, then download the completed histogram.' },
  ],
  intro: 'Create a histogram from raw numeric data and inspect the shape of its distribution. Paste values or import CSV and Excel files, then export the result for free.',
  metaDescription: 'Create a histogram online from raw numeric data. Use automatic or adjustable bins, import CSV or Excel values, and export free with no signup.',
  relatedTools: [
    { name: 'Box Plot Maker', description: 'Summarize median, quartiles, spread, and outliers from raw numeric data.', href: '/box-plot-maker/' },
    { name: 'Dot Plot Maker', description: 'Show every raw observation and stack repeated values by frequency.', href: '/dot-plot-maker/' },
    { name: 'Bar Graph Maker', description: 'Compare values across separate named categories instead of continuous ranges.', href: '/bar-graph-maker/' },
    { name: 'Scatter Plot Maker', description: 'Explore the relationship between two numeric measurements.', href: '/scatter-plot-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a histogram?',
    example: 'Example histogram data',
    faq: 'Histogram maker FAQ',
    faqIntro: 'Answers about raw observations, intervals, imports, and excluded values.',
    features: 'Histogram maker features',
    howTo: 'How to make a histogram',
  },
  slug: '/histogram-maker/',
  title: 'Histogram Maker — Frequency Charts Online | GraphMaker',
  useCases: {
    intro: 'Histograms are useful when you want to understand how numeric observations are distributed across a continuous range.',
    items: [
      { title: 'Inspect score distributions', description: 'See where test results or ratings are concentrated and whether the values are balanced or skewed.' },
      { title: 'Review measurements', description: 'Study variation in laboratory results, dimensions, durations, or other repeated measurements.' },
      { title: 'Spot gaps and unusual ranges', description: 'Find empty intervals, multiple peaks, or thin tails that deserve closer investigation.' },
    ],
    title: 'When to use a histogram',
  },
} satisfies ToolPageConfig;

export const dotPlotToolPageConfig = {
  canonical: '/dot-plot-maker/',
  comparison: {
    first: {
      body: 'Choose a dot plot when you want readers to see every observation. Repeated values stack vertically, so exact values, small clusters, gaps, and unusual points remain visible.',
      title: 'Use a dot plot',
    },
    intro: 'Both charts show a numeric distribution, but they preserve different levels of detail.',
    second: {
      body: 'Choose a histogram for a larger dataset when grouped intervals communicate the overall distribution more clearly than individual observations.',
      title: 'Use a histogram',
    },
    title: 'Dot Plot vs Histogram',
  },
  definition: [
    'A dot plot places each raw numeric observation on a number line. When a value occurs more than once, its dots stack vertically to show the frequency without hiding any observations.',
    'The horizontal axis uses true numeric spacing, so the visual distance between 12 and 14 is twice the distance between 14 and 15. This makes a dot plot useful for inspecting exact values in a small or medium-sized dataset.',
  ],
  editor: {
    graphType: 'dotplot',
    initialSettings: {
      dotPlotSeriesColumnId: null,
      dotSize: 10,
      showGrid: true,
      showLegend: false,
      showValueLabels: false,
      title: 'Dot Plot of Value',
      xAxisTitle: 'Value',
      yAxisTitle: 'Frequency',
    },
    sampleData: dotPlotSampleData,
    slug: '/dot-plot-maker/',
  },
  example: {
    caption: `These ${dotPlotSampleData.rows.length} sample observations each become one dot. Repeated values stack into visible frequency columns.`,
    headers: dotPlotSampleData.columns.map((column) => column.name),
    rows: dotPlotSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    { question: 'Is this dot plot maker free?', answer: 'Yes. This free dot plot maker works online without signup and exports clean PNG and SVG files without a watermark.' },
    { question: 'What data works best in a dot plot?', answer: 'Use one numeric column of raw observations. Each row becomes one dot, and repeated numbers stack vertically.' },
    { question: 'How are repeated values displayed?', answer: `Every repeated observation receives the same horizontal position and the next available vertical stack position. In the sample, ${dotPlotSampleData.rows.filter((row) => row.cells[0] === '18').length} occurrences of 18 appear as ${dotPlotSampleData.rows.filter((row) => row.cells[0] === '18').length} dots above 18.` },
    { question: 'Can I choose between multiple numeric columns?', answer: 'Yes. The dot plot creator uses the first numeric series by default and lets you choose another series inside Customize. Columns are never merged silently.' },
    { question: 'Can I paste data or upload Excel and CSV files?', answer: 'Yes. Paste a spreadsheet column or upload CSV and Excel files. Your data is processed locally in the browser.' },
  ],
  features: [
    { title: 'Repeated-value stacking', description: 'Display every observation while stacking duplicate numeric values by frequency.' },
    { title: 'True numeric spacing', description: 'Position dots on a continuous numeric X-axis instead of evenly spaced categories.' },
    { title: 'Series selection', description: 'Choose one numeric column in Customize when the dataset contains several series.' },
    { title: 'Compatibility guidance', description: 'Get a clear explanation and a better chart recommendation when the data is categorical, time-based, or paired XY data.' },
    { title: 'Spreadsheet imports', description: 'Paste values or import CSV and Excel files through the shared graph editor.' },
    { title: 'Local save and export', description: 'Save on this device and export the finished dot plot as PNG, SVG, or CSV.' },
  ],
  h1: 'Dot Plot Maker',
  howTo: [
    { title: 'Add raw observations', description: 'Enter one numeric value per row, paste a spreadsheet column, or upload a CSV or Excel file.' },
    { title: 'Review the stacked dots', description: 'Confirm that repeated values stack vertically and use Customize to choose a series or adjust dot size.' },
    { title: 'Label and export', description: 'Use the real column header for the title and axis, then download the dot plot as PNG or SVG.' },
  ],
  intro: 'Create a dot plot from raw numeric observations in seconds. This online dot plot maker stacks repeated values, supports paste, CSV, and Excel, and requires no signup.',
  metaDescription: 'Create a dot plot online from raw numeric data. Stack repeated values, import CSV or Excel, customize dot size, and export free with no signup.',
  relatedTools: [
    { name: 'Histogram Maker', description: 'Group numeric observations into intervals to see the overall distribution shape.', href: '/histogram-maker/' },
    { name: 'Box Plot Maker', description: 'Summarize median, quartiles, spread, and outliers from raw observations.', href: '/box-plot-maker/' },
    { name: 'Scatter Plot Maker', description: 'Plot paired numeric measurements to explore relationships between variables.', href: '/scatter-plot-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a dot plot?',
    example: 'Example dot plot data',
    faq: 'Dot plot maker FAQ',
    faqIntro: 'Answers about observations, repeated values, imports, and series selection.',
    features: 'Dot plot maker features',
    howTo: 'How to make a dot plot',
  },
  slug: '/dot-plot-maker/',
  title: 'Dot Plot Maker — Create a Dot Plot Online | GraphMaker',
  useCases: {
    intro: 'A dot plot generator is most useful when exact observations still matter and the dataset is small enough to read point by point.',
    items: [
      { title: 'Compare repeated measurements', description: 'See which scores, durations, or measured values occur most often without grouping them into bins.' },
      { title: 'Find gaps and clusters', description: 'Spot concentrations, empty ranges, and isolated observations along a true numeric scale.' },
      { title: 'Teach distributions', description: 'Show students how individual observations build a frequency distribution while keeping the raw values visible.' },
    ],
    title: 'When to use a dot plot',
  },
} satisfies ToolPageConfig;

export const supplyDemandToolPageConfig = {
  beforeComparisonSections: [
    {
      id: 'equilibrium',
      intro: 'The editor compares the vertical difference between demand and supply at each quantity and interpolates only across adjacent supplied points when that difference changes sign.',
      items: [
        { title: 'Exact match', description: 'When demand and supply have the same value in a row, that quantity and value are reported directly as equilibrium.' },
        { title: 'Between two rows', description: 'When the curves cross between adjacent quantities, the tool estimates the intersection using straight-line interpolation.' },
        { title: 'No in-range crossing', description: 'If the supplied curves never meet or cross, the graph reports that no equilibrium appears in the entered range.' },
      ],
      title: 'How equilibrium works',
    },
  ],
  canonical: '/supply-and-demand-graph-maker/',
  comparison: {
    first: {
      body: 'The demand curve shows the value buyers associate with each quantity. A downward-sloping curve means demand values decrease as quantity increases.',
      title: 'Read the demand curve',
    },
    intro: 'Read both curves against the numeric quantity axis, then compare their vertical positions and intersection.',
    second: {
      body: 'The supply curve shows the value sellers associate with each quantity. An upward-sloping curve means supply values increase as quantity increases. Their intersection is the estimated equilibrium.',
      title: 'Read the supply curve',
    },
    title: 'How to read supply and demand curves',
  },
  definition: [
    'A supply and demand graph plots quantity on the horizontal axis and price or value on the vertical axis. Demand commonly slopes downward while supply slopes upward, making their relationship easy to compare.',
    'This economics graph maker keeps quantity on a true numeric scale, so irregular gaps between entered quantities remain proportional. It also identifies an approximate equilibrium only when the supplied curves meet or cross inside the entered range.',
  ],
  editor: {
    graphType: 'supplydemand',
    initialSettings: {
      showEquilibrium: true,
      showGrid: true,
      showLegend: true,
      showValueLabels: false,
      title: 'Supply and Demand Graph',
      xAxisTitle: 'Quantity',
      yAxisTitle: 'Price / Value',
    },
    sampleData: supplyDemandSampleData,
    slug: '/supply-and-demand-graph-maker/',
  },
  example: {
    caption: 'Use one numeric quantity column followed by demand and supply values. Equivalent headers can be remapped inside Customize.',
    headers: ['Quantity', 'Demand', 'Supply'],
    rows: supplyDemandSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    { question: 'Is this supply and demand graph maker free?', answer: 'Yes. The free supply and demand graph maker works online without signup or a watermark.' },
    { question: 'How should I arrange my data?', answer: 'Use three numeric columns for quantity, demand, and supply. Headers such as Q, Buyers, and Sellers are detected, and you can change every mapping in Customize.' },
    { question: 'How is equilibrium calculated?', answer: 'An exact matching row is used directly. If demand and supply cross between adjacent quantities, the supply demand graph generator uses straight-line interpolation between those supplied points.' },
    { question: 'What if the curves never cross?', answer: 'No equilibrium is displayed outside your data. The editor reports that no equilibrium appears within the supplied quantity range.' },
    { question: 'Can I paste or upload economics data?', answer: 'Yes. Paste a spreadsheet table or upload CSV and Excel files. Processing and local saving remain in your browser.' },
  ],
  features: [
    { title: 'Explicit curve mapping', description: 'Choose the quantity, demand, and supply columns without silently merging numeric series.' },
    { title: 'True numeric quantity axis', description: 'Preserve proportional spacing for regular or irregular quantity values.' },
    { title: 'Equilibrium detection', description: 'Report exact or interpolated intersections only when they occur inside the entered range.' },
    { title: 'Focused validation', description: 'Handle missing columns, blank cells, non-numeric values, and non-crossing curves without crashing.' },
    { title: 'CSV and Excel import', description: 'Paste data or upload CSV and XLSX files through the same data editor used on every graph page.' },
    { title: 'Local save and export', description: 'Save the project on this device and export the finished graph as PNG, SVG, or CSV.' },
  ],
  h1: 'Supply and Demand Graph Maker',
  howTo: [
    { title: 'Add quantity and curve values', description: 'Enter three columns, paste a spreadsheet table, or import a CSV or Excel file.' },
    { title: 'Confirm the column mapping', description: 'Open Customize to select the quantity axis, demand series, and supply series when headers differ.' },
    { title: 'Review equilibrium and export', description: 'Check the in-range intersection, adjust axis titles, and download the graph as PNG or SVG.' },
  ],
  intro: 'Create supply and demand curves on a true numeric quantity axis, map your columns, and estimate an in-range equilibrium with this online supply and demand graph maker.',
  metaDescription: 'Create a supply and demand graph online. Map quantity, demand, and supply, detect in-range equilibrium, import Excel or CSV, and export free.',
  relatedHeading: 'Related economics and graph tools',
  relatedTools: [
    { name: 'Line Graph Maker', description: 'Compare multiple connected series across categories or dates.', href: '/line-graph-maker/' },
    { name: 'XY Graph Maker', description: 'Plot paired values on true numeric X and Y axes.', href: '/xy-graph-maker/' },
    { name: 'Scatter Plot Maker', description: 'Explore relationships between paired numeric observations.', href: '/scatter-plot-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a supply and demand graph?',
    example: 'Example supply and demand data',
    faq: 'Supply and demand graph maker FAQ',
    faqIntro: 'Answers about curve mapping, equilibrium, imports, and non-crossing data.',
    features: 'Supply and demand graph maker features',
    howTo: 'How to make a supply and demand graph',
  },
  slug: '/supply-and-demand-graph-maker/',
  title: 'Supply and Demand Graph Maker — Free Online | GraphMaker',
  useCases: {
    intro: 'Use this online supply and demand graph maker when two value curves need to be compared against a shared quantity scale.',
    items: [
      { title: 'Economics assignments', description: 'Turn a classroom table into readable supply and demand curves with a clearly reported equilibrium.' },
      { title: 'Scenario comparisons', description: 'Visualize how buyer and seller values change across regular or irregular quantity levels.' },
      { title: 'Reports and presentations', description: 'Export a clean economics graph for documents, slides, worksheets, or teaching material.' },
    ],
    title: 'When to use this tool',
  },
} satisfies ToolPageConfig;
