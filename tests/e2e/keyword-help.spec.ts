import { expect, test } from '@playwright/test';
import { openPage } from './navigation';

for (const width of [1440, 390]) {
  test(`coordinate walkthrough works with the existing editor at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openPage(page, '/xy-graph-maker/');
    const walkthrough = page.locator('[aria-labelledby="example-walkthrough-heading"]');
    await expect(walkthrough).toContainText('2 units left of the origin and 4 units down');
    const backToEditor = walkthrough.getByRole('link', { name: 'Back to graph editor' });
    await expect(backToEditor).toHaveAttribute('href', '#editor');
    await walkthrough.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/keyword-help-${width}.png` });
    await backToEditor.click();
    await page.getByLabel('X, row 1', { exact: true }).evaluate(element => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', 'X\tY1\tY2\n-2\t-4\t3\n0\t0\t5\n3\t6\t7');
      element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
    });
    await expect(page.getByLabel('Y1, row 1', { exact: true })).toHaveValue('-4');
    await expect(page.getByLabel('Y2, row 3', { exact: true })).toHaveValue('7');
    await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count', '2');
    await expect(page.getByLabel('Connect points', { exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Customize', exact: true }).click();
    await page.getByRole('button', { name: 'Coordinate plane', exact: true }).click();
    await expect(page.getByLabel('X minimum', { exact: true })).toHaveValue('-10');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('equilibrium quick resource resolves to the existing on-page explanation', async ({ page }) => {
  await openPage(page, '/supply-and-demand-graph-maker/');
  const resource = page.getByRole('navigation', { name: 'Supply and demand quick resources' })
    .getByRole('link', { name: 'Equilibrium calculation', exact: true });
  await resource.click();
  await expect(page.locator('#equilibrium')).toBeVisible();
  await expect(page).toHaveURL(/\/supply-and-demand-graph-maker\/#equilibrium$/);
});
