import { describe, expect, it } from 'vitest';
import { createBoxPlotChartView } from '../../src/graph/configs/boxPlotChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { calculateBoxPlotStatistics } from '../../src/graph/statistics/boxPlot';
import { boxSummaryExample, boxSummaryFromRaw, boxSummaryTable, createBoxSummaryExample, prepareBoxSummaryImport, validateBoxSummary } from '../../src/graph/statistics/boxSummary';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';
import { createProjectSnapshot, deserializeGraphProject, serializeGraphProject } from '../../src/lib/storage/graphProject';

describe('five-number summary', () => {
  it('ignores a fully blank row', () => {
    const result = validateBoxSummary(boxSummaryTable([[' ', '', '', '', '', '']]));
    expect(result.groups).toEqual([]);
    expect(result.errors.size).toBe(0);
  });

  it('ignores a blank row between valid groups', () => {
    const result = validateBoxSummary(boxSummaryTable([
      ['First', '1', '2', '3', '4', '5'], ['', '', '', '', '', ''], ['Last', '2', '3', '4', '5', '6'],
    ]));
    expect(result.groups.map(group => group.name)).toEqual(['First', 'Last']);
    expect(result.errors.size).toBe(0);
  });

  it('reports missing values in a partially filled row', () => {
    const result = validateBoxSummary(boxSummaryTable([['Partial', '1', '', '', '', '']]));
    expect(result.groups).toEqual([]);
    expect(result.errors.get('row-1')).toEqual(['Partial (row 1): enter finite numbers for Q1, Median, Q3, Maximum.']);
  });

  it('reports per-row violations and keeps valid groups including equal values', () => {
    const table = boxSummaryTable([
      ['Equal', '2', '2', '2', '2', '2'],
      ['Order', '1', '3', '2', '5', '6'],
      ['Values', 'NaN', '2', 'Infinity', '4', ''],
      [' ', '1', '2', '3', '4', '5'],
      ['Duplicate', '1', '2', '3', '4', '5'],
      [' duplicate ', '1', '2', '3', '4', '5'],
    ]);
    const { errors, groups } = validateBoxSummary(table);
    expect(groups.map(group => group.name)).toEqual(['Equal']);
    expect(groups[0].values).toEqual([2, 2, 2, 2, 2]);
    expect([...errors.entries()]).toEqual([
      ['row-2', ['Order (row 2): use Minimum ≤ Q1 ≤ Median ≤ Q3 ≤ Maximum.']],
      ['row-3', ['Values (row 3): enter finite numbers for Minimum, Median, Maximum.']],
      ['row-4', ['Row 4: enter a group name.']],
      ['row-5', ['Duplicate (row 5): group names must be unique.']],
      ['row-6', ['duplicate (row 6): group names must be unique.']],
    ]);
  });

  it('maps aliases case-insensitively and preserves invalid cells for validation', () => {
    const result = prepareBoxSummaryImport([
      [' MAX ', 'q2', 'GROUP NAME', 'upper Quartile', 'MIN', 'Lower_Quartile'],
      ['invalid', '3', 'Sample', '4', '1', '2'],
    ]);
    expect(result).toEqual({ ok: true, headerDetected: true, data: boxSummaryTable([['Sample', '1', '2', '3', '4', 'invalid']]) });
    expect(prepareBoxSummaryImport([['Group', 'Min', 'Q1', 'Median', 'Q3', 'Q3'], ['Sample', '1', '2', '3', '4', '5']])).toMatchObject({ ok: false, error: /exactly one header/ });
    expect(prepareBoxSummaryImport([['Sample', '1', '2', '3', '4', '5']])).toEqual({ ok: true, headerDetected: false, data: boxSummaryTable([['Sample', '1', '2', '3', '4', '5']]) });
  });

  it('computes the worked example and converts raw columns using true extremes', () => {
    const observations = boxSummaryExample.observations;
    const expected = calculateBoxPlotStatistics(observations)!;
    const raw = createDataFromRows([['Scores', 'Control'], ...observations.map(value => [String(value), String(value + 1)])]);
    expect(expected.upperWhisker).toBe(21);
    expect(expected.outliers).toEqual([58]);
    expect(createBoxSummaryExample().rows[0].cells).toEqual(['Class C scores', '12', '13', '16', '21', '58']);
    expect(boxSummaryFromRaw(raw)?.rows.map(row => row.cells)).toEqual([
      ['Scores', ...[expected.minimum, expected.q1, expected.median, expected.q3, expected.maximum].map(String)],
      ['Control', '13', '14', '17', '22', '59'],
    ]);
    expect(boxSummaryFromRaw(createDataFromRows([['A'], ['none']]))).toBeNull();
  });

  it('places the example maximum of 58 above the raw upper fence', () => {
    const stats = calculateBoxPlotStatistics(boxSummaryExample.observations)!;
    const upperFence = stats.q3 + 1.5 * stats.interquartileRange;
    expect(upperFence).toBe(33);
    expect(stats.maximum).toBe(58);
    expect(stats.maximum).toBeGreaterThan(upperFence);
    expect(stats.upperWhisker).toBe(21);
  });

  it('renders exact whiskers and quartiles with no scatter series even when outliers are enabled', () => {
    const data = boxSummaryTable([['Scores', '-4', '-1', '0', '2', '58'], ['Invalid', '0', '5', '1', '3', '9']]);
    const settings = { ...createDefaultGraphSettings(), boxPlotInputMode: 'summary' as const, showOutliers: true };
    const view = createBoxPlotChartView(data, settings);
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') return;
    expect(view.options.series).toEqual([expect.objectContaining({ type: 'boxplot', data: [expect.objectContaining({ value: [-4, -1, 0, 2, 58] })] })]);
    expect(view.warning).toBeUndefined();
    expect(createBoxPlotChartView(boxSummaryTable(), settings)).toMatchObject({ status: 'empty', message: expect.stringContaining('at least one group') });
  });

  it('round-trips both tables in schema v1 and preserves legacy projects', () => {
    const raw = createDataFromRows([['Scores'], ['5']]);
    const base = { data: raw, graphType: 'boxplot' as const, settings: createDefaultGraphSettings() };
    const legacy = createProjectSnapshot(base);
    expect(legacy.settings).not.toHaveProperty('boxPlotInputMode');
    expect(deserializeGraphProject(serializeGraphProject(legacy))).toEqual({ ok: true, project: legacy });
    const summary = createBoxSummaryExample();
    const project = createProjectSnapshot({ ...base, boxSummaryData: summary, settings: { ...base.settings, boxPlotInputMode: 'summary' } });
    expect(deserializeGraphProject(serializeGraphProject(project))).toEqual({ ok: true, project });
    expect(deserializeGraphProject(JSON.stringify({ ...project, boxSummaryData: raw })).ok).toBe(false);
  });
});
