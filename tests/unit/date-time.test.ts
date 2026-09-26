import { describe, expect, it } from 'vitest';

import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createLineChartView, formatTimeTooltip } from '../../src/graph/configs/lineChart';
import { createTimeSeriesData } from '../../src/graph/transforms/chartData';
import {
  dateAxisGranularity,
  formatDateAxisLabel,
  formatTooltipDate,
  parseDateValue,
} from '../../src/graph/transforms/dateTime';
import { detectDataShape } from '../../src/graph/transforms/dataInterpretation';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function dateTable(rows: string[][]) {
  return createDataFromRows([['Date', 'Revenue'], ...rows]);
}

function readyLine(rows: string[][]) {
  const view = createLineChartView(dateTable(rows), createDefaultGraphSettings());
  expect(view.status).toBe('ready');
  if (view.status !== 'ready') throw new Error('Expected a ready line chart');
  return view;
}

describe('date parsing and formatting', () => {
  it('parses valid ISO and common spreadsheet dates without accepting invalid calendar dates', () => {
    expect(parseDateValue('2026-03-01')).toBe(Date.UTC(2026, 2, 1));
    expect(parseDateValue('2026/03/01')).toBe(Date.UTC(2026, 2, 1));
    expect(parseDateValue('03/01/2026')).toBe(Date.UTC(2026, 2, 1));
    expect(parseDateValue('March 1, 2026')).toBe(Date.UTC(2026, 2, 1));
    expect(parseDateValue('2026-02-30')).toBeNull();
    expect(parseDateValue('not a date')).toBeNull();
  });

  it('formats daily, multi-year, monthly, yearly, and tooltip dates concisely', () => {
    const marchFirst = Date.UTC(2026, 2, 1);
    expect(formatDateAxisLabel(marchFirst, 'day', false)).toBe('Mar 1');
    expect(formatDateAxisLabel(marchFirst, 'day', true)).toBe('Mar 1, 2026');
    expect(formatDateAxisLabel(marchFirst, 'month', false)).toBe('Mar 2026');
    expect(formatDateAxisLabel(marchFirst, 'year', true)).toBe('2026');
    expect(formatTooltipDate(marchFirst)).toBe('March 1, 2026');
  });
});

describe('time-axis line configuration', () => {
  it('uses exact Jan 1 to Mar 1 bounds and exposes first and last labels', () => {
    const rows = Array.from({ length: 60 }, (_, index) => [
      new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
      String(index + 1),
    ]);
    const view = readyLine(rows);
    const xAxis = view.options.xAxis as {
      axisLabel: { formatter: (value: number) => string; showMaxLabel: boolean; showMinLabel: boolean };
      max: number;
      min: number;
      type: string;
    };

    expect(xAxis.type).toBe('time');
    expect(xAxis.min).toBe(Date.UTC(2026, 0, 1));
    expect(xAxis.max).toBe(Date.UTC(2026, 2, 1));
    expect(xAxis.axisLabel.showMinLabel).toBe(true);
    expect(xAxis.axisLabel.showMaxLabel).toBe(true);
    expect(xAxis.axisLabel.formatter(xAxis.min)).toBe('Jan 1');
    expect(xAxis.axisLabel.formatter(xAxis.max)).toBe('Mar 1');
  });

  it('uses proportional timestamp gaps for irregular and missing dates', () => {
    const view = readyLine([
      ['2026-01-01', '10'],
      ['2026-01-02', '20'],
      ['2026-01-10', '30'],
    ]);
    const series = view.options.series as Array<{ data: Array<[number, number]> }>;
    const timestamps = series[0].data.map(([timestamp]) => timestamp);

    expect(timestamps).toHaveLength(3);
    expect(timestamps[1] - timestamps[0]).toBe(86_400_000);
    expect(timestamps[2] - timestamps[1]).toBe(8 * 86_400_000);

    const missing = createTimeSeriesData(dateTable([
      ['2026-01-01', '10'],
      ['', '15'],
      ['2026-01-03', '20'],
    ]));
    expect(missing.timestamps).toEqual([Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 3)]);
    expect(missing.series[0].points).toHaveLength(2);
  });

  it('sorts chart points chronologically without rewriting grid values', () => {
    const data = dateTable([
      ['2026-01-10', '30'],
      ['2026-01-01', '10'],
      ['2026-01-02', '20'],
    ]);
    const originalCells = data.rows.map((row) => [...row.cells]);
    const transformed = createTimeSeriesData(data);

    expect(transformed.timestamps).toEqual([
      Date.UTC(2026, 0, 1),
      Date.UTC(2026, 0, 2),
      Date.UTC(2026, 0, 10),
    ]);
    expect(transformed.series[0].values).toEqual([10, 20, 30]);
    expect(data.rows.map((row) => row.cells)).toEqual(originalCells);
  });

  it('formats a complete multi-series tooltip using the actual timestamp', () => {
    const timestamp = Date.UTC(2026, 2, 1);
    expect(formatTimeTooltip([
      { marker: '• ', seriesName: 'Visitors', value: [timestamp, 699] },
      { marker: '• ', seriesName: 'Orders', value: [timestamp, 22] },
      { marker: '• ', seriesName: 'Revenue', value: [timestamp, 1367.91] },
    ])).toBe(
      'March 1, 2026<br/>• Visitors: 699<br/>• Orders: 22<br/>• Revenue: 1367.91',
    );
  });

  it('returns a graceful invalid state for a mixed valid/invalid date column', () => {
    const data = dateTable([
      ['2026-01-01', '10'],
      ['not a date', '20'],
      ['2026-01-03', '30'],
    ]);

    expect(detectDataShape(data)).toMatchObject({ shape: 'date-series' });
    expect(createLineChartView(data, createDefaultGraphSettings())).toEqual({
      message: 'Date in row 2 is not a valid date. Fix it to update the graph.',
      status: 'invalid',
    });
  });

  it('selects monthly and yearly granularity from actual intervals', () => {
    expect(dateAxisGranularity([
      Date.UTC(2026, 0, 1),
      Date.UTC(2026, 1, 1),
      Date.UTC(2026, 2, 1),
    ])).toBe('month');
    expect(dateAxisGranularity([
      Date.UTC(2024, 0, 1),
      Date.UTC(2025, 0, 1),
      Date.UTC(2026, 0, 1),
    ])).toBe('year');
  });
});
