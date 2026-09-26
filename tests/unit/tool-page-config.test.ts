import { describe, expect, it } from 'vitest';

import {
  barToolPageConfig,
  boxPlotToolPageConfig,
  histogramToolPageConfig,
  lineToolPageConfig,
  pieToolPageConfig,
  radarToolPageConfig,
  scatterToolPageConfig,
  xyToolPageConfig,
} from '../../src/content/toolPages';
import { createBoxPlotChartView } from '../../src/graph/configs/boxPlotChart';
import { createHistogramChartView } from '../../src/graph/configs/histogramChart';
import { createLineChartView } from '../../src/graph/configs/lineChart';
import { createPieChartView } from '../../src/graph/configs/pieChart';
import { createRadarChartView } from '../../src/graph/configs/radarChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { detectDataShape } from '../../src/graph/transforms/dataInterpretation';

describe('XY tool page configuration', () => {
  it('provides a distinct SEO page and a numeric XY editor preset', () => {
    expect(xyToolPageConfig).toMatchObject({
      canonical: '/xy-graph-maker/',
      h1: 'XY Graph Maker',
      slug: '/xy-graph-maker/',
      editor: {
        graphType: 'xy',
        slug: '/xy-graph-maker/',
        initialSettings: {
          title: 'Y by X',
          xAxisTitle: 'X',
          xyConnectPoints: true,
          yAxisTitle: 'Y',
        },
      },
    });
    expect(xyToolPageConfig.metaDescription).toContain('no signup');
    expect(xyToolPageConfig.editor.sampleData?.columns.map((column) => column.kind)).toEqual([
      'number',
      'number',
    ]);
    expect(detectDataShape(xyToolPageConfig.editor.sampleData!)).toMatchObject({
      recommendation: 'Scatter',
      shape: 'numeric-xy',
    });
    expect(xyToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/scatter-plot-maker/',
      '/line-graph-maker/',
      '/bar-graph-maker/',
    ]);
  });
});

describe('Scatter tool page configuration', () => {
  it('provides unique content and a points-only numeric preset', () => {
    expect(scatterToolPageConfig).toMatchObject({
      canonical: '/scatter-plot-maker/',
      h1: 'Scatter Plot Maker',
      editor: {
        graphType: 'scatter',
        slug: '/scatter-plot-maker/',
        initialSettings: {
          showLegend: false,
          showValueLabels: false,
          title: 'Exam Score by Hours Studied',
        },
      },
      sectionHeadings: {
        definition: 'What is a scatter plot?',
        example: 'Example scatter data',
        howTo: 'How to make a scatter plot',
      },
    });
    expect(scatterToolPageConfig.editor.sampleData?.columns.map((column) => column.kind)).toEqual([
      'number',
      'number',
    ]);
    expect(scatterToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/xy-graph-maker/',
      '/line-graph-maker/',
      '/bar-graph-maker/',
    ]);
    expect(scatterToolPageConfig.faqs.some((faq) => faq.answer.includes('Not yet'))).toBe(true);
  });
});

describe('Bar tool page configuration', () => {
  it('provides unique content and a grouped-series category preset', () => {
    expect(barToolPageConfig).toMatchObject({
      canonical: '/bar-graph-maker/',
      h1: 'Bar Graph Maker',
      editor: {
        graphType: 'bar',
        slug: '/bar-graph-maker/',
        initialSettings: {
          orientation: 'vertical',
          showLegend: true,
          showValueLabels: true,
          title: 'Monthly Sales and Profit',
        },
      },
      sectionHeadings: {
        definition: 'What is a bar graph?',
        example: 'Example bar graph data',
        howTo: 'How to make a bar graph',
      },
    });
    expect(barToolPageConfig.editor.sampleData?.columns).toMatchObject([
      { kind: 'label', name: 'Category' },
      { kind: 'number', name: 'Sales' },
      { kind: 'number', name: 'Profit' },
    ]);
    expect(barToolPageConfig.editor.sampleData?.rows.map((row) => row.cells)).toEqual([
      ['Jan', '120', '32'],
      ['Feb', '180', '49'],
      ['Mar', '240', '71'],
      ['Apr', '210', '63'],
    ]);
    expect(detectDataShape(barToolPageConfig.editor.sampleData!)).toMatchObject({
      recommendation: 'Bar',
      seriesColumnIndexes: [1, 2],
      shape: 'category-series',
    });
    expect(barToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/line-graph-maker/',
      '/pie-chart-maker/',
      '/histogram-maker/',
    ]);
  });
});

