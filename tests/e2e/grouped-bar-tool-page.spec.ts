import { expect, test } from '@playwright/test';
import { openPage } from './navigation';

test('grouped workflow adds a third series, exports and restores independently of the bar pillar', async ({ page }) => {
  await openPage(page, '/bar-graph-maker/');
  await page.getByLabel('Sales, row 1').fill('321');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.', { exact: true }).first()).toBeVisible();
  await openPage(page, '/grouped-bar-chart-maker/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Grouped Bar Graph Maker');
  await expect(page.getByLabel('Class A, row 1')).toHaveValue('78');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
  await page.getByRole('button', { name: 'Add series', exact: true }).click();
  const added = page.locator('tbody tr').first().locator('input').last();
  await added.fill('90');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '3');
  await page.getByLabel('Class A, row 1').fill('81');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Class A, row 1')).toHaveValue('81');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '3');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SVG', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.svg$/);
  expect(await download.failure()).toBeNull();
  await openPage(page, '/bar-graph-maker/');
  await expect(page.getByLabel('Sales, row 1')).toHaveValue('321');
});

test('grouped comparison is crawlable and fits a narrow screen', async ({ page, request }) => {
  const html = await (await request.get('/grouped-bar-chart-maker/')).text();
  expect(html).toContain('Double, triple, or multiple bars?');
  expect(html).toContain('Grouped vs stacked bar charts');
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/grouped-bar-chart-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await expect(page.getByLabel('Class B, row 2')).toHaveValue('80');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
