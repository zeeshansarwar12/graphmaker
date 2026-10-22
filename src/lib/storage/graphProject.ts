import { cartesianError, defaultCartesian } from '../../graph/configs/cartesian';
import { createDefaultGraphSettings } from '../../graph/configs/graphSettings';
import type { GraphSettings } from '../../graph/configs/graphSettings';
import { createSampleData } from '../../graph/transforms/tabularData';
import type { TabularData } from '../../graph/transforms/tabularData';

export const currentProjectId = 'current-project';
export const graphProjectSchemaVersion = 1;

export function graphProjectStorageId(slug = '/'): string {
  const normalizedSlug = slug.trim();
  return normalizedSlug === '' || normalizedSlug === '/'
    ? currentProjectId
    : `${currentProjectId}:${normalizedSlug}`;
}

export interface GraphProject {
  tableBackup?: { data: TabularData; settings: GraphSettings };
  createdAt: string;
  data: TabularData;
  graphType: 'bar' | 'boxplot' | 'dotplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'supplydemand' | 'xy' | 'equation' | 'tree';
  id: typeof currentProjectId;
  name: string;
  schemaVersion: typeof graphProjectSchemaVersion;
  settings: GraphSettings;
  updatedAt: string;
}

export type ProjectParseResult =
  | { ok: true; project: GraphProject }
  | { error: string; ok: false };

