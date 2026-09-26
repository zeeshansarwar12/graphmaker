import { describe, expect, it } from 'vitest';

import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createRadarChartView } from '../../src/graph/configs/radarChart';
import { createAdaptiveSettings } from '../../src/graph/transforms/dataInterpretation';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function table(headers: string[], rows: string[][]) {
  return createDataFromRows([headers, ...rows]);
}

const teamComparison = table(
  ['Metric', 'Team A', 'Team B'],
  [
    ['Speed', '80', '70'],
    ['Quality', '90', '85'],
    ['Cost', '65', '78'],
    ['Support', '88', '82'],
    ['Reliability', '92', '89'],
  ],
);

describe('radar chart configuration', () => {
  it('maps one numeric column to one radar series', () => {
    const data = table(
      ['Metric', 'Team A'],
      [['Speed', '80'], ['Quality', '90'], ['Cost', '65']],
    );
    const view = createRadarChartView(data, createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready radar chart');
    expect(view.series).toEqual([{
      columnId: 'column-2',
      name: 'Team A',
      values: [80, 90, 65],
    }]);
    expect(view.options.legend).toMatchObject({ data: ['Team A'], show: false });
  });

  it('uses row labels as axes and actual headers for multiple series and the title', () => {
    const settings = createAdaptiveSettings(teamComparison, createDefaultGraphSettings());
    const view = createRadarChartView(teamComparison, settings);

    expect(settings.title).toBe('Team A and Team B by Metric');
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready radar chart');
    expect(view.indicators.map((indicator) => indicator.name)).toEqual([
      'Speed', 'Quality', 'Cost', 'Support', 'Reliability',
    ]);
    expect(view.series.map((series) => series.name)).toEqual(['Team A', 'Team B']);
    expect(view.options.legend).toMatchObject({ data: ['Team A', 'Team B'], show: true });
    expect(view.summary).toContain('Team A and Team B by Metric');
  });

  it('uses one 0–100 scale for percentage-like values', () => {
    const view = createRadarChartView(teamComparison, createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready radar chart');
    expect(view.isPercentageScale).toBe(true);
    expect(view.indicators.every((indicator) => indicator.min === 0 && indicator.max === 100)).toBe(true);
  });

  it('uses one shared sensible maximum for non-percentage comparisons', () => {
    const data = table(
      ['Metric', 'Team A', 'Team B'],
      [['Speed', '120', '90'], ['Quality', '135', '110'], ['Cost', '75', '80']],
    );
    const view = createRadarChartView(data, createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready radar chart');
    expect(view.isPercentageScale).toBe(false);
    expect(view.indicators.every((indicator) => indicator.min === 0 && indicator.max === 150)).toBe(true);
  });

  it('rejects missing and invalid numeric cells with actionable messages', () => {
    const missing = table(
      ['Metric', 'Team A'],
      [['Speed', '80'], ['Quality', ''], ['Cost', '65']],
    );
    const invalid = table(
      ['Metric', 'Team A'],
      [['Speed', '80'], ['Quality', 'fast'], ['Cost', '65']],
    );

    expect(createRadarChartView(missing, createDefaultGraphSettings())).toEqual({
      message: 'Team A in row 2 is missing a value.',
      status: 'invalid',
    });
    expect(createRadarChartView(invalid, createDefaultGraphSettings())).toEqual({
      message: 'Team A in row 2 must be a number.',
      status: 'invalid',
    });
  });

  it('requires at least three metrics', () => {
    const view = createRadarChartView(
      table(['Metric', 'Team A'], [['Speed', '80'], ['Quality', '90']]),
      createDefaultGraphSettings(),
    );

    expect(view).toEqual({
      message: 'Add at least 3 metrics to create a readable radar chart.',
      status: 'empty',
    });
  });

  it('renders but warns when there are more than twelve metrics', () => {
    const rows = Array.from({ length: 13 }, (_, index) => [`Metric ${index + 1}`, String(index + 10)]);
    const view = createRadarChartView(table(['Metric', 'Team A'], rows), createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready radar chart');
    expect(view.warning).toContain('more than 12 metrics');
    expect(view.indicators).toHaveLength(13);
  });

  it.each([
    {
      expected: 'Use a Line chart',
      input: table(['Date', 'Revenue'], [['2026-01-01', '10'], ['2026-01-02', '12'], ['2026-01-03', '11']]),
    },
    {
      expected: 'Use a Scatter chart',
      input: table(['Height', 'Weight'], [['150', '48'], ['160', '57'], ['170', '67']]),
    },
    {
      expected: 'Use a Histogram',
      input: table(['Score'], [['72'], ['84'], ['91']]),
    },
    {
      expected: 'Use a Box Plot',
      input: table(['Group A', 'Group B'], [['1', '4'], ['2', '5'], ['3', '6']]),
    },
  ])('does not force incompatible data and recommends an existing chart', ({ expected, input }) => {
    const view = createRadarChartView(input, createDefaultGraphSettings());

    expect(view.status).toBe('empty');
    if (view.status === 'ready') throw new Error('Expected incompatible radar data');
    expect(view.message).toContain(expected);
  });
});
