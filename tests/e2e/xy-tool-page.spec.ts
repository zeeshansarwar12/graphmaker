import { openPage } from './navigation';
import { expect, test } from '@playwright/test';

test('serves a complete crawlable XY tool page with the shared editor preset', async ({ page }) => {
  await openPage(page, '/xy-graph-maker/');

  await expect(page).toHaveTitle('XY Graph Maker — Plot X and Y Values Online | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /paired X and Y values/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/xy-graph-maker\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'XY Graph Maker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home/Graph tools/XY Graph Maker');

  await expect(page.getByRole('button', { exact: true, name: 'XY' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('X, row 1')).toHaveValue('1');
  await expect(page.getByLabel('Y, row 5')).toHaveValue('7');
  await expect(page.getByLabel('Connect points')).toBeChecked();
  await expect(page.locator('[data-rendered-chart-type="xy"] [data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'value');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'XY graph with 5 points connected in data order',
  );

  await page.getByLabel('Connect points').uncheck();
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'XY graph with 5 points shown as unconnected points',
  );
  await expect(page.getByRole('button', { name: 'Paste data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload Excel' })).toBeVisible();

  for (const heading of [
    'How to make an XY graph',
    'What is an XY graph?',
    'Example XY dataset',
    'When to use XY vs Scatter',
    'XY graph maker features',
    'Related graph makers',
    'XY graph maker FAQ',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: /Scatter Plot Maker/ }).first()).toHaveAttribute('href', '/scatter-plot-maker/');
  await expect(page.getByRole('link', { name: /Line Graph Maker/ }).first()).toHaveAttribute('href', '/line-graph-maker/');
  await expect(page.getByRole('link', { name: /Bar Graph Maker/ }).first()).toHaveAttribute('href', '/bar-graph-maker/');
});

test('accepts pasted XY data and remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/xy-graph-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  await page.getByLabel('X, row 1').evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Time\tDistance\n1\t10\n2\t25\n4\t60');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await expect(page.getByLabel('Time, row 1')).toHaveValue('1');
  await expect(page.getByLabel('Distance, row 3')).toHaveValue('60');
  await expect(page.getByRole('heading', { level: 3, name: 'Distance by Time' })).toBeVisible();
  await expect(page.getByRole('button', { exact: true, name: 'XY' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});

test('does not restore a project saved on another specialist page', async ({ page }) => {
  await openPage(page, '/radar-chart-maker/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await page.getByRole('button', { exact: true, name: 'Line' }).click();
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('graph-maker', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('projects', 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.get('current-project:/radar-chart-maker/');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        store.put({ ...request.result, id: 'current-project:/xy-graph-maker/' });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await openPage(page, '/xy-graph-maker/');
  await expect(page.getByRole('button', { exact: true, name: 'XY' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('X, row 1')).toHaveValue('1');
  await expect(page.getByLabel('Y, row 5')).toHaveValue('7');
  await expect(page.locator('[data-rendered-chart-type="xy"] [data-chart-status="ready"]')).toBeVisible();

  await openPage(page, '/radar-chart-maker/');
  await expect(page.getByRole('button', { exact: true, name: 'Radar' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Metric, row 1')).toHaveValue('Speed');
});
