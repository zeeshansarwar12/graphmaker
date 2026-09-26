import { expect, test } from '@playwright/test';

test('serves a complete scatter page with a points-only shared-editor preset', async ({ page }) => {
  await page.goto('/scatter-plot-maker/');

  await expect(page).toHaveTitle('Scatter Plot Maker — Plot X and Y Data Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /numeric X and Y data/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/scatter-plot-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Scatter Plot Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Scatter Plot Maker');

  await expect(page.getByRole('button', { exact: true, name: 'Scatter' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Hours Studied, row 1')).toHaveValue('1');
  await expect(page.getByLabel('Exam Score, row 8')).toHaveValue('91');
  await expect(page.getByLabel('Connect points')).toHaveCount(0);
  await expect(page.locator('[data-rendered-chart-type="scatter"] [data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'value');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Scatter plot with 8 points. X axis: Hours Studied. Y axis: Exam Score.',
  );
  await expect(page.getByText('Box Plot chart recommended for this data.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('X column')).toHaveValue('column-1');
  await expect(page.getByLabel('Y column')).toHaveValue('column-2');
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByRole('button', { name: 'Paste data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload Excel' })).toBeVisible();

  for (const heading of [
    'How to make a scatter plot',
    'What is a scatter plot?',
    'Example scatter data',
    'Scatter Plot vs XY Graph',
    'When to use a scatter plot',
    'Scatter plot maker features',
    'Related graph makers',
    'Scatter plot maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: /XY Graph Maker/ })).toHaveAttribute('href', '/xy-graph-maker/');
  await expect(page.getByRole('link', { name: /Line Graph Maker/ })).toHaveAttribute('href', '/line-graph-maker/');
  await expect(page.getByRole('link', { name: /Bar Graph Maker/ })).toHaveAttribute('href', '/bar-graph-maker/');
});

test('remaps imported numeric columns and stays responsive on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/scatter-plot-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  await page.getByLabel('Hours Studied, row 1').evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Height\tWeight\tAge\n150\t48\t20\n165\t61\t30\n180\t81\t40');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('X column')).toHaveValue('column-1');
  await expect(page.getByLabel('Y column')).toHaveValue('column-2');
  await page.getByLabel('Y column').selectOption({ label: 'Age' });
  await expect(page.getByRole('heading', { level: 3, name: 'Age by Height' })).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Scatter plot with 3 points. X axis: Height. Y axis: Age.',
  );
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});
