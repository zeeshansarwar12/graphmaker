import { openPage, reloadPage } from './navigation';
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('renders the Astro shell and shared editor island', async ({ page }) => {
  await openPage(page, '/');

  await expect(page.getByRole('heading', { level: 1, name: 'Free Online Graph Maker' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Graph editor' })).toBeVisible();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Graph preview' })).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '1');
  await expect(page.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Save locally' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Popular Graph Makers' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();
});

test('uses the mobile editor order without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/');

  const preview = page.getByRole('heading', { level: 3, name: 'Monthly Sales' });
  const data = page.getByRole('heading', { exact: true, level: 3, name: 'Data' });

  await expect(preview).toBeVisible();
  await expect(data).toBeVisible();

  const editorNavigation = page.getByRole('navigation', { name: 'Editor sections' });
  await expect(editorNavigation).toBeVisible();

  await editorNavigation.getByRole('button', { name: 'Edit data' }).click();
  await expect(page.locator('#data-editor')).toBeInViewport();

  await editorNavigation.getByRole('button', { name: 'Open customization' }).click();
  await expect(page.getByLabel('Customize graph')).toBeVisible();
  await expect(page.getByLabel('Customize graph')).toBeInViewport();

  const [previewBox, dataBox] = await Promise.all([preview.boundingBox(), data.boundingBox()]);
  expect(previewBox?.y).toBeLessThan(dataBox?.y ?? 0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('Create graph links directly to the data editor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/');

  await page.getByText('Menu', { exact: true }).click();
  const createGraph = page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Create graph' });
  await expect(createGraph).toHaveAttribute('href', '#data-editor');
  await createGraph.click();
  await expect(page.locator('#data-editor')).toBeInViewport();
});

test('edits, navigates, validates, and pastes spreadsheet data', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);

  const firstSalesCell = page.getByLabel('Sales, row 1');
  await expect(firstSalesCell).toHaveValue('32');
  await firstSalesCell.fill('40');
  await expect(firstSalesCell).toHaveValue('40');
  await expect(page.getByText('Sample data', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Sales: Jan 40');

  await firstSalesCell.press('ArrowDown');
  await expect(page.getByLabel('Sales, row 2')).toBeFocused();
  expect(await page.getByLabel('Sales, row 2').evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  )).not.toBe('none');
  await page.getByLabel('Sales, row 2').fill('not a number');
  await expect(page.locator('[data-chart-status="invalid"]')).toContainText('Sales in row 2 must be a number.');

  const firstMonthCell = page.getByLabel('Month, row 1');
  await firstMonthCell.evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'May\t70\nJun\t80');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });

  await expect(page.getByLabel('Month, row 1')).toHaveValue('May');
  await expect(page.getByLabel('Sales, row 2')).toHaveValue('80');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Sales: May 70, Jun 80');
});

test('reads clipboard data through the Paste data button when permission is granted', async ({ context, page }) => {
  await openPage(page, '/');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  });
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.clipboard.writeText([
      'Metric\tTeam A\tTeam B',
      'Speed\t80\t70',
      'Quality\t90\t85',
      'Cost\t65\t78',
    ].join('\n'));
  });

  await page.getByRole('button', { name: 'Paste data' }).click();
  await expect(page.getByRole('region', { name: 'Preview import' })).toContainText(
    'Clipboard data · 3 rows · 3 columns · Header detected',
  );
  await page.getByRole('button', { name: 'Replace data' }).click();

  await expect(page.getByLabel('Metric, row 1')).toHaveValue('Speed');
  await expect(page.getByLabel('Team B, row 3')).toHaveValue('78');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('renders multiple series, supports titles, handles empty data, and resizes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openPage(page, '/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);

  const chart = page.locator('[data-chart-status="ready"]');
  const canvas = chart.locator('canvas');
  const initialWidth = (await canvas.boundingBox())?.width ?? 0;

  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByLabel('Graph title').fill('Revenue and Profit');
  await expect(chart).toContainText('Revenue and Profit.');
  await expect(page.getByRole('heading', { level: 3, name: 'Revenue and Profit' })).toBeVisible();

  await page.getByLabel('Show grid').uncheck();
  await page.getByLabel('Show value labels').uncheck();
  await page.getByText('Advanced controls').click();
  await page.getByLabel('Orientation').selectOption('horizontal');
  await expect(page.locator('[data-chart-orientation="horizontal"]')).toBeVisible();
  await expect(page.getByLabel('X-axis title')).toHaveValue('Sales');
  await expect(page.getByLabel('Y-axis title')).toHaveValue('Month');

  await page.getByRole('button', { name: 'Add series' }).click();
  await page.getByLabel('Rename Series 2 header').fill('Profit');
  await page.getByLabel('Profit, row 1').fill('8');
  await expect(chart).toHaveAttribute('data-series-count', '2');
  await expect(chart).toContainText('Profit: Jan 8');

  await page.setViewportSize({ width: 600, height: 900 });
  await expect.poll(async () => (await canvas.boundingBox())?.width ?? initialWidth).toBeLessThan(initialWidth);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.locator('[data-chart-status="empty"]')).toContainText('Add category labels');
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Add valid data before exporting');
});

