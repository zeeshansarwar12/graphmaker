import { openPage } from './navigation';
import { expect, test } from '@playwright/test';

const coreToolRoutes = [
  '/bar-graph-maker/',
  '/line-graph-maker/',
  '/pie-chart-maker/',
  '/xy-graph-maker/',
  '/scatter-plot-maker/',
  '/histogram-maker/',
  '/box-plot-maker/',
  '/radar-chart-maker/',
] as const;

const specialistToolRoutes = ['/dot-plot-maker/', '/supply-and-demand-graph-maker/'] as const;
const toolRoutes = [...coreToolRoutes, ...specialistToolRoutes] as const;
const indexableRoutes = ['/', '/tools/', '/about/', ...toolRoutes] as const;
const allLinkedRoutes = [...indexableRoutes, '/privacy/', '/terms/'] as const;
const productionOrigin = 'https://graphmaker.site';

test('every indexable page has unique production metadata and one logical H1', async ({ page, request }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const h1Texts = new Set<string>();

  for (const route of indexableRoutes) {
    expect((await request.get(route)).status(), route).toBe(200);
    await openPage(page, route);

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

    expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
    expect(descriptions.has(description!), `duplicate description: ${description}`).toBe(false);
    expect(h1Texts.has(h1Text), `duplicate H1: ${h1Text}`).toBe(false);
    titles.add(title);
    descriptions.add(description!);
    h1Texts.add(h1Text);

    const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((headings) => (
      headings.map((heading) => Number(heading.tagName.slice(1)))
    ));
    expect(levels[0], `${route} should begin with H1`).toBe(1);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1], `${route} skips a heading level`).toBeLessThanOrEqual(1);
    }
  }
});

test('homepage and tools hub expose every graph tool', async ({ page }) => {
  await openPage(page, '/');
  for (const toolRoute of toolRoutes) {
    await expect(page.locator(`a[href="${toolRoute}"]`).first(), `/ -> ${toolRoute}`).toBeVisible();
  }

  await openPage(page, '/tools/');
  for (const toolRoute of toolRoutes) {
    await expect(page.locator(`a[href="${toolRoute}"]`).first(), `/tools/ -> ${toolRoute}`).toBeVisible();
  }
  await expect(page.locator('a[href="/tools/"]').first()).toBeVisible();
});

test('every graph-maker hero uses the shared green benefit checks', async ({ page }) => {
  for (const route of ['/', ...toolRoutes]) {
    await openPage(page, route);
    const benefits = page.locator('[data-product-benefits]');
    await expect(benefits, route).toBeVisible();
    await expect(benefits.locator('li'), route).toHaveCount(4);
    await expect(benefits.locator('li > span.bg-success'), route).toHaveCount(4);
    await expect(benefits).toContainText('Free to use');
    await expect(benefits).toContainText('No watermark');
    await expect(benefits).toContainText('No signup');
    await expect(benefits).toContainText('Data stays in your browser');
  }
});

test('tool pages have distinct related-tool links and valid breadcrumb schema', async ({ page }) => {
  for (const route of toolRoutes) {
    await openPage(page, route);
    const related = page.locator('section[aria-labelledby="related-heading"] a[href]');
    const hrefs = await related.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs.length, route).toBeGreaterThanOrEqual(3);
    expect(hrefs.length, route).toBeLessThanOrEqual(5);
    expect(new Set(hrefs).size, `${route} duplicate related links`).toBe(hrefs.length);
    expect(hrefs).not.toContain(route);

    const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '[]');
    const schema = schemas.find((item: Record<string, unknown>) => item['@type'] === 'BreadcrumbList');
    const app = schemas.find((item: Record<string, unknown>) => item['@type'] === 'WebApplication');
    expect(app.name, route).toBe(await page.locator('h1').innerText());
    expect(app.url, route).toBe(productionOrigin + route);
    expect(app.offers).toMatchObject({ price: 0, priceCurrency: 'USD' });
    expect(schema['@type'], route).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(new URL(schema.itemListElement[2].item).pathname).toBe(route);
  }
});

