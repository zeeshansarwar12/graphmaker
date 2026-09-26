import { describe, expect, it } from 'vitest';

import {
  createPieChartView,
  formatPieTooltip,
} from '../../src/graph/configs/pieChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createPieData } from '../../src/graph/transforms/chartData';
import {
  createAdaptiveSettings,
  detectDataShape,
} from '../../src/graph/transforms/dataInterpretation';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function table(headers: string[], rows: string[][]) {
  return createDataFromRows([headers, ...rows]);
}

const productShare = table(
  ['Category', 'Value'],
  [['Product A', '40'], ['Product B', '30'], ['Product C', '20'], ['Product D', '10']],
);

describe('pie chart configuration', () => {
  it('maps categories and values, recommends Pie, and generates labels from headers', () => {
    const interpretation = detectDataShape(productShare);
    const settings = createAdaptiveSettings(productShare, createDefaultGraphSettings(), interpretation);
    const view = createPieChartView(productShare, settings);

    expect(interpretation).toMatchObject({
      dimensionColumnIndex: 0,
      recommendation: 'Pie',
      seriesColumnIndexes: [1],
      shape: 'category-series',
    });
    expect(createPieData(productShare).isCompatible).toBe(true);
    expect(settings).toMatchObject({
      title: 'Value by Category',
      xAxisTitle: 'Category',
      yAxisTitle: 'Value',
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready pie chart');
    expect(view.slices).toEqual([
      { name: 'Product A', percentage: 40, value: 40 },
      { name: 'Product B', percentage: 30, value: 30 },
      { name: 'Product C', percentage: 20, value: 20 },
      { name: 'Product D', percentage: 10, value: 10 },
    ]);
    expect(view.options.legend).toMatchObject({
      data: ['Product A', 'Product B', 'Product C', 'Product D'],
      show: true,
      type: 'scroll',
    });
  });

  it('rejects numeric X/Y data without treating a numeric column as a category', () => {
    const data = table(
      ['Height', 'Weight'],
      [['150', '48'], ['155', '52'], ['160', '57']],
    );
    const pie = createPieData(data);

    expect(pie).toMatchObject({
      categoryColumnIndex: null,
      isCompatible: false,
      numericColumnIndexes: [0, 1],
      slices: [],
    });
    expect(createPieChartView(data, createDefaultGraphSettings())).toEqual({
      message: 'Pie charts need one category column and one numeric value column.',
      status: 'empty',
      title: 'This data isn’t suitable for a pie chart.',
    });
  });

  it('calculates shares and formats the tooltip with the actual series header', () => {
    const uneven = table(['Category', 'Revenue'], [['A', '1'], ['B', '2']]);
    const pie = createPieData(uneven);

    expect(pie.slices[0].percentage).toBeCloseTo(33.3333, 3);
    expect(pie.slices[1].percentage).toBeCloseTo(66.6667, 3);
    expect(formatPieTooltip({ name: 'Product A', percent: 40, value: 40 }, 'Value')).toBe(
      'Product A<br/>Value: 40<br/>Share: 40%',
    );
  });

  it('rejects negative values', () => {
    const data = table(['Category', 'Value'], [['A', '10'], ['B', '-2']]);
    expect(createPieChartView(data, createDefaultGraphSettings())).toEqual({
      message: 'Value in row 2 cannot be negative for a pie chart.',
      status: 'invalid',
    });
  });

  it('rejects an all-zero dataset', () => {
    const data = table(['Category', 'Value'], [['A', '0'], ['B', '0']]);
    expect(createPieChartView(data, createDefaultGraphSettings())).toEqual({
      message: 'Pie chart values cannot all be zero. Enter at least one positive value.',
      status: 'invalid',
    });
  });

  it('rejects missing category labels', () => {
    const data = table(['Category', 'Value'], [['A', '10'], ['', '20']]);
    expect(createPieChartView(data, createDefaultGraphSettings())).toEqual({
      message: 'Category in row 2 needs a label.',
      status: 'invalid',
    });
  });

  it('uses the first numeric series by default and honors a Customize selection', () => {
    const data = table(
      ['Category', 'Sales', 'Profit'],
      [['A', '100', '20'], ['B', '80', '10']],
    );
    const first = createPieData(data);
    const selected = createPieData(data, data.columns[2].id);
    const view = createPieChartView(data, {
      ...createDefaultGraphSettings(),
      pieSeriesColumnId: data.columns[2].id,
    });

    expect(first).toMatchObject({ seriesName: 'Sales', slices: [{ value: 100 }, { value: 80 }] });
    expect(selected).toMatchObject({ seriesName: 'Profit', slices: [{ value: 20 }, { value: 10 }] });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready pie chart');
    expect(view.series).toEqual([{ name: 'Profit', values: [20, 10] }]);
  });

  it('keeps large share datasets on the Bar recommendation and suppresses crowded labels', () => {
    const data = table(
      ['Category', 'Share'],
      Array.from({ length: 9 }, (_, index) => [`Category ${index + 1}`, String(index === 8 ? 20 : 10)]),
    );
    const view = createPieChartView(data, createDefaultGraphSettings());

    expect(detectDataShape(data).recommendation).toBe('Bar');
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready pie chart');
    expect(view.options.series).toMatchObject([{ label: { show: false }, labelLine: { show: false } }]);
  });
});
