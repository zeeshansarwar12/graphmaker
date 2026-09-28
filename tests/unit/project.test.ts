import { describe, expect, it } from 'vitest';

import {
  createDownloadFilename,
  serializeDatasetAsCsv,
} from '../../src/graph/exporters/download';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createSampleData } from '../../src/graph/transforms/tabularData';
import {
  createNewProject,
  createProjectSnapshot,
  deserializeGraphProject,
  graphProjectStorageId,
  parseGraphProject,
  serializeGraphProject,
} from '../../src/lib/storage/graphProject';

const timestamp = '2026-09-16T08:00:00.000Z';

describe('graph project persistence model', () => {
  it('keeps homepage and specialist-page storage keys separate', () => {
    expect(graphProjectStorageId()).toBe('current-project');
    expect(graphProjectStorageId('/')).toBe('current-project');
    expect(graphProjectStorageId('/xy-graph-maker/')).toBe(
      'current-project:/xy-graph-maker/',
    );
    expect(graphProjectStorageId('/radar-chart-maker/')).toBe(
      'current-project:/radar-chart-maker/',
    );
  });

  it('creates a complete versioned snapshot for saving and restoring', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'bar',
      now: timestamp,
      settings: createDefaultGraphSettings(),
    });
    const restored = parseGraphProject(structuredClone(project));

    expect(project).toMatchObject({
      createdAt: timestamp,
      graphType: 'bar',
      id: 'current-project',
      name: 'Monthly Sales',
      schemaVersion: 1,
      updatedAt: timestamp,
    });
    expect(restored).toEqual({ ok: true, project });
  });

  it('round-trips portable project JSON', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'bar',
      now: timestamp,
      settings: { ...createDefaultGraphSettings(), title: 'Portable graph' },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({
      ok: true,
      project,
    });
  });

  it('persists the scatter chart selection', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'scatter',
      now: timestamp,
      settings: createDefaultGraphSettings(),
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists explicit scatter column mapping', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'scatter',
      now: timestamp,
      settings: {
        ...createDefaultGraphSettings(),
        scatterXColumnId: 'column-2',
        scatterYColumnId: 'column-1',
      },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists the XY chart selection', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'xy',
      now: timestamp,
      settings: createDefaultGraphSettings(),
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists the pie chart and selected value series', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'pie',
      now: timestamp,
      settings: { ...createDefaultGraphSettings(), pieSeriesColumnId: 'column-2' },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists the radar chart and filled style', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'radar',
      now: timestamp,
      settings: { ...createDefaultGraphSettings(), radarFilled: false },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists histogram series and bin settings', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'histogram',
      now: timestamp,
      settings: {
        ...createDefaultGraphSettings(),
        histogramBinCount: 7,
        histogramSeriesColumnId: 'column-2',
      },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists dot plot series and dot size', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'dotplot',
      now: timestamp,
      settings: {
        ...createDefaultGraphSettings(),
        dotPlotSeriesColumnId: 'column-2',
        dotSize: 14,
      },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists supply and demand mapping and equilibrium visibility', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'supplydemand',
      now: timestamp,
      settings: {
        ...createDefaultGraphSettings(),
        showEquilibrium: false,
        supplyDemandDemandColumnId: 'column-2',
        supplyDemandSupplyColumnId: 'column-3',
        supplyDemandXColumnId: 'column-1',
      },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists the box plot selection and outlier visibility', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'boxplot',
      now: timestamp,
      settings: { ...createDefaultGraphSettings(), showOutliers: false },
    });

    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
  });

  it('persists series visibility and upgrades older version-one settings', () => {
    const project = createProjectSnapshot({
      data: createSampleData(),
      graphType: 'bar',
      now: timestamp,
      settings: { ...createDefaultGraphSettings(), hiddenSeriesIds: ['column-2'] },
    });
    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });

    const legacy = structuredClone(project) as unknown as { settings: Record<string, unknown> };
    delete legacy.settings.hiddenSeriesIds;
    delete legacy.settings.dotPlotSeriesColumnId;
    delete legacy.settings.dotSize;
    delete legacy.settings.histogramBinCount;
    delete legacy.settings.histogramSeriesColumnId;
    delete legacy.settings.pieSeriesColumnId;
    delete legacy.settings.radarFilled;
    delete legacy.settings.scatterXColumnId;
    delete legacy.settings.scatterYColumnId;
    delete legacy.settings.showEquilibrium;
    delete legacy.settings.showOutliers;
    delete legacy.settings.supplyDemandDemandColumnId;
    delete legacy.settings.supplyDemandSupplyColumnId;
    delete legacy.settings.supplyDemandXColumnId;
    delete legacy.settings.xyConnectPoints;
    const restored = parseGraphProject(legacy);
    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('Expected a valid legacy project');
    expect(restored.project.settings.hiddenSeriesIds).toEqual([]);
    expect(restored.project.settings.dotPlotSeriesColumnId).toBeNull();
    expect(restored.project.settings.dotSize).toBe(10);
    expect(restored.project.settings.histogramBinCount).toBeNull();
    expect(restored.project.settings.histogramSeriesColumnId).toBeNull();
    expect(restored.project.settings.pieSeriesColumnId).toBeNull();
    expect(restored.project.settings.radarFilled).toBe(true);
    expect(restored.project.settings.scatterXColumnId).toBeNull();
    expect(restored.project.settings.scatterYColumnId).toBeNull();
    expect(restored.project.settings.showEquilibrium).toBe(true);
    expect(restored.project.settings.showOutliers).toBe(true);
    expect(restored.project.settings.supplyDemandDemandColumnId).toBeNull();
    expect(restored.project.settings.supplyDemandSupplyColumnId).toBeNull();
    expect(restored.project.settings.supplyDemandXColumnId).toBeNull();
    expect(restored.project.settings.xyConnectPoints).toBe(true);
  });

  it('rejects corrupted stored state and malformed project files', () => {
    expect(parseGraphProject({
      id: 'current-project',
      schemaVersion: 1,
      settings: { title: 'Incomplete' },
    })).toEqual({ error: 'This project does not contain valid graph data.', ok: false });
    expect(deserializeGraphProject('{broken')).toEqual({
      error: 'This project file is not valid JSON.',
      ok: false,
    });
  });

  it('creates a fresh sample project when reset', () => {
    const project = createNewProject(timestamp);

    expect(project.createdAt).toBe(timestamp);
    expect(project.settings).toEqual(createDefaultGraphSettings());
    expect(project.data).toEqual(createSampleData());
  });
});

describe('dataset export', () => {
  it('serializes headers, quotes, missing cells, and safe filenames', () => {
    const data = createSampleData();
    data.columns[0].name = 'Month, period';
    data.rows[0].cells[0] = 'Jan "A"';
    data.rows[0].cells[1] = '';

    expect(serializeDatasetAsCsv(data).split('\r\n').slice(0, 2)).toEqual([
      '"Month, period",Sales',
      '"Jan ""A""",',
    ]);
    expect(createDownloadFilename(' Quarterly Revenue! ', 'graphmaker.json')).toBe(
      'quarterly-revenue.graphmaker.json',
    );
  });
});