test('previews CSV imports and preserves data when a later import fails', async ({ page }) => {
  await openPage(page, '/');

  await expect(page.getByText('Your data is processed in your browser.')).toBeVisible();
  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from('Month,Revenue,Profit\nMay,70,14\nJun,80,18'),
    mimeType: 'text/csv',
    name: 'revenue.csv',
  });

  const preview = page.getByRole('table', { name: 'Import preview' });
  await expect(page.getByRole('heading', { name: 'Preview import' })).toBeVisible();
  await expect(page.getByText('revenue.csv · 2 rows · 3 columns · Header detected')).toBeVisible();
  await expect(preview).toContainText('Revenue');
  await expect(preview).toContainText('May');
  await expect(page.getByLabel('Sales, row 1')).toHaveValue('32');

  await page.getByRole('button', { name: 'Replace data' }).click();
  await expect(page.getByLabel('Revenue, row 1')).toHaveValue('70');
  await expect(page.getByLabel('Profit, row 2')).toHaveValue('18');
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');

  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from('Month,Revenue\n"Jul,90'),
    mimeType: 'text/csv',
    name: 'broken.csv',
  });

  await expect(page.getByRole('alert')).toContainText('This CSV could not be read');
  await expect(page.getByLabel('Revenue, row 1')).toHaveValue('70');
  await expect(page.getByLabel('Profit, row 2')).toHaveValue('18');
});