describe('Line tool page configuration', () => {
  it('provides a multiple-series date preset on a bounded time axis', () => {
    expect(lineToolPageConfig).toMatchObject({
      canonical: '/line-graph-maker/',
      h1: 'Line Graph Maker',
      editor: {
        graphType: 'line',
        slug: '/line-graph-maker/',
        initialSettings: {
          showLegend: true,
          title: 'Visitors and Orders Over Time',
          xAxisTitle: 'Date',
        },
      },
      sectionHeadings: {
        definition: 'What is a line graph?',
        example: 'Example line graph data',
        howTo: 'How to make a line graph',
      },
    });
    expect(detectDataShape(lineToolPageConfig.editor.sampleData!)).toMatchObject({
      recommendation: 'Line',
      seriesColumnIndexes: [1, 2],
      shape: 'date-series',
    });

    const view = createLineChartView(lineToolPageConfig.editor.sampleData!, {
      ...createDefaultGraphSettings(),
      ...lineToolPageConfig.editor.initialSettings,
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready line chart');
    expect(view.series.map((series) => series.name)).toEqual(['Visitors', 'Orders']);
    expect(view.options.xAxis).toMatchObject({
      min: Date.UTC(2026, 0, 1),
      max: Date.UTC(2026, 2, 1),
      type: 'time',
      axisLabel: { showMaxLabel: true, showMinLabel: true },
    });
    expect(lineToolPageConfig.additionalSections?.[0].title).toBe('Multiple line graphs');
    expect(lineToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/bar-graph-maker/',
      '/xy-graph-maker/',
      '/scatter-plot-maker/',
    ]);
  });
});

describe('Pie tool page configuration', () => {
  it('provides a percentage-based category preset with one selected value series', () => {
    expect(pieToolPageConfig).toMatchObject({
      canonical: '/pie-chart-maker/',
      h1: 'Pie Chart Maker',
      editor: {
        graphType: 'pie',
        slug: '/pie-chart-maker/',
        initialSettings: {
          showLegend: true,
          showValueLabels: true,
          title: 'Product Share',
        },
      },
      sectionHeadings: {
        definition: 'What is a pie chart?',
        example: 'Example pie chart data',
        howTo: 'How to make a pie chart',
      },
    });
    expect(detectDataShape(pieToolPageConfig.editor.sampleData!)).toMatchObject({
      recommendation: 'Pie',
      seriesColumnIndexes: [1],
      shape: 'category-series',
    });

    const view = createPieChartView(pieToolPageConfig.editor.sampleData!, {
      ...createDefaultGraphSettings(),
      ...pieToolPageConfig.editor.initialSettings,
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready pie chart');
    expect(view.slices).toEqual([
      { name: 'Product A', percentage: 40, value: 40 },
      { name: 'Product B', percentage: 30, value: 30 },
      { name: 'Product C', percentage: 20, value: 20 },
      { name: 'Product D', percentage: 10, value: 10 },
    ]);
    expect(pieToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/bar-graph-maker/',
      '/line-graph-maker/',
      '/radar-chart-maker/',
    ]);
  });
});

describe('Box Plot tool page configuration', () => {
  it('provides unique content and a grouped raw-numeric preset', () => {
    expect(boxPlotToolPageConfig).toMatchObject({
      canonical: '/box-plot-maker/',
      h1: 'Box Plot Maker',
      editor: {
        graphType: 'boxplot',
        slug: '/box-plot-maker/',
        initialSettings: {
          orientation: 'vertical',
          showOutliers: true,
          title: 'Class Score Distribution',
        },
      },
      sectionHeadings: {
        definition: 'What is a box plot?',
        example: 'Example box plot data',
        howTo: 'How to make a box plot',
      },
    });
    expect(boxPlotToolPageConfig.editor.sampleData?.columns).toMatchObject([
      { kind: 'number', name: 'Class A' },
      { kind: 'number', name: 'Class B' },
    ]);
    expect(boxPlotToolPageConfig.editor.sampleData?.rows).toHaveLength(10);
    expect(detectDataShape(boxPlotToolPageConfig.editor.sampleData!)).toMatchObject({
      recommendation: 'Box Plot',
      shape: 'multi-numeric-distribution',
    });

    const view = createBoxPlotChartView(boxPlotToolPageConfig.editor.sampleData!, {
      ...createDefaultGraphSettings(),
      ...boxPlotToolPageConfig.editor.initialSettings,
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready box plot');
    expect(view.groups.map((group) => group.name)).toEqual(['Class A', 'Class B']);
    expect(view.options.series).toMatchObject([
      { type: 'boxplot' },
      { type: 'scatter' },
    ]);
    expect(boxPlotToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/histogram-maker/',
      '/scatter-plot-maker/',
      '/bar-graph-maker/',
    ]);
  });
});

describe('Radar tool page configuration', () => {
  it('provides unique content and a percentage-scaled multi-series preset', () => {
    expect(radarToolPageConfig).toMatchObject({
      canonical: '/radar-chart-maker/',
      h1: 'Radar Chart Maker',
      editor: {
        graphType: 'radar',
        slug: '/radar-chart-maker/',
        initialSettings: {
          radarFilled: true,
          showLegend: true,
          title: 'Team Comparison by Metric',
        },
      },
      sectionHeadings: {
        definition: 'What is a radar chart?',
        example: 'Example radar chart data',
        howTo: 'How to make a radar chart',
      },
    });
    expect(radarToolPageConfig.editor.sampleData?.columns).toMatchObject([
      { kind: 'label', name: 'Metric' },
      { kind: 'number', name: 'Team A' },
      { kind: 'number', name: 'Team B' },
    ]);

    const view = createRadarChartView(radarToolPageConfig.editor.sampleData!, {
      ...createDefaultGraphSettings(),
      ...radarToolPageConfig.editor.initialSettings,
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready radar chart');
    expect(view.isPercentageScale).toBe(true);
    expect(view.indicators).toEqual([
      { max: 100, min: 0, name: 'Speed' },
      { max: 100, min: 0, name: 'Quality' },
      { max: 100, min: 0, name: 'Cost' },
      { max: 100, min: 0, name: 'Support' },
      { max: 100, min: 0, name: 'Reliability' },
    ]);
    expect(view.series.map((series) => series.name)).toEqual(['Team A', 'Team B']);
    expect(view.options.legend).toMatchObject({ data: ['Team A', 'Team B'], show: true });
    expect(radarToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/bar-graph-maker/',
      '/pie-chart-maker/',
      '/line-graph-maker/',
    ]);
  });
});

describe('Histogram tool page configuration', () => {
  it('provides unique content and a raw-numeric histogram preset', () => {
    expect(histogramToolPageConfig).toMatchObject({
      canonical: '/histogram-maker/',
      h1: 'Histogram Maker',
      editor: {
        graphType: 'histogram',
        slug: '/histogram-maker/',
        initialSettings: {
          histogramBinCount: null,
          title: 'Distribution of Scores',
          xAxisTitle: 'Score',
          yAxisTitle: 'Frequency',
        },
      },
      sectionHeadings: {
        definition: 'What is a histogram?',
        example: 'Example histogram data',
        howTo: 'How to make a histogram',
      },
    });
    expect(histogramToolPageConfig.editor.sampleData?.columns).toMatchObject([
      { kind: 'number', name: 'Score' },
    ]);
    expect(histogramToolPageConfig.editor.sampleData?.rows).toHaveLength(15);

    const view = createHistogramChartView(histogramToolPageConfig.editor.sampleData!, {
      ...createDefaultGraphSettings(),
      ...histogramToolPageConfig.editor.initialSettings,
    });
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready histogram');
    expect(view.bins).toHaveLength(5);
    expect(view.series[0].name).toBe('Score');
    expect(histogramToolPageConfig.relatedTools.map((tool) => tool.href)).toEqual([
      '/box-plot-maker/',
      '/bar-graph-maker/',
      '/scatter-plot-maker/',
    ]);
  });
});
