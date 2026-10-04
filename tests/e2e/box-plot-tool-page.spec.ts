import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

test('serves a complete Box Plot page with the shared grouped-data preset', async ({ page }) => {
  await page.goto('/box-plot-maker/');

  await expect(page).toHaveTitle('Box Plot Maker — Box and Whisker Plots Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /quartiles and outliers/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/box-plot-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Box Plot Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Box Plot Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Box Plot' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Class A, row 1', { exact: true })).toHaveValue('72');
  await expect(page.getByLabel('Class B, row 10')).toHaveValue('80');
  await expect(page.locator('[data-rendered-chart-type="boxplot"] [data-chart-status="ready"]')).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Box plot with 2 groups');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Class A: minimum 67');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Class B: minimum 74');

  for (const name of ['Paste data', 'Upload CSV', 'Upload Excel', 'Save locally', 'Download']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }

  for (const heading of [
    'How to make a box plot',
    'What is a box plot?',
    'Example box plot data',
    'How to read a box plot',
    'Box Plot vs Histogram',
    'Quartiles and outliers',
    'Box plot maker features',
    'Related graph makers',
    'Box plot maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: /Histogram Maker/ }).first()).toHaveAttribute('href', '/histogram-maker/');
  await expect(page.getByRole('link', { name: /Scatter Plot Maker/ }).first()).toHaveAttribute('href', '/scatter-plot-maker/');
  await expect(page.getByRole('link', { name: /Bar Graph Maker/ }).first()).toHaveAttribute('href', '/bar-graph-maker/');
});

test('handles pasted, CSV, and Excel box-plot data on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/box-plot-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  await page.getByLabel('Class A, row 1', { exact: true }).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', [
      'Class A\tClass B',
      '1\t2',
      '2\t3',
      '3\t4',
      '4\t5',
      '5\t6',
      '100\tinvalid',
      '\t7',
    ].join('\n'));
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  const chart = page.locator('[data-chart-status="ready"]');
  await expect(chart).toContainText('Class A: minimum 1, Q1 2, median 3.5, Q3 5, maximum 100, IQR 3, 1 outlier');
  await expect(chart).toContainText('Class B: minimum 2');
  await expect(page.getByText('1 invalid non-numeric value was ignored.')).toBeVisible();

  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from('North,South\n10,12\n11,13\n12,14\n13,15\n14,16'),
    mimeType: 'text/csv',
    name: 'groups.csv',
  });
  await expect(page.getByRole('region', { name: 'Preview import' })).toContainText('groups.csv · 5 rows · 2 columns');
  await page.getByRole('button', { name: 'Replace data' }).click();
  await expect(chart).toContainText('North: minimum 10');
  await expect(chart).toContainText('South: minimum 12');

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Control', 'Treatment'],
    [20, 28],
    [22, 29],
    [21, 31],
    [23, 30],
    [24, 32],
  ]), 'Data');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  await page.getByLabel('Choose XLSX file').setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    name: 'experiment.xlsx',
  });
  await expect(page.getByRole('region', { name: 'Preview import' })).toContainText('experiment.xlsx · 5 rows · 2 columns');
  await page.getByRole('button', { name: 'Replace data' }).click();
  await expect(chart).toContainText('Control: minimum 20');
  await expect(chart).toContainText('Treatment: minimum 28');
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});

test('warns clearly when a box-plot group has too few values', async ({ page }) => {
  await page.goto('/box-plot-maker/');
  await page.getByLabel('Class A, row 1', { exact: true }).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Score\n1\n2\n3');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await expect(page.getByText('Score has fewer than 5 valid observations; quartiles may be unreliable.')).toBeVisible();
});
