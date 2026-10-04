import { expect, test } from '@playwright/test';

async function pasteIntoFirstCell(page: import('@playwright/test').Page, text: string) {
  await page.locator('tbody input').first().evaluate((element, clipboardText) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', clipboardText);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, text);
}

test('serves a complete crawlable Pie tool page with accurate percentages', async ({ page }) => {
  await page.goto('/pie-chart-maker/');

  await expect(page).toHaveTitle('Pie Chart Maker — Create Percentage Charts | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /percentages automatically/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/pie-chart-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Pie Chart Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Pie Chart Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Pie' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Category, row 1')).toHaveValue('Product A');
  await expect(page.getByLabel('Value, row 4')).toHaveValue('10');
  await expect(page.locator('[data-rendered-chart-type="pie"] [data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'none');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '1');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Product A: 40, 40%. Product B: 30, 30%. Product C: 20, 20%. Product D: 10, 10%',
  );
  await expect(page.getByRole('button', { name: 'Paste data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload Excel' })).toBeVisible();

  for (const heading of [
    'How to make a pie chart',
    'What is a pie chart?',
    'Example pie chart data',
    'Pie Chart vs Bar Graph',
    'When to use a pie chart',
    'Pie chart maker features',
    'Related graph makers',
    'Pie chart maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: /Bar Graph Maker/ }).first()).toHaveAttribute('href', '/bar-graph-maker/');
  await expect(page.getByRole('link', { name: /Line Graph Maker/ }).first()).toHaveAttribute('href', '/line-graph-maker/');
  await expect(page.getByRole('link', { name: /Radar Chart Maker/ }).first()).toHaveAttribute('href', '/radar-chart-maker/');
});

test('selects one numeric series deliberately and updates live on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pie-chart-maker/');

  await pasteIntoFirstCell(page, 'Category\tSales\tProfit\nProduct A\t100\t30\nProduct B\t50\t20');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Product A: 100, 66.67%. Product B: 50, 33.33%',
  );
  await expect(page.getByText('Pie chart uses Sales. Change series in Customize.')).toBeVisible();

  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByLabel('Pie value series').selectOption({ label: 'Profit' });
  await expect(page.getByText('Pie chart uses Profit. Change series in Customize.')).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Product A: 30, 60%. Product B: 20, 40%',
  );
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});

test('explains invalid values and redirects numeric X/Y data to Scatter', async ({ page }) => {
  await page.goto('/pie-chart-maker/');

  await pasteIntoFirstCell(page, 'Category\tValue\nA\t10\nB\t-2');
  await expect(page.locator('[data-chart-status="invalid"]')).toContainText(
    'Value in row 2 cannot be negative for a pie chart.',
  );

  await pasteIntoFirstCell(page, 'Category\tValue\nA\t0\nB\t0');
  await expect(page.locator('[data-chart-status="invalid"]')).toContainText(
    'Pie chart values cannot all be zero. Enter at least one positive value.',
  );

  await pasteIntoFirstCell(page, 'Height\tWeight\n150\t48\n160\t57\n170\t66');
  await expect(page.locator('[data-chart-status="empty"]')).toContainText(
    'Pie charts need one category column and one numeric value column.',
  );
  await expect(page.getByRole('region', { name: 'Detected data' })).toContainText('Recommended: Scatter plot');
  await expect(page.getByRole('button', { name: 'Switch to Scatter' })).toBeVisible();
});
