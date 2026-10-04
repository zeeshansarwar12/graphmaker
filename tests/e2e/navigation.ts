import { expect, type Page } from '@playwright/test';

async function waitForEditor(page: Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="editor-heading"][inert]')).toHaveCount(0);
}

export async function openPage(page: Page, url: string) {
  const response = await page.goto(url);
  await waitForEditor(page);
  return response;
}

export async function reloadPage(page: Page) {
  const response = await page.reload();
  await waitForEditor(page);
  return response;
}
