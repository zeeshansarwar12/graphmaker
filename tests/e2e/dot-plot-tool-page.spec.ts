import { expect, test } from '@playwright/test';

test('serves a complete Dot Plot page with the shared raw-observation preset', async ({ page }) => {
  await page.goto('/dot-plot-maker/');

  await expect(page).toHaveTitle('Dot Plot Maker — Create a Dot Plot Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Stack repeated values/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/dot-plot-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dot Plot Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Dot Plot Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Dot Plot' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Value, row 1', { exact: true })).toHaveValue('12');
  await expect(page.getByLabel('Value, row 20')).toHaveValue('24');
  const chart = page.locator('[data-rendered-chart-type="dotplot"] [data-chart-status="ready"]');
  await expect(chart).toBeVisible();
  await expect(chart).toHaveAttribute('data-axis-type', 'value');
  await expect(chart).toContainText('Dot plot with 20 observations');
  await expect(chart).toContainText('15: 3');
  await expect(chart).toContainText('18: 4');

  for (const name of ['Paste data', 'Upload CSV', 'Upload Excel', 'Save locally', 'Download']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  for (const heading of [
    'How to make a dot plot',
    'What is a dot plot?',
    'Example dot plot data',
    'Dot Plot vs Histogram',
    'When to use a dot plot',
    'Dot plot maker features',
    'Related graph makers',
    'Dot plot maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Dot size')).toHaveValue('10');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chart.locator('canvas')).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});

test('switches numeric series and rejects incompatible structured data', async ({ page }) => {
  await page.goto('/dot-plot-maker/');
  await page.getByLabel('Value, row 1', { exact: true }).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Math\tScience\n12\t20\n12\t21\n14\t21');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Selected series')).toHaveValue(/column/);
  await page.getByLabel('Selected series').selectOption({ label: 'Science' });
  await expect(page.getByRole('heading', { level: 3, name: 'Dot Plot of Science' })).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('20: 1, 21: 2');

  await page.getByLabel('Math, row 1', { exact: true }).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Category\tValue\nA\t10\nB\t20');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });
  const empty = page.locator('[data-chart-status="empty"]');
  await expect(empty).toContainText('This data may not be suitable for a dot plot.');
  await expect(empty).toContainText('Dot plots work best with a single numeric series of observations.');
  await expect(empty.getByRole('button', { name: /Switch to/ })).toBeVisible();
});