interface CreateProjectInput {
  tableBackup?: GraphProject['tableBackup'];
  createdAt?: string;
  data: TabularData;
  graphType: GraphProject['graphType'];
  now?: string;
  settings: GraphSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isTabularData(value: unknown): value is TabularData {
  if (!isRecord(value) || !Array.isArray(value.columns) || !Array.isArray(value.rows)) return false;
  if (value.columns.length === 0) return false;

  const columnsAreValid = value.columns.every((column) => (
    isRecord(column)
    && typeof column.id === 'string'
    && typeof column.name === 'string'
    && (column.kind === 'label' || column.kind === 'number')
  ));
  if (!columnsAreValid) return false;
  const columnCount = value.columns.length;

  return value.rows.every((row) => (
    isRecord(row)
    && typeof row.id === 'string'
    && Array.isArray(row.cells)
    && row.cells.length === columnCount
    && row.cells.every((cell) => typeof cell === 'string')
  ));
}

function isGraphSettings(value: unknown): value is GraphSettings {
  return isRecord(value)
    && (value.cartesian === undefined || (isRecord(value.cartesian) && ['xMin', 'xMax', 'yMin', 'yMax', 'xStep', 'yStep'].every(key => value.cartesian !== null && isRecord(value.cartesian) && (value.cartesian[key] === null || typeof value.cartesian[key] === 'number')) && typeof value.cartesian.origin === 'boolean' && typeof value.cartesian.equalScale === 'boolean' && cartesianError(value.cartesian as unknown as GraphSettings['cartesian']) === null))
    && (value.equations === undefined || (Array.isArray(value.equations) && value.equations.length <= 8 && value.equations.every(expression => typeof expression === 'string' && expression.length <= 512)))
    && ['showTrendline', 'xyPlotOnClick', 'xySnapToGrid'].every(key => value[key] === undefined || typeof value[key] === 'boolean')
    && (value.dotPlotSeriesColumnId === undefined
      || value.dotPlotSeriesColumnId === null
      || typeof value.dotPlotSeriesColumnId === 'string')
    && (value.dotSize === undefined
      || (typeof value.dotSize === 'number' && value.dotSize >= 4 && value.dotSize <= 24))
    && (value.hiddenSeriesIds === undefined || (
      Array.isArray(value.hiddenSeriesIds)
      && value.hiddenSeriesIds.every((id) => typeof id === 'string')
    ))
    && (value.histogramBinCount === undefined
      || value.histogramBinCount === null
      || (typeof value.histogramBinCount === 'number'
        && Number.isInteger(value.histogramBinCount)
        && value.histogramBinCount >= 1
        && value.histogramBinCount <= 50))
    && (value.histogramSeriesColumnId === undefined
      || value.histogramSeriesColumnId === null
      || typeof value.histogramSeriesColumnId === 'string')
    && (value.pieSeriesColumnId === undefined
      || value.pieSeriesColumnId === null
      || typeof value.pieSeriesColumnId === 'string')
    && (value.radarFilled === undefined || typeof value.radarFilled === 'boolean')
    && (value.scatterXColumnId === undefined
      || value.scatterXColumnId === null
      || typeof value.scatterXColumnId === 'string')
    && (value.scatterYColumnId === undefined
      || value.scatterYColumnId === null
      || typeof value.scatterYColumnId === 'string')
    && (value.supplyDemandInputMode === undefined || value.supplyDemandInputMode === 'inverse' || value.supplyDemandInputMode === 'schedule')
    && ['supplyDemandDemandShift','supplyDemandSupplyShift'].every(key => value[key] === undefined || (typeof value[key] === 'number' && Number.isFinite(value[key]) && Math.abs(value[key] as number) <= 1000000))
    && ['supplyDemandShowOriginal','supplyDemandMonochrome'].every(key => value[key] === undefined || typeof value[key] === 'boolean')
    && (value.supplyDemandDemandColumnId === undefined
      || value.supplyDemandDemandColumnId === null
      || typeof value.supplyDemandDemandColumnId === 'string')
    && (value.supplyDemandSupplyColumnId === undefined
      || value.supplyDemandSupplyColumnId === null
      || typeof value.supplyDemandSupplyColumnId === 'string')
    && (value.supplyDemandXColumnId === undefined
      || value.supplyDemandXColumnId === null
      || typeof value.supplyDemandXColumnId === 'string')
    && (value.orientation === 'horizontal' || value.orientation === 'vertical')
    && Array.isArray(value.seriesColors)
    && value.seriesColors.every((color) => typeof color === 'string')
    && typeof value.showGrid === 'boolean'
    && typeof value.showLegend === 'boolean'
    && (value.showEquilibrium === undefined || typeof value.showEquilibrium === 'boolean')
    && (value.showOutliers === undefined || typeof value.showOutliers === 'boolean')
    && typeof value.showValueLabels === 'boolean'
    && typeof value.title === 'string'
    && typeof value.xAxisTitle === 'string'
    && (value.xyConnectPoints === undefined || typeof value.xyConnectPoints === 'boolean')
    && typeof value.yAxisTitle === 'string';
}

export function createProjectSnapshot({
  tableBackup,
  createdAt,
  data,
  graphType,
  now = new Date().toISOString(),
  settings,
}: CreateProjectInput): GraphProject {
  return {
    ...(tableBackup ? { tableBackup } : {}),
    createdAt: createdAt ?? now,
    data,
    graphType,
    id: currentProjectId,
    name: settings.title.trim() || 'Untitled graph',
    schemaVersion: graphProjectSchemaVersion,
    settings,
    updatedAt: now,
  };
}

export function createNewProject(now = new Date().toISOString()): GraphProject {
  return createProjectSnapshot({
    data: createSampleData(),
    graphType: 'bar',
    now,
    settings: createDefaultGraphSettings(),
  });
}

export function parseGraphProject(value: unknown): ProjectParseResult {
  if (!isRecord(value)) return { error: 'This project does not contain valid graph data.', ok: false };
  if (value.schemaVersion !== graphProjectSchemaVersion) {
    return { error: 'This project uses an unsupported file version.', ok: false };
  }

  if (
    value.id !== currentProjectId
    || (value.graphType !== 'bar' && value.graphType !== 'boxplot' && value.graphType !== 'dotplot' && value.graphType !== 'histogram' && value.graphType !== 'line' && value.graphType !== 'pie' && value.graphType !== 'radar' && value.graphType !== 'scatter' && value.graphType !== 'supplydemand' && value.graphType !== 'xy' && value.graphType !== 'equation' && value.graphType !== 'tree')
    || typeof value.name !== 'string'
    || !isIsoDate(value.createdAt)
    || !isIsoDate(value.updatedAt)
    || (value.tableBackup !== undefined && (!isRecord(value.tableBackup) || !isTabularData(value.tableBackup.data) || !isGraphSettings(value.tableBackup.settings)))
    || !isTabularData(value.data)
    || !isGraphSettings(value.settings)
  ) {
    return { error: 'This project does not contain valid graph data.', ok: false };
  }

  const project = value as unknown as GraphProject;
  return {
    ok: true,
    project: {
      ...project,
      settings: {
        ...project.settings,
        cartesian: project.settings.cartesian ?? { ...defaultCartesian },
        equations: project.settings.equations ?? ['y = 2x + 3'],
        showTrendline: project.settings.showTrendline ?? false,
        xyPlotOnClick: project.settings.xyPlotOnClick ?? false,
        xySnapToGrid: project.settings.xySnapToGrid ?? true,
        dotPlotSeriesColumnId: project.settings.dotPlotSeriesColumnId ?? null,
        dotSize: project.settings.dotSize ?? 10,
        hiddenSeriesIds: project.settings.hiddenSeriesIds ?? [],
        histogramBinCount: project.settings.histogramBinCount ?? null,
        histogramSeriesColumnId: project.settings.histogramSeriesColumnId ?? null,
        pieSeriesColumnId: project.settings.pieSeriesColumnId ?? null,
        radarFilled: project.settings.radarFilled ?? true,
        scatterXColumnId: project.settings.scatterXColumnId ?? null,
        scatterYColumnId: project.settings.scatterYColumnId ?? null,
        showEquilibrium: project.settings.showEquilibrium ?? true,
        showOutliers: project.settings.showOutliers ?? true,
        supplyDemandInputMode: project.settings.supplyDemandInputMode ?? 'inverse',
        supplyDemandDemandShift: project.settings.supplyDemandDemandShift ?? 0,
        supplyDemandSupplyShift: project.settings.supplyDemandSupplyShift ?? 0,
        supplyDemandShowOriginal: project.settings.supplyDemandShowOriginal ?? true,
        supplyDemandMonochrome: project.settings.supplyDemandMonochrome ?? false,
        supplyDemandDemandColumnId: project.settings.supplyDemandDemandColumnId ?? null,
        supplyDemandSupplyColumnId: project.settings.supplyDemandSupplyColumnId ?? null,
        supplyDemandXColumnId: project.settings.supplyDemandXColumnId ?? null,
        xyConnectPoints: project.settings.xyConnectPoints ?? true,
      },
    },
  };
}

export function serializeGraphProject(project: GraphProject): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeGraphProject(input: string): ProjectParseResult {
  try {
    return parseGraphProject(JSON.parse(input) as unknown);
  } catch {
    return { error: 'This project file is not valid JSON.', ok: false };
  }
}
