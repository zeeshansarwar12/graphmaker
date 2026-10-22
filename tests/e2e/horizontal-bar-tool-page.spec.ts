import { expect, test } from '@playwright/test';
import { openPage } from './navigation';

test('horizontal workflow preserves ordering, grouped data, orientation and local work', async ({ page }) => {
  await openPage(page, '/horizontal-bar-graph-maker/');
  const chart = page.locator('[data-chart-status="ready"]');
  await expect(page.getByRole('radio', { name: 'Horizontal', exact: true })).toBeChecked();
  await expect(chart).toContainText('horizontal bar graph with 5 categories and 1 series');
  await expect(page.getByLabel('Priority, row 1')).toHaveValue('Public transport');
  await page.getByLabel('Responses, row 1').fill('94');
  await page.getByRole('button', { name: 'Add series', exact: true }).click();
  await page.locator('tbody tr').first().locator('input').last().fill('61');
  await expect(chart).toHaveAttribute('data-series-count', '2');
  await expect(chart).toContainText('Responses: Public transport 94, Parks and recreation 72');
  await page.getByRole('radio', { name: 'Vertical', exact: true }).check();
  await expect(chart).toContainText('vertical bar graph');
  await page.getByRole('radio', { name: 'Horizontal', exact: true }).check();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Responses, row 1')).toHaveValue('94');
  await expect(page.getByRole('radio', { name: 'Horizontal', exact: true })).toBeChecked();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SVG', exact: true }).click();
  expect((await pending).suggestedFilename()).toMatch(/\.svg$/);
  await openPage(page, '/bar-graph-maker/');
  await expect(page.getByLabel('Sales, row 1')).toHaveValue('120');
});

test('horizontal page has connected schema, indexable content and mobile layout', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/horizontal-bar-graph-maker/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Horizontal Bar Graph Maker');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '[]');
  const app = schemas.find((item: Record<string, unknown>) => item['@type'] === 'WebApplication');
  const webpage = schemas.find((item: Record<string, unknown>) => item['@type'] === 'WebPage');
  expect(app.alternateName).toContain('Horizontal Bar Chart Maker');
  expect(webpage.mainEntity['@id']).toBe(app['@id']);
  expect(app.mainEntityOfPage['@id']).toBe(webpage['@id']);
  expect(app.publisher['@id']).toBe('https://graphmaker.site/#organization');
  const html = await (await request.get('/horizontal-bar-graph-maker/')).text();
  expect(html).toContain('Compare multiple series horizontally');
  expect(html).toContain('Horizontal bars vs vertical columns');
});
