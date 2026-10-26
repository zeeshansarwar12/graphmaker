import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { openPage } from './navigation';
import { allLinkedRoutes, indexableRoutes, productionOrigin } from './seo-routes';

// Independent tests retain fresh browser contexts and the original default budgets.
for (const route of allLinkedRoutes) {
  test(`capture hydrated SEO and internal links — ${route}`, async ({ page, request }, testInfo) => {
    expect((await request.get(route)).status(), route).toBe(200);
    await openPage(page, route);
    let metadata: { title: string; description: string; h1Text: string } | undefined;
    if ((indexableRoutes as readonly string[]).includes(route)) {
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      const h1 = page.locator('h1');
      const h1Text = (await h1.innerText()).trim();
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');

      expect(title, route).toBeTruthy();
      expect(description, route).toBeTruthy();
      expect(await h1.count(), route).toBe(1);
      expect(canonical, route).toBeTruthy();
      expect(canonical, route).toBe(new URL(route, productionOrigin).href);
      expect(await page.locator('meta[name="robots"]').getAttribute('content'), route).toBe('index,follow');
      if (route === '/') {
        await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute('content', 'r9NYNACi391MLcXqqUd0w48ayLHu3l1TZ4zuUJO6dEY');
        await expect(page.locator('meta[name="msvalidate.01"]')).toHaveAttribute('content', 'ADA32A2FC73ADC93B80B1231531C0854');
      } else {
        await expect(page.locator('meta[name="google-site-verification"],meta[name="msvalidate.01"]')).toHaveCount(0);
      }
      expect(title.length, route).toBeLessThanOrEqual(60);
      expect(description!.length, route).toBeGreaterThanOrEqual(70);
      expect(description!.length, route).toBeLessThanOrEqual(160);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${productionOrigin}/images/graphmaker-social.png`);
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', `${productionOrigin}/images/graphmaker-social.png`);
      expect(await page.locator('meta[property="og:title"]').getAttribute('content'), route).toBe(title);
      expect(await page.locator('meta[property="og:description"]').getAttribute('content'), route).toBe(description);
      expect(await page.locator('meta[property="og:url"]').getAttribute('content'), route).toBe(canonical);

      const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((headings) => (
        headings.map((heading) => Number(heading.tagName.slice(1)))
      ));
      expect(levels[0], `${route} should begin with H1`).toBe(1);
      for (let index = 1; index < levels.length; index += 1) {
        expect(levels[index] - levels[index - 1], `${route} skips a heading level`).toBeLessThanOrEqual(1);
      }
      metadata = { title, description: description!, h1Text };
    }
    const hrefs = await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    const internalPaths = new Set<string>();
    for (const href of hrefs) {
      const url = new URL(href, 'http://localhost:4321');
      if (url.origin !== 'http://localhost:4321') continue;
      if (url.pathname !== route || !url.hash) internalPaths.add(url.pathname);
      if (url.pathname === route && url.hash) {
        expect(await page.locator(url.hash).count(), `${route}${url.hash}`).toBe(1);
      }
    }
    const snapshot = JSON.stringify({ route, metadata, internalPaths: [...internalPaths] }, null, 2);
    // outputDir is cleared by Playwright at run start. Failed collectors never publish records.
    const records = join(testInfo.project.outputDir, 'records');
    await mkdir(records, { recursive: true });
    await writeFile(join(records, `${encodeURIComponent(route)}.json`), snapshot);
    await testInfo.attach('hydrated-seo-snapshot', { body: snapshot, contentType: 'application/json' });
  });
}
