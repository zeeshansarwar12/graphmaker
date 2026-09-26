import { describe, expect, it } from 'vitest';

import { createHistogramChartView } from '../../src/graph/configs/histogramChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import {
  automaticHistogramBinCount,
  createHistogramBins,
  createHistogramData,
} from '../../src/graph/transforms/histogram';
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

describe('histogram data and binning', () => {
  it('detects one raw numeric column and generates histogram-specific labels', () => {
    const interpretation = detectDataShape(scores);
    const settings = createAdaptiveSettings(scores, createDefaultGraphSettings(), interpretation);
    const histogram = createHistogramData(scores);

    expect(interpretation).toMatchObject({
      recommendation: 'Histogram',
      seriesColumnIndexes: [0],
      shape: 'single-numeric-distribution',
    });
    expect(histogram).toMatchObject({
      isCompatible: true,
      numericColumnIndexes: [0],
      seriesName: 'Score',
      skippedRowCount: 0,
    });
    expect(histogram.values).toHaveLength(15);
    expect(settings).toMatchObject({
      title: 'Distribution of Score',
      xAxisTitle: 'Score',
      yAxisTitle: 'Frequency',
    });
  });

  it('creates contiguous bins and assigns every value to exactly one frequency count', () => {
    const bins = createHistogramBins([0, 1, 2, 3], 2);

    expect(bins).toEqual([
      { count: 2, label: '0–1.5', lowerBound: 0, upperBound: 1.5 },
      { count: 2, label: '1.5–3', lowerBound: 1.5, upperBound: 3 },
    ]);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(4);
  });

  it('uses a sample-size-dependent automatic bin count', () => {
    expect(automaticHistogramBinCount(1)).toBe(1);
    expect(automaticHistogramBinCount(8)).toBe(4);
    expect(automaticHistogramBinCount(15)).toBe(5);
    expect(automaticHistogramBinCount(128)).toBe(8);
  });

  it('uses the requested manual bin count', () => {
    const auto = createHistogramData(scores);
    const manual = createHistogramData(scores, null, 3);

    expect(auto.binCount).toBe(5);
    expect(manual.binCount).toBe(3);
    expect(manual.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(15);
  });

  it('ignores blank rows and warns when invalid values are excluded', () => {
    const data = table(['Score'], [['72'], [''], ['invalid'], ['84']]);
    const histogram = createHistogramData(data);
    const view = createHistogramChartView(data, createDefaultGraphSettings());

    expect(histogram.values).toEqual([72, 84]);
    expect(histogram.skippedRowCount).toBe(1);
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready histogram');
    expect(view.warning).toBe(
      '1 row was excluded because the selected histogram value was blank or invalid.',
    );
  });

  it('defaults to one numeric series and honors the Customize selection', () => {
    const data = table(
      ['Math', 'Science'],
      [['72', '81'], ['84', '76'], ['67', '89']],
    );
    const first = createHistogramData(data);
    const selected = createHistogramData(data, data.columns[1].id, 2);

    expect(first).toMatchObject({ isCompatible: true, seriesName: 'Math', values: [72, 84, 67] });
    expect(selected).toMatchObject({
      binCount: 2,
      isCompatible: true,
      seriesName: 'Science',
      values: [81, 76, 89],
    });
  });

  it('returns a clear empty state for structured or paired data', () => {
    const categoryData = table(['Category', 'Value'], [['A', '10'], ['B', '20']]);
    const xyData = table(['Height', 'Weight'], [['150', '48'], ['160', '57']]);

    expect(createHistogramData(categoryData).isCompatible).toBe(false);
    expect(createHistogramData(xyData).isCompatible).toBe(false);
    expect(createHistogramChartView(xyData, createDefaultGraphSettings())).toEqual({
      message: 'Histograms work best with raw numeric observations.',
      status: 'empty',
      title: 'This data may not be suitable for a histogram.',
    });
  });

  it('renders bins as touching bars with frequency on the Y-axis', () => {
    const settings = createAdaptiveSettings(scores, createDefaultGraphSettings());
    const view = createHistogramChartView(scores, settings);

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready histogram');
    expect(view.bins).toHaveLength(5);
    expect(view.options).toMatchObject({
      series: [{ barCategoryGap: '0%', barGap: '0%', type: 'bar' }],
      xAxis: { name: 'Score', type: 'category' },
      yAxis: { minInterval: 1, name: 'Frequency', type: 'value' },
    });
    expect(view.summary).toContain('Distribution of Score. Histogram of Score with 15 observations in 5 bins.');
  });
});