test('completes the edit, paste, customize, save, restore, export, and reset journey', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();

  await page.getByLabel('Sales, row 1').fill('99');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Sales: Jan 99');

  await page.getByLabel('Month, row 1').evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'May\t70\t14\nJun\t80\t18');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Series 2: May 14, Jun 18');

  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByLabel('Graph title').fill('Saved Revenue');
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();

  await reloadPage(page);
  await expect(page.getByRole('heading', { level: 3, name: 'Saved Revenue' })).toBeVisible();
  await expect(page.getByLabel('Sales, row 1')).toHaveValue('70');
  await expect(page.getByLabel('Series 2, row 2')).toHaveValue('18');
  await expect(page.getByText('Restored your previous project from this device.')).toBeVisible();

  const graphDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  expect((await graphDownloadPromise).suggestedFilename()).toBe('saved-revenue.png');

  await page.getByRole('button', { name: 'New graph' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('This replaces the current data and settings');
  await page.getByRole('button', { name: 'Reset graph' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Monthly Sales' })).toBeVisible();
  await expect(page.getByLabel('Sales, row 1')).toHaveValue('32');
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();

  await reloadPage(page);
  await expect(page.getByRole('heading', { level: 3, name: 'Monthly Sales' })).toBeVisible();
  await expect(page.getByLabel('Sales, row 1')).toHaveValue('32');
});

test('recovers safely from corrupted IndexedDB project state', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('graph-maker', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('projects', 'readwrite');
      transaction.objectStore('projects').put({ broken: true, id: 'current-project', schemaVersion: 1 });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await reloadPage(page);
  await expect(page.getByRole('alert')).toContainText('saved local project was corrupted');
  await expect(page.getByLabel('Sales, row 1')).toHaveValue('32');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
});

test('imports and exports portable projects and graph files', async ({ page }) => {
  await openPage(page, '/');
  const project = {
    createdAt: '2026-09-16T08:00:00.000Z',
    data: {
      columns: [
        { id: 'column-1', kind: 'label', name: 'Quarter' },
        { id: 'column-2', kind: 'number', name: 'Revenue' },
      ],
      rows: [
        { cells: ['Q1', '120'], id: 'row-1' },
        { cells: ['Q2', '145'], id: 'row-2' },
      ],
    },
    graphType: 'bar',
    id: 'current-project',
    name: 'Imported Revenue',
    schemaVersion: 1,
    settings: {
      orientation: 'vertical',
      seriesColors: ['#2563eb'],
      showGrid: true,
      showLegend: true,
      showValueLabels: true,
      title: 'Imported Revenue',
      xAxisTitle: 'Quarter',
      yAxisTitle: 'Revenue',
    },
    updatedAt: '2026-09-16T08:00:00.000Z',
  };

  await page.getByLabel('Choose GraphMaker project file').setInputFiles({
    buffer: Buffer.from(JSON.stringify(project)),
    mimeType: 'application/json',
    name: 'revenue.graphmaker.json',
  });
  await expect(page.getByRole('heading', { level: 3, name: 'Imported Revenue' })).toBeVisible();
  await expect(page.getByLabel('Revenue, row 2')).toHaveValue('145');

  const projectDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export project' }).click();
  const projectDownload = await projectDownloadPromise;
  expect(projectDownload.suggestedFilename()).toBe('imported-revenue.graphmaker.json');
  const projectPath = await projectDownload.path();
  expect(projectPath).not.toBeNull();
  expect(JSON.parse(await readFile(projectPath!, 'utf8')).settings.title).toBe('Imported Revenue');

  const csvDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe('imported-revenue.csv');
  const csvPath = await csvDownload.path();
  expect(csvPath).not.toBeNull();
  expect(await readFile(csvPath!, 'utf8')).toBe('Quarter,Revenue\r\nQ1,120\r\nQ2,145');

  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  expect((await pngDownloadPromise).suggestedFilename()).toBe('imported-revenue.png');

  const svgDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SVG', exact: true }).click();
  expect((await svgDownloadPromise).suggestedFilename()).toBe('imported-revenue.svg');
});

test('keeps long labels and a large dataset contained on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await openPage(page, '/');
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();

  const header = 'A very long category heading,Revenue from a very long series name,Profit,Cost';
  const rows = Array.from({ length: 60 }, (_, index) => (
    `Category ${index + 1} with a deliberately long label,${index + 10},${index + 3},${index + 5}`
  ));
  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from([header, ...rows].join('\n')),
    mimeType: 'text/csv',
    name: 'large.csv',
  });
  await page.getByRole('button', { name: 'Replace data' }).click();

  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '3');
  await expect(page.getByLabel('A very long category heading, row 60')).toHaveValue(
    'Category 60 with a deliberately long label',
  );

  const gridOverflow = await page.getByRole('table', { name: 'Graph data' }).evaluate((table) => {
    const container = table.parentElement;
    return Boolean(container
      && container.scrollWidth > container.clientWidth
      && container.scrollHeight > container.clientHeight);
  });
  expect(gridOverflow).toBe(true);

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(pageOverflow).toBe(false);
  expect((await page.locator('[data-chart-status="ready"] canvas').boundingBox())?.width).toBeLessThanOrEqual(288);
});

