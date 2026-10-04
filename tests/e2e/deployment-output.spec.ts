import { expect, test } from '@playwright/test';
import { allGraphTools } from '../../src/content/graphTools';

test('built indexable pages return 200 and permit indexing', async ({ request }) => {
  for (const route of ['/', '/tools/', '/about/', ...allGraphTools.map((tool) => tool.href)]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(await response.text(), route).toMatch(/<meta\s+name="robots"\s+content="index,follow"/);
  }
});

test('legal pages and missing routes stay out of the index', async ({ request }) => {
  for (const route of ['/privacy/', '/terms/']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(await response.text(), route).toMatch(/<meta\s+name="robots"\s+content="noindex,follow"/);
  }
  const missing = await request.get('/deployment-check-missing-page/');
  expect(missing.status()).toBe(404);
  const html = await missing.text();
  expect(html).toContain('Page not found');
  expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex,follow"/);
});
