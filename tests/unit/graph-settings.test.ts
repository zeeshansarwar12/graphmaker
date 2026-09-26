import { describe, expect, it } from 'vitest';

import {
  createDefaultGraphSettings,
  defaultSeriesColors,
  graphSettingsReducer,
} from '../../src/graph/configs/graphSettings';

describe('graph settings state', () => {
  it('provides readable reusable defaults without sharing the palette array', () => {
    const first = createDefaultGraphSettings();
    const second = createDefaultGraphSettings();

    expect(first).toMatchObject({
      histogramBinCount: null,
      histogramSeriesColumnId: null,
      orientation: 'vertical',
      pieSeriesColumnId: null,
      radarFilled: true,
      scatterXColumnId: null,
      scatterYColumnId: null,
      showGrid: true,
      showLegend: true,
      showOutliers: true,
      showValueLabels: true,
      title: 'Monthly Sales',
      xAxisTitle: 'Month',
      xyConnectPoints: true,
      yAxisTitle: 'Sales',
    });
    expect(first.seriesColors).toEqual(defaultSeriesColors);
    expect(first.seriesColors).not.toBe(second.seriesColors);
    expect(first.hiddenSeriesIds).toEqual([]);
    expect(first.hiddenSeriesIds).not.toBe(second.hiddenSeriesIds);
  });

  it('toggles box plot outliers', () => {
    const updated = graphSettingsReducer(createDefaultGraphSettings(), {
      type: 'set-outliers',
      value: false,
    });

    expect(updated.showOutliers).toBe(false);
  });

  it('toggles filled radar areas', () => {
    const updated = graphSettingsReducer(createDefaultGraphSettings(), {
      type: 'set-radar-filled',
      value: false,
    });

    expect(updated.radarFilled).toBe(false);
  });

  it('toggles connected XY points', () => {
    const updated = graphSettingsReducer(createDefaultGraphSettings(), {
      type: 'set-xy-connect-points',
      value: false,
    });

    expect(updated.xyConnectPoints).toBe(false);
  });

  it('sets explicit scatter columns', () => {
    const withX = graphSettingsReducer(createDefaultGraphSettings(), {
      type: 'set-scatter-x-column',
      value: 'age-column',
    });
    const withY = graphSettingsReducer(withX, {
      type: 'set-scatter-y-column',
      value: 'height-column',
    });

    expect(withY.scatterXColumnId).toBe('age-column');
    expect(withY.scatterYColumnId).toBe('height-column');
  });

  it('updates common fields immutably', () => {
    const initial = createDefaultGraphSettings();
    const titled = graphSettingsReducer(initial, { type: 'set-title', value: 'Revenue' });
    const withoutGrid = graphSettingsReducer(titled, { type: 'set-grid', value: false });
    const recolored = graphSettingsReducer(withoutGrid, {
      index: 0,
      type: 'set-series-color',
      value: '#112233',
    });

    expect(initial.title).toBe('Monthly Sales');
    expect(initial.seriesColors[0]).toBe('#2563eb');
    expect(recolored).toMatchObject({ showGrid: false, title: 'Revenue' });
    expect(recolored.seriesColors[0]).toBe('#112233');
  });

  it('extends the palette when a later series is customized', () => {
    const updated = graphSettingsReducer(createDefaultGraphSettings(), {
      index: 8,
      type: 'set-series-color',
      value: '#abcdef',
    });

    expect(updated.seriesColors[8]).toBe('#abcdef');
  });

  it('selects a value series for pie charts', () => {
    const updated = graphSettingsReducer(createDefaultGraphSettings(), {
      type: 'set-pie-series',
      value: 'profit-column',
    });

    expect(updated.pieSeriesColumnId).toBe('profit-column');
  });

  it('sets histogram series and manual bin count', () => {
    const withSeries = graphSettingsReducer(createDefaultGraphSettings(), {
      type: 'set-histogram-series',
      value: 'science-column',
    });
    const withBins = graphSettingsReducer(withSeries, {
      type: 'set-histogram-bin-count',
      value: 7,
    });

    expect(withBins.histogramSeriesColumnId).toBe('science-column');
    expect(withBins.histogramBinCount).toBe(7);
    expect(graphSettingsReducer(withBins, {
      type: 'set-histogram-bin-count',
      value: null,
    }).histogramBinCount).toBeNull();
  });

  it('toggles series visibility but keeps at least one series visible', () => {
    const initial = createDefaultGraphSettings();
    const withoutVisitors = graphSettingsReducer(initial, {
      columnId: 'visitors',
      seriesColumnIds: ['visitors', 'orders'],
      type: 'toggle-series-visibility',
    });
    const attemptedEmpty = graphSettingsReducer(withoutVisitors, {
      columnId: 'orders',
      seriesColumnIds: ['visitors', 'orders'],
      type: 'toggle-series-visibility',
    });
    const restored = graphSettingsReducer(attemptedEmpty, {
      columnId: 'visitors',
      seriesColumnIds: ['visitors', 'orders'],
      type: 'toggle-series-visibility',
    });

    expect(withoutVisitors.hiddenSeriesIds).toEqual(['visitors']);
    expect(attemptedEmpty).toBe(withoutVisitors);
    expect(restored.hiddenSeriesIds).toEqual([]);
  });

  it('preserves semantic axis titles when orientation changes', () => {
    const initial = createDefaultGraphSettings();
    const horizontal = graphSettingsReducer(initial, {
      type: 'set-orientation',
      value: 'horizontal',
    });

    expect(horizontal).toMatchObject({
      orientation: 'horizontal',
      xAxisTitle: 'Sales',
      yAxisTitle: 'Month',
    });
    expect(graphSettingsReducer(horizontal, {
      type: 'set-orientation',
      value: 'vertical',
    })).toMatchObject({
      orientation: 'vertical',
      xAxisTitle: 'Month',
      yAxisTitle: 'Sales',
    });
  });
});