test('interprets a pasted 60-row date dataset and recommends a readable line chart', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  const rows = Array.from({ length: 60 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10);
    return `${date}\t${100 + index * 3}`;
  });
  const pastedTable = ['Date\tRevenue', ...rows].join('\n');

  await page.getByLabel('Month, row 1').evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, pastedTable);

  const detected = page.getByRole('region', { name: 'Detected data' });
  await expect(detected).toContainText('Detected: Date → Revenue');
  await expect(detected).toContainText('Recommended: Line chart');
  await expect(page.getByText('Line chart recommended for this data.')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 3, name: 'Revenue by Date' })).toBeVisible();
  await expect(page.getByText('Monthly Sales', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Graph title')).toHaveValue('Revenue by Date');
  await expect(page.getByLabel('X-axis title')).toHaveValue('Date');
  await expect(page.getByLabel('Y-axis title')).toHaveValue('Revenue');
  await expect(page.getByLabel('Show value labels')).not.toBeChecked();

  await page.getByRole('button', { name: 'Switch to Line' }).click();
  await expect(page.getByRole('button', { name: 'Line' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="line"]')).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'time');
  await expect(page.getByLabel('Date, row 60')).toHaveValue('2026-03-01');
});

test('toggles mixed-scale series and restores visibility after reload', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openPage(page, '/');
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();

  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from([
      'Month,Visitors,Orders,Revenue',
      'Jan,700,20,1500',
      'Feb,760,22,1650',
      'Mar,720,19,1420',
    ].join('\n')),
    mimeType: 'text/csv',
    name: 'mixed-scale.csv',
  });
  await page.getByRole('button', { name: 'Replace data' }).click();

  const chart = page.locator('[data-chart-status="ready"]');
  const warning = page.getByText('These series use very different scales. Hide a series for a clearer comparison.');
  await expect(page.getByLabel('Show Visitors series')).toHaveCount(0);
  await expect(chart).toHaveAttribute('data-series-count', '3');
  await expect(warning).toBeVisible();

  const canvas = chart.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  await canvas.click({ position: { x: canvasBox!.width / 2, y: 15 } });
  await expect(chart).toHaveAttribute('data-series-count', '2');
  await expect(warning).toHaveCount(0);

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Show Visitors series')).toBeChecked();
  await expect(page.getByLabel('Show Orders series')).not.toBeChecked();
  await expect(page.getByLabel('Show Revenue series')).toBeChecked();

  await page.getByLabel('Show Orders series').check();
  await expect(chart).toHaveAttribute('data-series-count', '3');
  await expect(warning).toBeVisible();

  await page.getByLabel('Show Orders series').uncheck();
  await expect(chart).toHaveAttribute('data-series-count', '2');
  await expect(warning).toHaveCount(0);

  await page.getByLabel('Show Revenue series').uncheck();
  await expect(chart).toHaveAttribute('data-series-count', '1');
  await expect(page.getByLabel('Show Visitors series')).toBeDisabled();

  await page.getByLabel('Visitors, row 1').fill('710');
  await expect(page.getByLabel('Show Orders series')).not.toBeChecked();
  await expect(chart).toContainText('Visitors: Jan 710');

  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page);

  await expect(page.getByLabel('Show Visitors series')).toHaveCount(0);
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Show Visitors series')).toBeChecked();
  await expect(page.getByLabel('Show Visitors series')).toBeDisabled();
  await expect(page.getByLabel('Show Orders series')).not.toBeChecked();
  await expect(page.getByLabel('Show Revenue series')).not.toBeChecked();
  await expect(chart).toHaveAttribute('data-series-count', '1');
  await expect(warning).toHaveCount(0);
});

