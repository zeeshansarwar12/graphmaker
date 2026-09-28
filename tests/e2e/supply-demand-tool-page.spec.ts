import { expect, test } from '@playwright/test';

test('serves a complete Supply and Demand page with equilibrium on numeric axes', async ({ page }) => {
  await page.goto('/supply-and-demand-graph-maker/');

  await expect(page).toHaveTitle('Supply and Demand Graph Maker — Economics Graph Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /detect in-range equilibrium/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/supply-and-demand-graph-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Supply and Demand Graph Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Supply and Demand Graph Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Supply & Demand' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Quantity, row 1', { exact: true })).toHaveValue('10');
  await expect(page.getByLabel('Supply, row 7')).toHaveValue('80');
  const chart = page.locator('[data-rendered-chart-type="supplydemand"] [data-chart-status="ready"]');
  await expect(chart).toBeVisible();
  await expect(chart).toHaveAttribute('data-axis-type', 'value');
  await expect(chart).toHaveAttribute('data-series-count', '2');
  await expect(chart).toContainText('7 quantity points');
  await expect(page.locator('[data-chart-insight]')).toHaveText('Equilibrium: quantity 45, value 55.');

  for (const name of ['Paste data', 'Upload CSV', 'Upload Excel', 'Save locally', 'Download']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  for (const heading of [
    'How to make a supply and demand graph',
    'What is a supply and demand graph?',
    'Example supply and demand data',
    'How equilibrium works',
    'How to read supply and demand curves',
    'When to use this tool',
    'Supply and demand graph maker features',
    'Related economics and graph tools',
    'Supply and demand graph maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Quantity / X column')).toHaveValue(/column/);
  await expect(page.getByLabel('Demand series')).toHaveValue(/column/);
  await expect(page.getByLabel('Supply series')).toHaveValue(/column/);
  await expect(page.getByLabel('Show equilibrium marker')).toBeChecked();
  await page.getByLabel('Show equilibrium marker').uncheck();
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Show equilibrium marker')).not.toBeChecked();
  await expect(page.locator('[data-chart-insight]')).toHaveText('Equilibrium: quantity 45, value 55.');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chart.locator('canvas')).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});

test('maps equivalent headers and reports when curves never cross', async ({ page }) => {
  await page.goto('/supply-and-demand-graph-maker/');
  await page.getByLabel('Quantity, row 1', { exact: true }).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Q\tBuyers\tSellers\n10\t90\t20\n25\t80\t30\n60\t70\t40');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await expect(page.locator('[data-chart-insight]')).toHaveText(
    'No equilibrium appears within the supplied quantity range.',
  );
  await expect(page.getByText('Detected: Q → Buyers, Sellers')).toBeVisible();

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Quantity / X column')).toHaveValue(/column/);
  await expect(page.getByLabel('Demand series')).toHaveValue(/column/);
  await expect(page.getByLabel('Supply series')).toHaveValue(/column/);
  await page.getByLabel('Demand series').selectOption({ label: 'Sellers' });
  await expect(page.getByText('Detected: Q → Sellers, Buyers')).toBeVisible();
});
