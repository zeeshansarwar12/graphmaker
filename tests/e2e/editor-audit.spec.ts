import { expect, test } from '@playwright/test';
import { openPage, reloadPage } from './navigation';

test('cell edits preserve default and custom titles through autosave', async ({ page }) => {
  await openPage(page, '/');
  await page.getByLabel('Sales, row 1', { exact: true }).fill('80');
  await expect(page.locator('[data-print-title]')).toHaveText('Monthly Sales');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Jan 80');
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await page.getByRole('textbox', { name: 'Graph title', exact: true }).fill('Quarterly report');
  await page.getByLabel('Sales, row 1', { exact: true }).fill('90');
  await expect(page.locator('[data-print-title]')).toHaveText('Quarterly report');
  await expect(page.getByText('Autosaved on this device. No cloud backup.', { exact: true })).toBeVisible();
  await reloadPage(page);
  await expect(page.locator('[data-print-title]')).toHaveText('Quarterly report');
  await expect(page.getByLabel('Sales, row 1', { exact: true })).toHaveValue('90');
});

test('mobile chart dropdown exposes every chart without overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await openPage(page, '/');
  const selector = page.getByRole('combobox', { name: 'Chart type' });
  await expect(selector).toBeVisible();
  await expect(selector.locator('option')).toHaveCount(12);
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
  await selector.selectOption('pie');
  await expect(page.locator('[data-rendered-chart-type="pie"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add row', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await expect(page.getByLabel('X-axis title', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Y-axis title', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Show grid', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Advanced controls', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download project backup', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.graphmaker\.json$/);
});

test('desktop chart radios support arrow keys and one tab stop', async ({ page }, testInfo) => {
  await openPage(page, '/');
  const group = page.getByRole('radiogroup', { name: 'Choose a graph type' });
  const bar = group.getByRole('radio', { name: 'Bar', exact: true });
  await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  await bar.focus();
  await bar.press('ArrowRight');
  const line = group.getByRole('radio', { name: 'Line', exact: true });
  await expect(line).toBeFocused();
  await expect(line).toHaveAttribute('aria-checked', 'true');
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  await line.press('End');
  await expect(group.getByRole('radio', { name: 'Tree', exact: true })).toBeFocused();
});