test('detects, renders, and restores numeric X/Y data as a scatter plot', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  const pastedTable = [
    'Height\tWeight',
    '150\t48',
    '155\t52',
    '160\t57',
    '165\t61',
    '170\t67',
    '175\t73',
    '180\t81',
  ].join('\n');
  await page.getByLabel('Month, row 1').evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, pastedTable);

  const detected = page.getByRole('region', { name: 'Detected data' });
  await expect(detected).toContainText('Detected: Height → Weight');
  await expect(detected).toContainText('Recommended: Scatter plot');
  await expect(page.getByText('Scatter plot recommended for this data.')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 3, name: 'Weight by Height' })).toBeVisible();

  await page.getByRole('button', { name: 'Pie' }).click();
  await expect(page.locator('[data-chart-status="empty"]')).toContainText(
    'This data isn’t suitable for a pie chart.',
  );
  await expect(page.locator('[data-chart-status="empty"]')).toContainText(
    'Pie charts need one category column and one numeric value column.',
  );
  await expect(detected).toContainText('Recommended: Scatter plot');
  await expect(detected).not.toContainText('Pie chart uses Height');
  await expect(page.getByRole('button', { name: 'Switch to Scatter' })).toBeVisible();
  const incompatiblePreview = page.locator('[data-chart-status="empty"]');
  expect((await incompatiblePreview.boundingBox())?.height).toBeLessThan(220);

  await page.getByRole('button', { name: 'Histogram' }).click();
  await expect(page.locator('[data-chart-status="empty"]')).toContainText(
    'This data may not be suitable for a histogram.',
  );
  await expect(page.locator('[data-chart-status="empty"]')).toContainText(
    'Histograms work best with raw numeric observations.',
  );
  await expect(detected).not.toContainText('Histogram uses Height');

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Graph title')).toHaveValue('Weight by Height');
  await expect(page.getByLabel('X-axis title')).toHaveValue('Height');
  await expect(page.getByLabel('Y-axis title')).toHaveValue('Weight');

  await page.getByRole('button', { name: 'Switch to Scatter' }).click();
  await expect(page.getByRole('button', { name: 'Scatter' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="scatter"]')).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'value');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Weight by Height. Scatter plot with 7 points. X axis: Height. Y axis: Weight.',
  );
  await expect(detected).toContainText('Chart: Scatter');

  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page);

  await expect(page.getByRole('button', { name: 'Scatter' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="scatter"]')).toBeVisible();
  await expect(page.getByLabel('Height, row 5')).toHaveValue('170');
  await expect(page.getByLabel('Weight, row 5')).toHaveValue('67');
  await expect(page.getByRole('heading', { level: 3, name: 'Weight by Height' })).toBeVisible();
});

test('detects, renders, and restores category shares as a pie chart', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  const pastedTable = [
    'Category\tValue',
    'Product A\t40',
    'Product B\t30',
    'Product C\t20',
    'Product D\t10',
  ].join('\n');
  await page.getByLabel('Month, row 1').evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, pastedTable);

  const detected = page.getByRole('region', { name: 'Detected data' });
  await expect(detected).toContainText('Detected: Category → Value');
  await expect(detected).toContainText('Recommended: Pie chart');
  await expect(page.getByText('Pie chart recommended for this data.')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 3, name: 'Value by Category' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch to Pie' }).click();
  await expect(page.getByRole('button', { name: 'Pie' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="pie"]')).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-axis-type', 'none');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Product A: 40, 40%. Product B: 30, 30%. Product C: 20, 20%. Product D: 10, 10%',
  );

  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page);

  await expect(page.getByRole('button', { name: 'Pie' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="pie"]')).toBeVisible();
  await expect(page.getByLabel('Category, row 1')).toHaveValue('Product A');
  await expect(page.getByLabel('Value, row 4')).toHaveValue('10');
  await expect(page.getByRole('heading', { level: 3, name: 'Value by Category' })).toBeVisible();
});

