import { describe, expect, it } from 'vitest';

import {
  createScatterChartView,
  formatScatterTooltip,
} from '../../src/graph/configs/scatterChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createScatterData } from '../../src/graph/transforms/chartData';
import {
  createAdaptiveSettings,
  detectDataShape,
} from '../../src/graph/transforms/dataInterpretation';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function table(headers: string[], rows: string[][]) {
  return createDataFromRows([headers, ...rows]);
}

const heightWeight = table(
  ['Height', 'Weight'],
  [['150', '48'], ['155', '52'], ['160', '57'], ['165', '61'], ['170', '67'], ['175', '73'], ['180', '81']],
);

describe('scatter data interpretation', () => {
  it('detects numeric X/Y, maps the first two columns, and recommends Scatter', () => {
    const interpretation = detectDataShape(heightWeight);
    const scatter = createScatterData(heightWeight);

    expect(interpretation).toMatchObject({
      dimensionColumnIndex: 0,
      recommendation: 'Scatter',
      seriesColumnIndexes: [1],
      shape: 'numeric-xy',
    });
    expect(scatter).toMatchObject({
      extraNumericColumnCount: 0,
      xColumnIndex: 0,
      xName: 'Height',
      yColumnIndex: 1,
      yName: 'Weight',
    });
  });

  it('generates the title and numeric axis labels from headers', () => {
    const settings = createAdaptiveSettings(heightWeight, createDefaultGraphSettings());
    const view = createScatterChartView(heightWeight, settings);

    expect(settings).toMatchObject({
      title: 'Weight by Height',
      xAxisTitle: 'Height',
      yAxisTitle: 'Weight',
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready scatter plot');
    expect(view.options.xAxis).toMatchObject({ name: 'Height', type: 'value' });
    expect(view.options.yAxis).toMatchObject({ name: 'Weight', type: 'value' });
  });

  it('keeps numeric values as coordinates so irregular gaps remain proportional', () => {
    const data = table(['X', 'Y'], [['1', '3'], ['2', '5'], ['10', '20']]);
    const view = createScatterChartView(data, createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready scatter plot');
    expect(view.points).toEqual([[1, 3], [2, 5], [10, 20]]);
    expect(view.points[1][0] - view.points[0][0]).toBe(1);
    expect(view.points[2][0] - view.points[1][0]).toBe(8);
    expect(view.options.xAxis).toMatchObject({ type: 'value' });
    expect(view.options.yAxis).toMatchObject({ type: 'value' });
  });

  it('ignores blank and invalid rows and reports what was skipped', () => {
    const data = table(
      ['Height', 'Weight'],
      [['150', '48'], ['', ''], ['', '52'], ['160', 'bad'], ['165', '61']],
    );
    const scatter = createScatterData(data);
    const view = createScatterChartView(data, createDefaultGraphSettings());

    expect(scatter.points).toEqual([[150, 48], [165, 61]]);
    expect(scatter.skippedRowCount).toBe(2);
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready scatter plot');
    expect(view.warning).toBe('2 rows were ignored because X or Y was blank or invalid.');
  });

  it('uses only the first two numeric columns in Scatter without changing the distribution recommendation', () => {
    const data = table(
      ['Height', 'Weight', 'Age'],
      [['150', '48', '20'], ['165', '61', '30'], ['180', '81', '40']],
    );

    expect(detectDataShape(data)).toMatchObject({
      recommendation: 'Box Plot',
      shape: 'multi-numeric-distribution',
    });
    expect(createScatterData(data)).toMatchObject({
      extraNumericColumnCount: 1,
      points: [[150, 48], [165, 61], [180, 81]],
      xName: 'Height',
      yName: 'Weight',
    });
  });

  it('maps explicitly selected numeric columns', () => {
    const data = table(
      ['Height', 'Weight', 'Age'],
      [['150', '48', '20'], ['165', '61', '30'], ['180', '81', '40']],
    );
    const scatter = createScatterData(data, 'column-3', 'column-1');
    const view = createScatterChartView(data, {
      ...createDefaultGraphSettings(),
      scatterXColumnId: 'column-3',
      scatterYColumnId: 'column-1',
      title: 'Height by Age',
      xAxisTitle: 'Age',
      yAxisTitle: 'Height',
    });

    expect(scatter).toMatchObject({
      points: [[20, 150], [30, 165], [40, 180]],
      xName: 'Age',
      yName: 'Height',
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready scatter plot');
    expect(view.options.xAxis).toMatchObject({ name: 'Age', type: 'value' });
    expect(view.options.yAxis).toMatchObject({ name: 'Height', type: 'value' });
  });

  it('uses compact progressive rendering for large datasets', () => {
    const data = table(
      ['X', 'Y'],
      Array.from({ length: 1_500 }, (_, index) => [String(index), String(index * 2)]),
    );
    const view = createScatterChartView(data, createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready scatter plot');
    expect(view.points).toHaveLength(1_500);
    expect(view.options).toMatchObject({
      animationDuration: 0,
      series: [{ large: true, largeThreshold: 1_000, progressive: 2_000, symbolSize: 4, type: 'scatter' }],
    });
  });

  it('formats tooltips with actual, safely escaped headers', () => {
    expect(formatScatterTooltip({ value: [170, 67] }, 'Height', 'Weight')).toBe(
      'Height: 170<br/>Weight: 67',
    );
    expect(formatScatterTooltip({ value: [1, 2] }, '<X>', 'Y & value')).toBe(
      '&lt;X&gt;: 1<br/>Y &amp; value: 2',
    );
  });
});
