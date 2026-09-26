import { describe, expect, it } from 'vitest';

import { createBarChartView } from '../../src/graph/configs/barChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createLineChartView } from '../../src/graph/configs/lineChart';
import {
  axisLabelInterval,
  createAdaptiveSettings,
  createSuggestedLabels,
  detectColumnType,
  detectDataShape,
  hasMixedSeriesScale,
} from '../../src/graph/transforms/dataInterpretation';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function table(headers: string[], rows: string[][]) {
  return createDataFromRows([headers, ...rows]);
}

describe('column type detection', () => {
  it('detects dates, numbers, categories, empty columns, and mixed values deterministically', () => {
    expect(detectColumnType(['2026-01-01', '2026-02-01', ''])).toBe('date/time');
    expect(detectColumnType(['12', '-4.5', ''])).toBe('number');
    expect(detectColumnType(['North', 'South', ''])).toBe('text/category');
    expect(detectColumnType(['', ''])).toBe('empty/mixed');
    expect(detectColumnType(['12', 'unknown'])).toBe('empty/mixed');
    expect(detectColumnType(['Jan', 'Feb'])).toBe('text/category');
  });
});

describe('data shape and recommendation', () => {
  it('maps category plus numeric columns to a bar chart', () => {
    const interpretation = detectDataShape(table(
      ['Country', 'Population', 'Area'],
      [['France', '68', '551'], ['Spain', '49', '506']],
    ));

    expect(interpretation).toMatchObject({
      dimensionColumnIndex: 0,
      recommendation: 'Bar',
      seriesColumnIndexes: [1, 2],
      shape: 'category-series',
    });
  });

  it('maps date plus numeric columns to a line chart', () => {
    const interpretation = detectDataShape(table(
      ['Date', 'Revenue'],
      [['2026-01-01', '120'], ['2026-02-01', '145']],
    ));

    expect(interpretation).toMatchObject({
      columns: [
        { index: 0, name: 'Date', type: 'date/time' },
        { index: 1, name: 'Revenue', type: 'number' },
      ],
      dimensionColumnIndex: 0,
      recommendation: 'Line',
      seriesColumnIndexes: [1],
      shape: 'date-series',
    });
  });

  it('recognizes numeric X/Y and raw numeric distributions', () => {
    expect(detectDataShape(table(
      ['Height', 'Weight'],
      [['160', '55'], ['180', '80']],
    ))).toMatchObject({ recommendation: 'Scatter', shape: 'numeric-xy' });

    expect(detectDataShape(table(['Score'], [['10'], ['12'], ['15']]))).toMatchObject({
      recommendation: 'Histogram',
      shape: 'single-numeric-distribution',
    });

    expect(detectDataShape(table(
      ['Control', 'Group A', 'Group B'],
      [['10', '12', '14'], ['11', '13', '18']],
    ))).toMatchObject({ recommendation: 'Box Plot', shape: 'multi-numeric-distribution' });
  });

  it('recommends pie only for plausible category shares', () => {
    expect(detectDataShape(table(
      ['Channel', 'Share'],
      [['Direct', '45'], ['Search', '35'], ['Social', '20']],
    )).recommendation).toBe('Pie');

    expect(detectDataShape(table(
      ['Category', 'Value'],
      Array.from({ length: 9 }, (_, index) => [`Category ${index + 1}`, String(index === 8 ? 20 : 10)]),
    )).recommendation).toBe('Bar');
  });
});

describe('dynamic labels and adaptive rendering', () => {
  it('generates titles and axes from one or multiple series headers', () => {
    const single = table(['Country', 'Population'], [['France', '68'], ['Spain', '49']]);
    expect(createSuggestedLabels(single)).toEqual({
      title: 'Population by Country',
      xAxisTitle: 'Country',
      yAxisTitle: 'Population',
    });

    const multiple = table(
      ['Date', 'Visitors', 'Orders', 'Revenue'],
      [['2026-01-01', '700', '20', '1500'], ['2026-01-02', '800', '22', '1750']],
    );
    expect(createSuggestedLabels(multiple)).toEqual({
      title: 'Visitors, Orders and Revenue by Date',
      xAxisTitle: 'Date',
      yAxisTitle: 'Value',
    });

    const ambiguous = createDataFromRows([['1', '2'], ['3', '4']]);
    expect(createSuggestedLabels(ambiguous).title).toBe('Untitled Graph');
  });

  it('suppresses value labels and reduces axis ticks for large datasets', () => {
    const data = table(
      ['Date', 'Revenue'],
      Array.from({ length: 60 }, (_, index) => [
        `2026-01-${String(index % 28 + 1).padStart(2, '0')}T${String(Math.floor(index / 28)).padStart(2, '0')}:00:00Z`,
        String(index + 1),
      ]),
    );
    const settings = createAdaptiveSettings(data, createDefaultGraphSettings());
    const bar = createBarChartView(data, { ...settings, showValueLabels: true });
    const line = createLineChartView(data, { ...settings, showValueLabels: true });

    expect(settings.showValueLabels).toBe(false);
    expect(axisLabelInterval(60, true)).toBeGreaterThan(0);
    expect(bar.status).toBe('ready');
    expect(line.status).toBe('ready');
    if (bar.status !== 'ready' || line.status !== 'ready') throw new Error('Expected ready charts');
    expect(bar.options.series).toMatchObject([{ label: { show: false } }]);
    expect(line.options.series).toMatchObject([{ label: { show: false }, showSymbol: false }]);
    expect(bar.options.xAxis).toMatchObject({ axisLabel: { interval: 7 } });
    expect(line.options.xAxis).toMatchObject({
      axisLabel: { showMaxLabel: true, showMinLabel: true },
      type: 'time',
    });
  });

  it('warns when typical series magnitudes differ by at least ten times', () => {
    const data = table(
      ['Date', 'Orders', 'Visitors', 'Revenue'],
      [['2026-01-01', '20', '700', '1500'], ['2026-01-02', '22', '760', '1650']],
    );
    const interpretation = detectDataShape(data);

    expect(interpretation.mixedScale).toBe(true);
    expect(hasMixedSeriesScale(data, [1, 2, 3])).toBe(true);
    expect(hasMixedSeriesScale(data, [2, 3])).toBe(false);
  });
});