test('bins raw observations and restores histogram settings', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  const pastedTable = [
    'Score',
    '72',
    '84',
    '67',
    '91',
    '76',
    '88',
    '94',
    '71',
    '82',
    '79',
    '65',
    '86',
    '90',
    '74',
    '81',
  ].join('\n');
  await page.getByLabel('Month, row 1').evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, pastedTable);

  const detected = page.getByRole('region', { name: 'Detected data' });
  await expect(detected).toContainText('Detected: Score');
  await expect(detected).toContainText('Recommended: Histogram chart');
  await expect(page.getByRole('heading', { level: 3, name: 'Distribution of Score' })).toBeVisible();
  await expect(page.getByText('Histogram chart recommended for this data.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Switch to Histogram' }).click();
  const chart = page.locator('[data-chart-status="ready"]');
  await expect(page.getByRole('button', { name: 'Histogram' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="histogram"]')).toBeVisible();
  await expect(chart).toHaveAttribute('data-axis-type', 'category');
  await expect(chart).toContainText(
    'Distribution of Score. Histogram of Score with 15 observations in 5 bins.',
  );

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Bin count')).toHaveValue('auto');
  await page.getByLabel('Bin count').selectOption('3');
  await expect(chart).toContainText('Histogram of Score with 15 observations in 3 bins.');

  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page);

  await expect(page.getByRole('button', { name: 'Histogram' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="histogram"]')).toBeVisible();
  await expect(page.getByLabel('Score, row 15')).toHaveValue('81');
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Bin count')).toHaveValue('3');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    'Histogram of Score with 15 observations in 3 bins.',
  );
});

test('renders a box plot from raw observations and restores outlier visibility', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  const pastedTable = [
    'Score',
    '1',
    '2',
    '3',
    '4',
    '5',
    '100',
  ].join('\n');
  await page.getByLabel('Month, row 1').evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, pastedTable);

  await expect(page.getByRole('heading', { level: 3, name: 'Distribution of Score' })).toBeVisible();
  await page.getByRole('button', { name: 'Box Plot' }).click();

  const chart = page.locator('[data-chart-status="ready"]');
  await expect(page.getByRole('button', { name: 'Box Plot' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="boxplot"]')).toBeVisible();
  await expect(chart).toHaveAttribute('data-series-count', '1');
  await expect(chart).toContainText(
    'Score: minimum 1, Q1 2, median 3.5, Q3 5, maximum 100, IQR 3, 1 outlier',
  );

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Show outliers')).toBeChecked();
  await page.getByLabel('Show outliers').uncheck();
  await page.getByText('Advanced controls').click();
  await page.getByLabel('Orientation').selectOption('horizontal');
  await expect(page.locator('[data-chart-orientation="horizontal"]')).toBeVisible();

  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page);

  await expect(page.getByRole('button', { name: 'Box Plot' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="boxplot"]')).toBeVisible();
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Show outliers')).not.toBeChecked();
  await expect(page.getByLabel('Orientation')).toHaveValue('horizontal');
});

test('renders and restores a multi-series radar chart', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  const pastedTable = [
    'Metric\tTeam A\tTeam B',
    'Speed\t80\t70',
    'Quality\t90\t85',
    'Cost\t65\t78',
    'Support\t88\t82',
    'Reliability\t92\t89',
  ].join('\n');
  await page.getByLabel('Month, row 1').evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, pastedTable);

  await expect(page.getByRole('heading', { level: 3, name: 'Team A and Team B by Metric' })).toBeVisible();
  await page.getByRole('button', { name: 'Radar' }).click();

  const chart = page.locator('[data-chart-status="ready"]');
  await expect(page.getByRole('button', { name: 'Radar' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="radar"]')).toBeVisible();
  await expect(chart).toHaveAttribute('data-axis-type', 'none');
  await expect(chart).toHaveAttribute('data-series-count', '2');
  await expect(chart).toContainText('Team A: Speed 80, Quality 90, Cost 65, Support 88, Reliability 92');

  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Show Team A series')).toBeChecked();
  await expect(page.getByLabel('Show Team B series')).toBeChecked();
  await expect(page.getByLabel('Filled areas')).toBeChecked();
  await page.getByLabel('Filled areas').uncheck();
  await page.getByLabel('Show Team B series').uncheck();
  await expect(chart).toHaveAttribute('data-series-count', '1');

  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page);

  await expect(page.getByRole('button', { name: 'Radar' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rendered-chart-type="radar"]')).toBeVisible();
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Filled areas')).not.toBeChecked();
  await expect(page.getByLabel('Show Team B series')).not.toBeChecked();
});
