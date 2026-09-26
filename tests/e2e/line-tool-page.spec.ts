import { expect, test } from '@playwright/test';

test('serves a complete crawlable Line tool page with a true time-axis preset', async ({ page }) => {
  await page.goto('/line-graph-maker/');

  await expect(page).toHaveTitle('Line Graph Maker — Create Multiple Line Charts Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /true time axis/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/line-graph-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Line Graph Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Line Graph Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Line' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Date, row 1')).toHaveValue('2026-01-01');
  await expect(page.getByLabel('Visitors, row 7')).toHaveValue('940');
  await expect(page.getByLabel('Orders, row 7')).toHaveValue('33');
  await expect(page.locator('[data-rendered-chart-type="line"] [data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'time');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Line graph with 7 points and 2 series');
  await expect(page.getByRole('button', { name: 'Paste data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload Excel' })).toBeVisible();

  for (const heading of [
    'How to make a line graph',
    'What is a line graph?',
    'Example line graph data',
    'Line Graph vs Bar Graph',
    'When to use a line graph',
    'Multiple line graphs',
    'Line graph maker features',
    'Related graph makers',
    'Line graph maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: /Bar Graph Maker/ })).toHaveAttribute('href', '/bar-graph-maker/');
  await expect(page.getByRole('link', { name: /XY Graph Maker/ })).toHaveAttribute('href', '/xy-graph-maker/');
  await expect(page.getByRole('link', { name: /Scatter Plot Maker/ })).toHaveAttribute('href', '/scatter-plot-maker/');
});

test('updates pasted category data live and remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/line-graph-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  await page.getByLabel('Date, row 1').evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Stage\tPlanned\tActual\nStart\t12\t10\nMiddle\t20\t18\nFinish\t28\t30');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await expect(page.getByLabel('Stage, row 1')).toHaveValue('Start');
  await expect(page.getByLabel('Planned, row 2')).toHaveValue('20');
  await expect(page.getByLabel('Actual, row 3')).toHaveValue('30');
  await expect(page.getByRole('heading', { level: 3, name: 'Planned and Actual by Stage' })).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'category');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Planned: 12, 20, 28. Actual: 10, 18, 30',
  );
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});
