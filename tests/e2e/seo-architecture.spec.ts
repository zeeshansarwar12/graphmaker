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
    await page.goto(route);

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
    expect(await page.locator('meta[name="google-site-verification"]').getAttribute('content'), route)
      .toBe('r9NYNACi391MLcXqqUd0w48ayLHu3l1TZ4zuUJO6dEY');
    expect(await page.locator('meta[name="msvalidate.01"]').getAttribute('content'), route)
      .toBe('ADA32A2FC73ADC93B80B1231531C0854');
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

test('homepage keeps the core eight while the tools hub exposes every graph tool', async ({ page }) => {
  await page.goto('/');
  for (const toolRoute of coreToolRoutes) {
    await expect(page.locator(`a[href="${toolRoute}"]`).first(), `/ -> ${toolRoute}`).toBeVisible();
  }
  await expect(page.locator('a[href="/dot-plot-maker/"]')).toHaveCount(0);
  await expect(page.locator('a[href="/supply-and-demand-graph-maker/"]')).toHaveCount(0);

  await page.goto('/tools/');
  for (const toolRoute of toolRoutes) {
    await expect(page.locator(`a[href="${toolRoute}"]`).first(), `/tools/ -> ${toolRoute}`).toBeVisible();
  }
  await expect(page.locator('a[href="/tools/"]').first()).toBeVisible();
});

test('every graph-maker hero uses the shared green benefit checks', async ({ page }) => {
  for (const route of ['/', ...toolRoutes]) {
    await page.goto(route);
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
    await page.goto(route);
    const related = page.locator('section[aria-labelledby="related-heading"] a[href]');
    const hrefs = await related.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs.length, route).toBeGreaterThanOrEqual(3);
    expect(hrefs.length, route).toBeLessThanOrEqual(5);
    expect(new Set(hrefs).size, `${route} duplicate related links`).toBe(hrefs.length);
    expect(hrefs).not.toContain(route);

    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
    expect(schema['@type'], route).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(new URL(schema.itemListElement[2].item).pathname).toBe(route);
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
    await page.goto(route);
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
  await page.goto('/radar-chart-maker/?source=test');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/radar-chart-maker\/$/);

  for (const route of ['/privacy/', '/terms/']) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  }
});

test('custom 404 is noindex and offers crawlable recovery links', async ({ page }) => {
  const response = await page.goto('/missing-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.getByRole('link', { name: 'Browse graph tools' })).toBeVisible();
});

test('editor controls are semantic and static information pages do not hydrate JavaScript', async ({ page }) => {
  await page.goto('/');
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
    await page.goto(route);
    expect(
      await page.locator('script[src]:not([src^="https://www.googletagmanager.com/"])').count(),
      route,
    ).toBe(0);
    const unsizedImages = await page.locator('img:not([width]), img:not([height])').count();
    expect(unsizedImages, route).toBe(0);
  }
});

test('Google Analytics uses the production GA4 measurement ID with privacy limits', async ({ page }) => {
  await page.goto('/');
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
