import { expect, test } from '@playwright/test';
import { openPage } from './navigation';

for (const width of [1280, 390]) {
  test(`specialist selector preserves data and separates orientation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPage(page, '/grouped-bar-chart-maker/');
    await expect(page.getByRole('group', { name: 'Bar orientation', exact: true }).getByRole('radio')).toHaveCount(2);
    await expect(page.getByRole('radio', { name: 'Vertical', exact: true })).toBeChecked();
    const selector = page.getByRole('combobox', { name: 'Change chart type' });
    await expect(selector).toHaveValue('bar');
    await expect(selector.locator('option')).toHaveCount(12);
    await page.getByLabel('Class A, row 1').fill('91');
    await page.getByRole('radio', { name: 'Horizontal', exact: true }).check();
    await expect(page.locator('[data-chart-status="ready"]')).toContainText('horizontal bar graph');
    await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
    await selector.selectOption('line');
    await expect(page.locator('[data-rendered-chart-type="line"] [data-chart-status="ready"]')).toBeVisible();
    await expect(page.getByLabel('Class A, row 1')).toHaveValue('91');
    await expect(page.getByRole('group', { name: 'Bar orientation', exact: true })).toHaveCount(0);
    await selector.selectOption('bar');
    await expect(page.getByLabel('Class A, row 1')).toHaveValue('91');
    await expect(page.getByRole('radio', { name: 'Horizontal', exact: true })).toBeChecked();
    await page.getByRole('radio', { name: 'Horizontal', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: 'Vertical', exact: true })).toBeChecked();
    await expect(page.locator('[data-chart-status="ready"]')).toContainText('vertical bar graph');
    await selector.focus();
    await expect(selector).toBeFocused();
    await selector.press('ArrowDown');
    await selector.press('Enter');
    await expect(selector).toHaveValue('line');
    await expect(page.getByLabel('Class A, row 1')).toHaveValue('91');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}
