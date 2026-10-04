import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

test('serves a complete Radar page with a percentage-scaled multi-series preset', async ({ page }) => {
  await page.goto('/radar-chart-maker/');

  await expect(page).toHaveTitle('Radar Chart Maker — Create Spider Charts Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /radar and spider charts online/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/radar-chart-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Radar Chart Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Radar Chart Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Radar' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Metric, row 1', { exact: true })).toHaveValue('Speed');
  await expect(page.getByLabel('Team A, row 5')).toHaveValue('92');
  await expect(page.getByLabel('Team B, row 5')).toHaveValue('89');
  const chart = page.locator('[data-rendered-chart-type="radar"] [data-chart-status="ready"]');
  await expect(chart).toBeVisible();
  await expect(chart).toHaveAttribute('data-series-count', '2');
  await expect(chart).toContainText('Radar chart with 5 metrics and 2 series');
  await expect(chart).toContainText('Team A: Speed 80, Quality 90, Cost 65, Support 88, Reliability 92');
  await expect(chart).toContainText('Team B: Speed 70, Quality 85, Cost 78, Support 82, Reliability 89');
  await expect(page.getByRole('region', { name: 'Detected data' })).toContainText('Chart: Radar');
  await expect(page.getByRole('button', { name: 'Switch to Bar' })).toHaveCount(0);

  for (const name of ['Paste data', 'Upload CSV', 'Upload Excel', 'Save locally', 'Download']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }

  for (const heading of [
    'How to make a radar chart',
    'What is a radar chart?',
    'Example radar chart data',
    'Radar Chart vs Bar Chart',
    'When to use a radar chart',
    'How radar scales work',
    'Radar chart maker features',
    'Related graph makers',
    'Radar chart maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: /Bar Graph Maker/ }).first()).toHaveAttribute('href', '/bar-graph-maker/');
  await expect(page.getByRole('link', { name: /Pie Chart Maker/ }).first()).toHaveAttribute('href', '/pie-chart-maker/');
  await expect(page.getByRole('link', { name: /Line Graph Maker/ }).first()).toHaveAttribute('href', '/line-graph-maker/');
});

test('handles pasted, CSV, and Excel radar data on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/radar-chart-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  await page.getByLabel('Metric, row 1', { exact: true }).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', [
      'Metric\tProduct X\tProduct Y',
      'Speed\t120\t90',
      'Quality\t135\t110',
      'Cost\t75\t80',
      'Support\t105\t95',
    ].join('\n'));
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });
  const chart = page.locator('[data-chart-status="ready"]');
  await expect(chart).toContainText('Radar chart with 4 metrics and 2 series');
  await expect(chart).toContainText('Product X: Speed 120, Quality 135, Cost 75, Support 105');
  await expect(chart).toContainText('Product Y: Speed 90, Quality 110, Cost 80, Support 95');

  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from('Metric,Plan A,Plan B\nEase,72,81\nValue,84,76\nSupport,67,89'),
    mimeType: 'text/csv',
    name: 'plans.csv',
  });
  await expect(page.getByRole('region', { name: 'Preview import' })).toContainText('plans.csv · 3 rows · 3 columns');
  await page.getByRole('button', { name: 'Replace data' }).click();
  await expect(chart).toContainText('Plan A: Ease 72, Value 84, Support 67');
  await expect(chart).toContainText('Plan B: Ease 81, Value 76, Support 89');

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Metric', 'Before', 'After'],
    ['Speed', 60, 78],
    ['Quality', 70, 86],
    ['Support', 65, 82],
  ]), 'Data');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  await page.getByLabel('Choose XLSX file').setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    name: 'comparison.xlsx',
  });
  await expect(page.getByRole('region', { name: 'Preview import' })).toContainText('comparison.xlsx · 3 rows · 3 columns');
  await page.getByRole('button', { name: 'Replace data' }).click();
  await expect(chart).toContainText('Before: Speed 60, Quality 70, Support 65');
  await expect(chart).toContainText('After: Speed 78, Quality 86, Support 82');
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});

test('handles invalid values and crowded metrics safely', async ({ page }) => {
  await page.goto('/radar-chart-maker/');
  await page.getByLabel('Metric, row 1', { exact: true }).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Metric\tTeam A\nSpeed\t80\nQuality\tfast\nCost\t65');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });
  await expect(page.locator('[data-chart-status="invalid"]')).toContainText('Team A in row 2 must be a number.');

  const crowdedTable = [
    'Metric\tTeam A',
    ...Array.from({ length: 13 }, (_, index) => `Metric ${index + 1}\t${index + 10}`),
  ].join('\n');
  await page.getByLabel('Metric, row 1', { exact: true }).evaluate((element, table) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', table);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, crowdedTable);
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await expect(page.getByText('Radar charts may become hard to read with more than 12 metrics. Consider a Bar chart or reduce the number of metrics.')).toBeVisible();
});
