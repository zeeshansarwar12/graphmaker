import { describe, expect, it } from 'vitest';

import { createBarChartView } from '../../src/graph/configs/barChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import {
  addColumn,
  clearData,
  createSampleData,
  removeRow,
  updateCell,
} from '../../src/graph/transforms/tabularData';

describe('bar chart configuration', () => {
  it('maps the first column to categories and the numeric column to bars', () => {
    const view = createBarChartView(createSampleData(), createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready chart');

    expect(view.categories).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
    expect(view.series).toEqual([
      { name: 'Sales', values: [32, 47, 61, 52] },
    ]);
    expect(view.options.legend).toMatchObject({ show: false });
    expect(view.summary).toContain('Monthly Sales');
    expect(view.summary).toContain('Jan 32');
  });

  it('creates multiple series and enables the legend only when useful', () => {
    let data = addColumn(createSampleData(), 'Profit');
    const profitValues = ['8', '12', '18', '14'];
    data.rows.forEach((row, index) => {
      data = updateCell(data, row.id, 'column-3', profitValues[index]);
    });

    const view = createBarChartView(data, createDefaultGraphSettings());
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready chart');

    expect(view.series).toEqual([
      { name: 'Sales', values: [32, 47, 61, 52] },
      { name: 'Profit', values: [8, 12, 18, 14] },
    ]);
    expect(view.options.legend).toMatchObject({
      data: ['Sales', 'Profit'],
      show: true,
    });
  });

  it('hides value labels automatically when a dataset has more than 15 categories', () => {
    const data = {
      columns: [
        { id: 'column-1', kind: 'label' as const, name: 'Category' },
        { id: 'column-2', kind: 'number' as const, name: 'Sales' },
        { id: 'column-3', kind: 'number' as const, name: 'Profit' },
      ],
      rows: Array.from({ length: 16 }, (_, index) => ({
        cells: [`Category ${index + 1}`, String(index + 10), String(index + 3)],
        id: `row-${index + 1}`,
      })),
    };
    const view = createBarChartView(data, {
      ...createDefaultGraphSettings(),
      showValueLabels: true,
    });

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready chart');
    expect(view.options.series).toMatchObject([
      { label: { show: false } },
      { label: { show: false } },
    ]);
  });

  it('renders only visible series while retaining their original colors', () => {
    let data = addColumn(createSampleData(), 'Profit');
    data = updateCell(data, 'row-1', 'column-3', '8');
    const view = createBarChartView(data, {
      ...createDefaultGraphSettings(),
      hiddenSeriesIds: ['column-2'],
      seriesColors: ['#111111', '#222222'],
    });

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready chart');
    expect(view.series).toEqual([{ name: 'Profit', values: [8, null, null, null] }]);
    expect(view.options).toMatchObject({
      color: ['#111111', '#222222'],
      legend: {
        selected: { Profit: true, Sales: false },
        show: true,
      },
      series: [{ name: 'Sales' }, { name: 'Profit' }],
    });
  });

  it('returns an empty state when the grid is cleared or rows are deleted', () => {
    const settings = createDefaultGraphSettings();
    expect(createBarChartView(clearData(createSampleData()), settings)).toMatchObject({
      status: 'empty',
    });

    const withoutRows = createSampleData().rows.reduce(
      (data, row) => removeRow(data, row.id),
      createSampleData(),
    );
    expect(createBarChartView(withoutRows, settings)).toMatchObject({ status: 'empty' });
  });

  it('returns a recoverable invalid state for nonnumeric series values', () => {
    const invalid = updateCell(createSampleData(), 'row-2', 'column-2', 'forty-seven');
    expect(createBarChartView(invalid, createDefaultGraphSettings())).toEqual({
      message: 'Sales in row 2 must be a number. Fix the highlighted cell to update the graph.',
      status: 'invalid',
    });
  });

  it('transforms visibility, colors, titles, and orientation into ECharts options', () => {
    let data = addColumn(createSampleData(), 'Profit');
    data = updateCell(data, 'row-1', 'column-3', '8');
    const settings = {
      ...createDefaultGraphSettings(),
      orientation: 'horizontal' as const,
      seriesColors: ['#123456', '#654321'],
      showGrid: false,
      showLegend: false,
      showValueLabels: false,
      title: 'Quarterly revenue',
      xAxisTitle: 'Revenue',
      yAxisTitle: 'Quarter',
    };
    const view = createBarChartView(data, settings);

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready chart');

    expect(view.options).toMatchObject({
      color: ['#123456', '#654321'],
      legend: { show: false },
      series: [
        { label: { position: 'right', show: false } },
        { label: { position: 'right', show: false } },
      ],
      xAxis: {
        name: 'Revenue',
        splitLine: { show: false },
        type: 'value',
      },
      yAxis: {
        data: ['Jan', 'Feb', 'Mar', 'Apr'],
        inverse: true,
        name: 'Quarter',
        type: 'category',
      },
    });
    expect(view.summary).toContain('Quarterly revenue. horizontal bar graph');
  });
});
