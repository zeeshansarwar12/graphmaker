import { describe, expect, it } from 'vitest';

import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createXyChartView } from '../../src/graph/configs/xyChart';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

describe('XY chart', () => {
  it('renders paired numeric values as a connected line on two value axes', () => {
    const data = createDataFromRows([
      ['X', 'Y'],
      ['1', '4'],
      ['2', '8'],
      ['3', '6'],
    ]);
    const view = createXyChartView(data, {
      ...createDefaultGraphSettings(),
      title: 'Y by X',
      xAxisTitle: 'X',
      yAxisTitle: 'Y',
    });

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready XY chart');
    expect(view.points).toEqual([[1, 4], [2, 8], [3, 6]]);
    expect(view.options.series).toMatchObject([{ data: view.points, type: 'line' }]);
    expect(view.options.xAxis).toMatchObject({ name: 'X', type: 'value' });
    expect(view.options.yAxis).toMatchObject({ name: 'Y', type: 'value' });
    expect(view.summary).toContain('connected in data order');
  });

  it('reports skipped invalid pairs without drawing misleading points', () => {
    const view = createXyChartView(createDataFromRows([
      ['X', 'Y'],
      ['1', '4'],
      ['bad', '8'],
      ['3', ''],
    ]), createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready XY chart');
    expect(view.points).toEqual([[1, 4]]);
    expect(view.warning).toBe('2 rows were ignored because X or Y was blank or invalid.');
  });

  it('renders separate points when connection is disabled', () => {
    const data = createDataFromRows([
      ['X', 'Y'],
      ['1', '4'],
      ['2', '8'],
    ]);
    const view = createXyChartView(data, {
      ...createDefaultGraphSettings(),
      xyConnectPoints: false,
    });

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready XY chart');
    expect(view.options.series).toMatchObject([{ data: view.points, type: 'scatter' }]);
    expect(view.summary).toContain('shown as unconnected points');
  });
});
