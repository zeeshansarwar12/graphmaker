import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createProjectSnapshot } from '../../src/lib/storage/graphProject';
import { openPage, reloadPage } from './navigation';

const route = '/box-plot-maker/';
const readyChart = (page: Page) => page.locator('[data-rendered-chart-type="boxplot"] [data-chart-status="ready"]');
const summaryMode = (page: Page) => page.getByRole('radio', { name: 'Five-number summary' });

test('edits and validates summary rows, exports the summary and restores both tables', async ({ page }, info) => {
  await openPage(page, route);
  const raw = page.getByRole('radio', { name: 'Raw data' });
  await expect(raw).toBeChecked();
  await page.getByLabel('Class A, row 1', { exact: true }).fill('73');
  await raw.focus();
  await raw.press('ArrowRight');
  await expect(summaryMode(page)).toBeChecked();
  const values = ['Group', 'Minimum', 'Q1', 'Median', 'Q3', 'Maximum'];
  for (const [index, value] of ['Group B', '2', '4', '7', '9', '16'].entries()) {
    await page.getByLabel(`${values[index]}, row 1`, { exact: true }).fill(value);
  }
  await expect(readyChart(page)).toContainText('Group B: minimum 2, Q1 4, median 7, Q3 9, maximum 16');
  await expect(readyChart(page)).toHaveAttribute('data-series-count', '1');
  await expect(page.getByText("Whiskers show the minimum and maximum. Outliers can't be identified from a five-number summary.")).toBeVisible();
  await page.locator('#editor').screenshot({ path: info.outputPath('summary-valid.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Add row' }).click();
  await page.getByLabel('Group, row 2', { exact: true }).fill('Broken');
  for (const [index, value] of ['4', '3', '5', '6', '8'].entries()) {
    await page.getByLabel(`${values[index + 1]}, row 2`, { exact: true }).fill(value);
  }
  await expect(page.getByText('Broken (row 2): use Minimum ≤ Q1 ≤ Median ≤ Q3 ≤ Maximum.')).toBeVisible();
  await expect(readyChart(page)).toContainText('Box plot with 1 group');
  await expect(readyChart(page)).not.toContainText('Broken:');
  await page.locator('#editor').screenshot({ path: info.outputPath('summary-error.png'), animations: 'disabled' });
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  const download = await csv;
  expect(await readFile(await download.path(), 'utf8')).toContain('Group,Minimum,Q1,Median,Q3,Maximum');
  expect(await readFile(await download.path(), 'utf8')).toContain('Group B,2,4,7,9,16');
  for (const extension of ['PNG', 'SVG']) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: extension, exact: true }).click();
    expect((await pending).suggestedFilename()).toMatch(new RegExp(`\\.${extension.toLowerCase()}$`));
  }
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download project backup' }).click();
  const saved = JSON.parse(await readFile(await (await backup).path(), 'utf8'));
  expect(saved).toMatchObject({ schemaVersion: 1, settings: { boxPlotInputMode: 'summary' } });
  expect(saved.data.rows[0].cells[0]).toBe('73');
  expect(saved.boxSummaryData.rows[0].cells[0]).toBe('Group B');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page, route);
  await expect(summaryMode(page)).toBeChecked();
  await expect(page.getByLabel('Group, row 1', { exact: true })).toHaveValue('Group B');
  await raw.check();
  await expect(page.getByLabel('Class A, row 1', { exact: true })).toHaveValue('73');
  await summaryMode(page).check();
  await expect(page.getByLabel('Maximum, row 1', { exact: true })).toHaveValue('16');
});

test('pastes and imports aliased summaries, fills from raw, and opens the worked example on mobile', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, route);
  await summaryMode(page).check();
  await page.getByLabel('Group, row 1', { exact: true }).evaluate(element => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'GROUP\tMIN\tLower Quartile\tQ2\tUpper Quartile\tMAX\nPaste\t1\t2\t3\t4\t90');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });
  const replace = page.getByRole('button', { name: 'Replace data' });
  await replace.click();
  await expect(readyChart(page)).toContainText('Paste: minimum 1, Q1 2, median 3, Q3 4, maximum 90');
  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from('MAX,Q2,Group,Q3,Minimum,Q1\n12,7,CSV group,9,1,4'),
    mimeType: 'text/csv', name: 'summary.csv',
  });
  await replace.click();
  await expect(readyChart(page)).toContainText('CSV group: minimum 1, Q1 4, median 7, Q3 9, maximum 12');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Group', 'minimum', 'lower quartile', 'median', 'upper quartile', 'maximum'],
    ['Workbook', 3, 4, 5, 6, 45],
  ]), 'Data');
  await page.getByLabel('Choose XLSX file').setInputFiles({
    buffer: Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', name: 'summary.xlsx',
  });
  await replace.click();
  await expect(readyChart(page)).toContainText('Workbook: minimum 3, Q1 4, median 5, Q3 6, maximum 45');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Fill from my raw data' }).click();
  await expect(page.getByLabel('Group, row 1', { exact: true })).toHaveValue('Workbook');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Fill from my raw data' }).click();
  await expect(page.getByLabel('Group, row 1', { exact: true })).toHaveValue('Class A');
  const example = page.getByRole('link', { name: 'Try this example' });
  await expect(example).toHaveAttribute('href', '#box-summary-example');
  await page.getByRole('radio', { name: 'Raw data' }).check();
  page.once('dialog', dialog => dialog.dismiss());
  await example.click();
  await expect(page.getByRole('radio', { name: 'Raw data' })).toBeChecked();
  page.once('dialog', dialog => dialog.accept());
  await example.click();
  await expect(summaryMode(page)).toBeChecked();
  await expect(readyChart(page)).toContainText('Class C scores: minimum 12, Q1 13, median 16, Q3 21, maximum 58');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.locator('#editor').screenshot({ path: info.outputPath('summary-mobile.png'), animations: 'disabled' });
});

test('opens a legacy schema-v1 backup in Raw data mode', async ({ page }) => {
  await openPage(page, route);
  const legacy = createProjectSnapshot({
    graphType: 'boxplot',
    settings: createDefaultGraphSettings(),
    data: {
      columns: [{ id: 'column-1', kind: 'number', name: 'Legacy scores' }],
      rows: [1, 2, 3, 4, 5].map(value => ({ id: `row-${value}`, cells: [String(value)] })),
    },
  });
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({
    buffer: Buffer.from(JSON.stringify(legacy)),
    mimeType: 'application/json', name: 'legacy.graphmaker.json',
  });
  await expect(page.getByRole('radio', { name: 'Raw data' })).toBeChecked();
  await expect(readyChart(page)).toContainText('Legacy scores: minimum 1');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page, route);
  await expect(page.getByRole('radio', { name: 'Raw data' })).toBeChecked();
  await expect(page.getByLabel('Legacy scores, row 1', { exact: true })).toHaveValue('1');
});
