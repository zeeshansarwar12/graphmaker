import { describe, expect, it } from 'vitest';

import { createDotPlotChartView } from '../../src/graph/configs/dotPlotChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import {
  createDotPlotData,
  createDotPlotSuggestedLabels,
} from '../../src/graph/transforms/dotPlot';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function table(headers: string[], rows: string[][]) {
  return createDataFromRows([headers, ...rows]);
}

const observations = table(
  ['Value'],
  [['12'], ['14'], ['14'], ['15'], ['15'], ['15'], ['18'], ['18'], ['18'], ['18'], ['24']],
);

describe('dot plot data and rendering', () => {
  it('stacks repeated observations and reports exact frequency counts', () => {
    const dotPlot = createDotPlotData(observations);

    expect(dotPlot.frequencies).toEqual([
      { count: 1, value: 12 },
      { count: 2, value: 14 },
      { count: 3, value: 15 },
      { count: 4, value: 18 },
      { count: 1, value: 24 },
    ]);
    expect(dotPlot.points.filter((point) => point.value === 15)).toEqual([
      { stack: 1, value: 15 },
      { stack: 2, value: 15 },
      { stack: 3, value: 15 },
    ]);
    expect(dotPlot.points.filter((point) => point.value === 18).map((point) => point.stack))
      .toEqual([1, 2, 3, 4]);
  });

  it('uses real headers for dot-plot labels and a numeric X-axis', () => {
    const labels = createDotPlotSuggestedLabels(observations);
    const view = createDotPlotChartView(observations, {
      ...createDefaultGraphSettings(),
      ...labels,
    });

    expect(labels).toEqual({
      title: 'Dot Plot of Value',
      xAxisTitle: 'Value',
      yAxisTitle: 'Frequency',
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready dot plot');
    expect(view.options).toMatchObject({
      series: [{ data: [[12, 1], [14, 1], [14, 2], [15, 1], [15, 2], [15, 3], [18, 1], [18, 2], [18, 3], [18, 4], [24, 1]], type: 'scatter' }],
      xAxis: { name: 'Value', scale: true, type: 'value' },
      yAxis: { interval: 1, max: 4, min: 0, name: 'Frequency', type: 'value' },
    });
  });

  it('excludes invalid values without overlapping the valid stack', () => {
    const data = table(['Score'], [['10'], ['invalid'], ['10'], [''], ['12']]);
    const dotPlot = createDotPlotData(data);
    const view = createDotPlotChartView(data, createDefaultGraphSettings());

    expect(dotPlot.values).toEqual([10, 10, 12]);
    expect(dotPlot.skippedRowCount).toBe(1);
    expect(dotPlot.points).toEqual([
      { stack: 1, value: 10 },
      { stack: 2, value: 10 },
      { stack: 1, value: 12 },
    ]);
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready dot plot');
    expect(view.warning).toBe('1 invalid value was excluded from the dot plot.');
  });

  it('defaults to one numeric column and honors a selected series', () => {
    const data = table(
      ['Math', 'Science'],
      [['12', '20'], ['12', '21'], ['14', '21']],
    );
    const first = createDotPlotData(data);
    const selected = createDotPlotData(data, data.columns[1].id);

    expect(first).toMatchObject({ isCompatible: true, seriesName: 'Math', values: [12, 12, 14] });
    expect(selected).toMatchObject({ isCompatible: true, seriesName: 'Science', values: [20, 21, 21] });
    expect(selected.frequencies).toEqual([{ count: 1, value: 20 }, { count: 2, value: 21 }]);
  });

  it('does not force-render category, time-series, or paired XY data', () => {
    const cases = [
      table(['Category', 'Value'], [['A', '10'], ['B', '20']]),
      table(['Date', 'Value'], [['2026-01-01', '10'], ['2026-01-02', '20']]),
      table(['X', 'Y'], [['1', '2'], ['2', '4']]),
    ];

    for (const data of cases) {
      expect(createDotPlotData(data).isCompatible).toBe(false);
      const view = createDotPlotChartView(data, createDefaultGraphSettings());
      expect(view.status).toBe('empty');
      if (view.status !== 'empty') throw new Error('Expected an incompatible dot plot');
      expect(view.title).toBe('This data may not be suitable for a dot plot.');
      expect(view.message).toContain('Dot plots work best with a single numeric series of observations.');
      expect(view.message).toMatch(/Try a (Bar|Line|Scatter|Pie) chart instead\./);
    }
  });
});
