import { describe, expect, it } from 'vitest';

import { createBoxPlotChartView } from '../../src/graph/configs/boxPlotChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import {
  calculateBoxPlotStatistics,
  createBoxPlotData,
  createBoxPlotSuggestedLabels,
} from '../../src/graph/statistics/boxPlot';
import {
  createAdaptiveSettings,
  detectDataShape,
} from '../../src/graph/transforms/dataInterpretation';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function table(headers: string[], rows: string[][]) {
  return createDataFromRows([headers, ...rows]);
}

const scores = table(
  ['Score'],
  [['72'], ['84'], ['67'], ['91'], ['76'], ['88'], ['94'], ['71'], ['82'], ['79'], ['65'], ['86'], ['90'], ['74'], ['81']],
);

describe('box plot statistics and data detection', () => {
  it('calculates the single-series five-number summary, median, and IQR', () => {
    const boxPlot = createBoxPlotData(scores);

    expect(boxPlot).toMatchObject({ isCompatible: true, recommendedChart: null });
    expect(boxPlot.groups).toHaveLength(1);
    expect(boxPlot.groups[0]).toMatchObject({ name: 'Score', values: expect.any(Array) });
    expect(boxPlot.groups[0].statistics).toEqual({
      interquartileRange: 16,
      lowerWhisker: 65,
      maximum: 94,
      median: 81,
      minimum: 65,
      outliers: [],
      q1: 72,
      q3: 88,
      upperWhisker: 94,
    });
    expect(createBoxPlotSuggestedLabels(scores)).toEqual({
      title: 'Distribution of Score',
      xAxisTitle: '',
      yAxisTitle: 'Score',
    });
  });

  it('uses the exclusive median-of-halves method and 1.5 IQR outlier fences', () => {
    expect(calculateBoxPlotStatistics([1, 2, 3, 4, 5, 100])).toEqual({
      interquartileRange: 3,
      lowerWhisker: 1,
      maximum: 100,
      median: 3.5,
      minimum: 1,
      outliers: [100],
      q1: 2,
      q3: 5,
      upperWhisker: 5,
    });
    expect(calculateBoxPlotStatistics([])).toBeNull();
  });

  it('treats multiple numeric columns as labeled groups', () => {
    const grouped = table(
      ['Class A', 'Class B'],
      [['72', '81'], ['84', '76'], ['67', '89'], ['91', '92'], ['76', '78']],
    );
    const interpretation = detectDataShape(grouped);
    const settings = createAdaptiveSettings(grouped, createDefaultGraphSettings(), interpretation);
    const boxPlot = createBoxPlotData(grouped);

    expect(interpretation).toMatchObject({
      recommendation: 'Box Plot',
      seriesColumnIndexes: [0, 1],
      shape: 'multi-numeric-distribution',
    });
    expect(settings).toMatchObject({
      title: 'Score Distribution by Group',
      xAxisTitle: 'Group',
      yAxisTitle: 'Score',
    });
    expect(boxPlot.groups.map((group) => group.name)).toEqual(['Class A', 'Class B']);
  });

  it('ignores blank cells and invalid non-numeric values', () => {
    const data = table(
      ['Score'],
      [['1'], [''], ['invalid'], ['2'], ['3'], ['4'], ['5']],
    );
    const boxPlot = createBoxPlotData(data);
    const view = createBoxPlotChartView(data, createDefaultGraphSettings());

    expect(boxPlot.groups[0].values).toEqual([1, 2, 3, 4, 5]);
    expect(boxPlot.groups[0].invalidValueCount).toBe(1);
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready box plot');
    expect(view.warning).toBe('1 invalid non-numeric value was ignored.');
  });

  it('warns without crashing when a group has too few observations', () => {
    const data = table(['Score'], [['1'], ['2'], ['3']]);
    const view = createBoxPlotChartView(data, createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready box plot');
    expect(view.warning).toContain('Score has fewer than 5 valid observations');
  });

  it('shows compatibility guidance and recommends an existing chart', () => {
    const categoryData = table(['Category', 'Value'], [['A', '10'], ['B', '20']]);
    const dateData = table(['Date', 'Value'], [['2026-01-01', '10'], ['2026-01-02', '20']]);
    const xyData = table(['Height', 'Weight'], [['150', '48'], ['160', '57']]);

    expect(createBoxPlotData(categoryData).recommendedChart).toBe('Bar');
    expect(createBoxPlotData(dateData).recommendedChart).toBe('Line');
    expect(createBoxPlotData(xyData).recommendedChart).toBe('Scatter');
    expect(createBoxPlotChartView(xyData, createDefaultGraphSettings())).toEqual({
      message: 'Box plots work best with raw numeric observations or grouped numeric columns. Try a Scatter chart instead.',
      status: 'empty',
      title: 'This data may not be suitable for a box plot.',
    });
  });

  it('renders boxes, whiskers, median, and optional outlier points through ECharts', () => {
    const data = table(['Score'], [['1'], ['2'], ['3'], ['4'], ['5'], ['100']]);
    const visible = createBoxPlotChartView(data, createDefaultGraphSettings());
    const hidden = createBoxPlotChartView(data, {
      ...createDefaultGraphSettings(),
      showOutliers: false,
    });

    expect(visible.status).toBe('ready');
    expect(hidden.status).toBe('ready');
    if (visible.status !== 'ready' || hidden.status !== 'ready') throw new Error('Expected ready box plots');
    expect(visible.options.series).toMatchObject([
      { data: [{ value: [1, 2, 3.5, 5, 5] }], type: 'boxplot' },
      { data: [[0, 100]], type: 'scatter' },
    ]);
    expect(hidden.options.series).toMatchObject([{ type: 'boxplot' }]);
    expect(hidden.options.series).toHaveLength(1);
  });
});