test('every editor has ten distinct icons and every footer links all tools', async ({ page }) => {
  for (const route of allLinkedRoutes) {
    await openPage(page, route);
    for (const toolRoute of toolRoutes) await expect(page.locator(`footer a[href="${toolRoute}"]`)).toHaveCount(1);
    if (route === '/' || toolRoutes.includes(route as typeof toolRoutes[number])) {
      const tabs = page.getByRole('group', { name: 'Choose a graph type' });
      await expect(tabs.locator('button')).toHaveCount(10);
      const icons = await tabs.locator('[data-chart-icon]').allTextContents();
      expect(new Set(icons).size, route).toBe(10);
      await expect(tabs.getByRole('button', { name: 'Supply & Demand', exact: true })).toBeVisible();
    }
  }
});

test('sitemap and robots expose only intended production URLs', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const route of indexableRoutes) {
    expect(sitemap).toContain(`<loc>${new URL(route, productionOrigin).href}</loc>`);
  }
  for (const excluded of ['/404/', '/privacy/', '/terms/', '/guides/', '/use-cases/']) {
    expect(sitemap).not.toMatch(new RegExp(`<loc>https?://[^<]+${excluded.replaceAll('/', '\\/')}</loc>`));
  }
  expect((sitemap.match(/<url>/g) ?? [])).toHaveLength(indexableRoutes.length);

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('User-agent: *');
  expect(robots).toContain('Allow: /');
  expect(robots).toContain(`Sitemap: ${productionOrigin}/sitemap.xml`);
  expect(robots).not.toContain('Disallow:');
});

test('all internal links resolve and no production page is orphaned', async ({ page, request }) => {
  const linksByRoute = new Map<string, Set<string>>();

  for (const route of allLinkedRoutes) {
    await openPage(page, route);
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
    linksByRoute.set(route, internalPaths);
  }

  const linkedPaths = new Set([...linksByRoute.values()].flatMap((paths) => [...paths]));
  for (const route of allLinkedRoutes) {
    expect((await request.get(route)).status(), route).toBe(200);
    if (route !== '/') expect(linkedPaths.has(route), `${route} is orphaned`).toBe(true);
  }
  for (const path of linkedPaths) {
    expect((await request.get(path)).status(), `broken internal link: ${path}`).toBeLessThan(400);
  }
});

test('query strings do not create alternate canonicals and utility routes stay noindex', async ({ page }) => {
  await openPage(page, '/radar-chart-maker/?source=test');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/radar-chart-maker\/$/);

  for (const route of ['/privacy/', '/terms/']) {
    await openPage(page, route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  }
});

test('custom 404 is noindex and offers crawlable recovery links', async ({ page }) => {
  const response = await openPage(page, '/missing-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.getByRole('link', { name: 'Browse graph tools' }).first()).toBeVisible();
});

test('editor controls are semantic and static information pages do not hydrate JavaScript', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();

  const unnamedControls = await page.locator('input,select,textarea').evaluateAll((controls) => controls
    .filter((control) => {
      const input = control as HTMLInputElement;
      return input.type !== 'hidden'
        && !input.labels?.length
        && !input.getAttribute('aria-label')
        && !input.getAttribute('aria-labelledby');
    })
    .map((control) => control.outerHTML));
  expect(unnamedControls).toEqual([]);
  expect(await page.locator('[role="button"]:not(button)').count()).toBe(0);
  expect(await page.locator('nav a:not([href])').count()).toBe(0);

  for (const route of ['/tools/', '/about/', '/privacy/', '/terms/']) {
    await openPage(page, route);
    expect(
      await page.locator('script[src]:not([src^="https://www.googletagmanager.com/"]):not([src^="https://pagead2.googlesyndication.com/"])').count(),
      route,
    ).toBe(0);
    const unsizedImages = await page.locator('img:not([width]), img:not([height])').count();
    expect(unsizedImages, route).toBe(0);
  }
});

test('Google Analytics uses the production GA4 measurement ID with privacy limits', async ({ page }) => {
  await openPage(page, '/');
  const analyticsScript = page.locator('script[src^="https://www.googletagmanager.com/gtag/js?id="]');
  await expect(analyticsScript).toHaveAttribute(
    'src',
    'https://www.googletagmanager.com/gtag/js?id=G-JM5S5JGFJJ',
  );
  const inlineScripts = await page.locator('head script:not([src])').evaluateAll((scripts) => (
    scripts.map((script) => script.textContent ?? '').join('\n')
  ));
  expect(inlineScripts).toContain("gtag('config', \"G-JM5S5JGFJJ\"");
  expect(inlineScripts).toContain('allow_ad_personalization_signals');
  expect(inlineScripts).toContain('allow_google_signals');
});
