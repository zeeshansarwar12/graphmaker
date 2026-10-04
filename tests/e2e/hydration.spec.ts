import { expect, test } from '@playwright/test';

test('protects early input until editor handlers attach', async ({ page }) => {
  let resume!: () => void;
  const paused = new Promise<void>((resolve) => { resume = resolve; });
  await page.route('**/_astro/GraphWorkspace.*.js', async (route) => {
    await paused;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.locator('astro-island')).toHaveAttribute('ssr', '');
    const cell = page.locator('#data-editor tbody input').first();
    await expect(cell).toBeVisible();
    const focused = await cell.evaluate((element) => {
      (element as HTMLInputElement).focus();
      return document.activeElement === element;
    });
    expect(focused).toBe(false);
  } finally {
    resume();
  }
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="editor-heading"][inert]')).toHaveCount(0);
  await page.getByLabel('Month, row 1').fill('Verified');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Verified');
});
