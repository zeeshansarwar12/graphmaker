import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as XLSX from 'xlsx';

interface GraphFixture {
  button: string;
  expectedTitle: string;
  fileBase: string;
  renderedType: string;
  summary: string;
  table: string;
}

const graphFixtures: GraphFixture[] = [
  {
    button: 'Bar',
    expectedTitle: 'Revenue by Quarter',
    fileBase: 'revenue-by-quarter',
    renderedType: 'bar',
    summary: 'bar graph with 4 categories',
    table: 'Quarter\tRevenue\nQ1\t12\nQ2\t18\nQ3\t15\nQ4\t22',
  },
  {
    button: 'Line',
    expectedTitle: 'Visitors by Date',
    fileBase: 'visitors-by-date',
    renderedType: 'line',
    summary: 'Line graph with 4 points',
    table: 'Date\tVisitors\n2026-01-01\t12\n2026-02-01\t18\n2026-03-01\t15\n2026-04-01\t22',
  },
  {
    button: 'Pie',
    expectedTitle: 'Share by Channel',
    fileBase: 'share-by-channel',
    renderedType: 'pie',
    summary: 'Pie chart with 4 slices',
    table: 'Channel\tShare\nDirect\t40\nSearch\t30\nSocial\t20\nEmail\t10',
  },
  {
    button: 'XY',
    expectedTitle: 'Output by Input',
    fileBase: 'output-by-input',
    renderedType: 'xy',
    summary: 'XY graph with 4 points connected in data order',
    table: 'Input\tOutput\n1\t3\n2\t7\n3\t6\n4\t11',
  },
  {
    button: 'Scatter',
    expectedTitle: 'Weight by Height',
    fileBase: 'weight-by-height',
    renderedType: 'scatter',
    summary: 'Scatter plot with 4 points',
    table: 'Height\tWeight\n150\t48\n160\t57\n170\t67\n180\t81',
  },
  {
    button: 'Histogram',
    expectedTitle: 'Distribution of Score',
    fileBase: 'distribution-of-score',
    renderedType: 'histogram',
    summary: 'Histogram of Score with 8 observations',
    table: 'Score\n61\n68\n72\n75\n81\n84\n89\n94',
  },
  {
    button: 'Box Plot',
    expectedTitle: 'Distribution of Score',
    fileBase: 'distribution-of-score',
    renderedType: 'boxplot',
    summary: 'Box plot with 1 group',
    table: 'Score\n1\n2\n3\n4\n5\n100',
  },
  {
    button: 'Radar',
    expectedTitle: 'Team A and Team B by Metric',
    fileBase: 'team-a-and-team-b-by-metric',
    renderedType: 'radar',
    summary: 'Radar chart with 4 metrics and 2 series',
    table: 'Metric\tTeam A\tTeam B\nSpeed\t80\t70\nQuality\t90\t85\nCost\t65\t78\nSupport\t88\t82',
  },
];

async function pasteReplacement(page: Page, table: string) {
  await page.getByLabel('Month, row 1').evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  }, table);
}

for (const fixture of graphFixtures) {
  test(`${fixture.button} completes input, render, mobile, save, restore, and export`, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
    await pasteReplacement(page, fixture.table);
    await page.getByRole('button', { exact: true, name: fixture.button }).click();

    const chart = page.locator('[data-chart-status="ready"]');
    await expect(page.locator(`[data-rendered-chart-type="${fixture.renderedType}"]`)).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: fixture.expectedTitle })).toBeVisible();
    await expect(chart).toContainText(fixture.summary);
    await expect(page.getByText('Monthly Sales', { exact: true })).toHaveCount(0);

    await page.setViewportSize({ height: 780, width: 390 });
    await expect(chart.locator('canvas')).toBeVisible();
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )).toBe(false);

    await page.getByRole('button', { name: 'Save locally' }).click();
    await expect(page.getByText('Saved locally on this device. No cloud backup.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { exact: true, name: fixture.button })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`[data-rendered-chart-type="${fixture.renderedType}"]`)).toBeVisible();

    for (const extension of ['png', 'svg', 'csv'] as const) {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { exact: true, name: extension.toUpperCase() }).click();
      expect((await downloadPromise).suggestedFilename()).toBe(`${fixture.fileBase}.${extension}`);
    }
  });
}

test('manual entry replaces sample labels with labels derived from real data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.getByLabel('Rename Month header').fill('Region');
  await page.getByLabel('Rename Sales header').fill('Revenue');
  await page.getByLabel('Region, row 1').fill('North');
  await page.getByLabel('Revenue, row 1').fill('125');

  await expect(page.getByRole('heading', { level: 3, name: 'Revenue by Region' })).toBeVisible();
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByLabel('Graph title')).toHaveValue('Revenue by Region');
  await expect(page.getByLabel('X-axis title')).toHaveValue('Region');
  await expect(page.getByLabel('Y-axis title')).toHaveValue('Revenue');
  await expect(page.getByText('Monthly Sales', { exact: true })).toHaveCount(0);
});

test('XLSX upload reaches the same normalized editor pipeline', async ({ page }) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Quarter', 'Revenue'],
    ['Q1', 120],
    ['Q2', 145],
  ]), 'Data');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  await page.goto('/');
  await page.getByLabel('Choose XLSX file').setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    name: 'revenue.xlsx',
  });
  await expect(page.getByRole('region', { name: 'Preview import' })).toContainText(
    'revenue.xlsx · 2 rows · 2 columns · Header detected',
  );
  await page.getByRole('button', { name: 'Replace data' }).click();

  await expect(page.getByRole('heading', { level: 3, name: 'Revenue by Quarter' })).toBeVisible();
  await expect(page.getByLabel('Revenue, row 2')).toHaveValue('145');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Revenue: Q1 120, Q2 145');
});

test('mostly numeric imported data surfaces one actionable warning without rendering stale data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from('Month,Revenue\nJan,10\nFeb,invalid\nMar,30'),
    mimeType: 'text/csv',
    name: 'invalid.csv',
  });
  await page.getByRole('button', { name: 'Replace data' }).click();

  await expect(page.locator('[data-chart-status="invalid"]')).toContainText(
    'Revenue in row 2 must be a number.',
  );
  await expect(page.getByRole('alert').filter({ hasText: 'Revenue in row 2 must be a number.' })).toHaveCount(1);
});
