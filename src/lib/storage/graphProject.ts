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
  createdAt: string;
  data: TabularData;
  graphType: 'bar' | 'boxplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'xy';
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
    && (value.orientation === 'horizontal' || value.orientation === 'vertical')
    && Array.isArray(value.seriesColors)
    && value.seriesColors.every((color) => typeof color === 'string')
    && typeof value.showGrid === 'boolean'
    && typeof value.showLegend === 'boolean'
    && (value.showOutliers === undefined || typeof value.showOutliers === 'boolean')
    && typeof value.showValueLabels === 'boolean'
    && typeof value.title === 'string'
    && typeof value.xAxisTitle === 'string'
    && (value.xyConnectPoints === undefined || typeof value.xyConnectPoints === 'boolean')
    && typeof value.yAxisTitle === 'string';
}

export function createProjectSnapshot({
  createdAt,
  data,
  graphType,
  now = new Date().toISOString(),
  settings,
}: CreateProjectInput): GraphProject {
  return {
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
    || (value.graphType !== 'bar' && value.graphType !== 'boxplot' && value.graphType !== 'histogram' && value.graphType !== 'line' && value.graphType !== 'pie' && value.graphType !== 'radar' && value.graphType !== 'scatter' && value.graphType !== 'xy')
    || typeof value.name !== 'string'
    || !isIsoDate(value.createdAt)
    || !isIsoDate(value.updatedAt)
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
        hiddenSeriesIds: project.settings.hiddenSeriesIds ?? [],
        histogramBinCount: project.settings.histogramBinCount ?? null,
        histogramSeriesColumnId: project.settings.histogramSeriesColumnId ?? null,
        pieSeriesColumnId: project.settings.pieSeriesColumnId ?? null,
        radarFilled: project.settings.radarFilled ?? true,
        scatterXColumnId: project.settings.scatterXColumnId ?? null,
        scatterYColumnId: project.settings.scatterYColumnId ?? null,
        showOutliers: project.settings.showOutliers ?? true,
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
