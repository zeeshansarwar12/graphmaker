import { expect, test } from '@playwright/test';

test('serves a complete crawlable Bar tool page with grouped sample series', async ({ page }) => {
  await page.goto('/bar-graph-maker/');

  await expect(page).toHaveTitle('Bar Graph Maker — Create Grouped Bar Charts Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /bar graph online for free/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/bar-graph-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Bar Graph Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Bar Graph Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Category, row 1')).toHaveValue('Jan');
  await expect(page.getByLabel('Sales, row 3')).toHaveValue('240');
  await expect(page.getByLabel('Profit, row 4')).toHaveValue('63');
  await expect(page.locator('[data-rendered-chart-type="bar"] [data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'category');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'vertical bar graph with 4 categories and 2 series',
  );
  await expect(page.getByRole('button', { name: 'Paste data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload Excel' })).toBeVisible();

  for (const heading of [
    'How to make a bar graph',
    'What is a bar graph?',
    'Example bar graph data',
    'Bar Graph vs Column Chart',
    'When to use a bar graph',
    'Bar graph maker features',
    'Related graph makers',
    'Bar graph maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: /Line Graph Maker/ })).toHaveAttribute('href', '/line-graph-maker/');
  await expect(page.getByRole('link', { name: /Pie Chart Maker/ })).toHaveAttribute('href', '/pie-chart-maker/');
  await expect(page.getByRole('link', { name: /Histogram Maker/ })).toHaveAttribute('href', '/histogram-maker/');
});

test('updates grouped pasted data live and remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/bar-graph-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  await page.getByLabel('Category, row 1').evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Region\tRevenue\tCosts\nNorth\t300\t120\nSouth\t450\t190\nWest\t375\t155');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await expect(page.getByLabel('Region, row 1')).toHaveValue('North');
  await expect(page.getByLabel('Revenue, row 2')).toHaveValue('450');
  await expect(page.getByLabel('Costs, row 3')).toHaveValue('155');
  await expect(page.getByRole('heading', { level: 3, name: 'Revenue and Costs by Region' })).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Revenue: North 300, South 450, West 375. Costs: North 120, South 190, West 155',
  );
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});
