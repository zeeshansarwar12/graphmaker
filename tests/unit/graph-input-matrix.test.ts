import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { createBarChartView } from '../../src/graph/configs/barChart';
import { createBoxPlotChartView } from '../../src/graph/configs/boxPlotChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createHistogramChartView } from '../../src/graph/configs/histogramChart';
import { createLineChartView } from '../../src/graph/configs/lineChart';
import { createPieChartView } from '../../src/graph/configs/pieChart';
import { createRadarChartView } from '../../src/graph/configs/radarChart';
import { createScatterChartView } from '../../src/graph/configs/scatterChart';
import { createXyChartView } from '../../src/graph/configs/xyChart';
import {
  createAdaptiveSettings,
} from '../../src/graph/transforms/dataInterpretation';
import {
  createDataFromClipboard,
  createDataFromRows,
  parseClipboardTable,
} from '../../src/graph/transforms/tabularData';
import type { TabularData } from '../../src/graph/transforms/tabularData';
import { parseCsvText, parseXlsxBuffer } from '../../src/lib/import/tabularImport';

const fixtures = [
  { name: 'Bar', rows: [['Quarter', 'Revenue'], ['Q1', '12'], ['Q2', '18']], view: createBarChartView },
  { name: 'Line', rows: [['Date', 'Visitors'], ['2026-01-01', '12'], ['2026-02-01', '18']], view: createLineChartView },
  { name: 'Pie', rows: [['Channel', 'Share'], ['Direct', '60'], ['Search', '40']], view: createPieChartView },
  { name: 'XY', rows: [['Input', 'Output'], ['1', '3'], ['2', '7']], view: createXyChartView },
  { name: 'Scatter', rows: [['Height', 'Weight'], ['150', '48'], ['170', '67']], view: createScatterChartView },
  { name: 'Histogram', rows: [['Score'], ['61'], ['68'], ['72'], ['81'], ['89']], view: createHistogramChartView },
  { name: 'Box Plot', rows: [['Score'], ['1'], ['2'], ['3'], ['4'], ['5']], view: createBoxPlotChartView },
  { name: 'Radar', rows: [['Metric', 'Team A'], ['Speed', '80'], ['Quality', '90'], ['Cost', '65']], view: createRadarChartView },
] as const;

function csvFromRows(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.join(',')).join('\n');
}

function xlsxFromRows(rows: readonly (readonly string[])[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(
    rows.map((row) => [...row]),
  ), 'Data');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

function expectReady(data: TabularData, view: (data: TabularData, settings: ReturnType<typeof createDefaultGraphSettings>) => { status: string }) {
  expect(view(data, createAdaptiveSettings(data, createDefaultGraphSettings())).status).toBe('ready');
}

describe('all V1 graph types across shared input paths', () => {
  for (const fixture of fixtures) {
    it(`${fixture.name} renders manual, pasted, CSV, and XLSX data`, async () => {
      const manual = createDataFromRows(fixture.rows.map((row) => [...row]));
      const clipboard = parseClipboardTable(fixture.rows.map((row) => row.join('\t')).join('\n'));
      const csv = parseCsvText(csvFromRows(fixture.rows));
      const xlsx = await parseXlsxBuffer(xlsxFromRows(fixture.rows));

      expect(clipboard.ok).toBe(true);
      expect(csv.ok).toBe(true);
      expect(xlsx.ok).toBe(true);
      if (!clipboard.ok || !csv.ok || !xlsx.ok) throw new Error('Expected valid normalized input');

      for (const data of [
        manual,
        createDataFromClipboard(clipboard.rows),
        csv.data,
        xlsx.data,
      ]) {
        expectReady(data, fixture.view);
      }
    });
  }
});
