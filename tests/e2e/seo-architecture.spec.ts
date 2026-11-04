import { openPage } from './navigation';
import { expect, test } from '@playwright/test';

import { allLinkedRoutes, indexableRoutes, productionOrigin, toolRoutes } from './seo-routes';
import { mockCmp } from './consent-fixture';

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

for (const route of ['/', ...toolRoutes]) {
  test(`every graph-maker hero uses the shared green benefit checks — ${route}`, async ({ page }) => {
    await openPage(page, route);
    const benefits = page.locator('[data-product-benefits]');
    await expect(benefits, route).toBeVisible();
    await expect(benefits.locator('li'), route).toHaveCount(4);
    await expect(benefits.locator('li > span.bg-success'), route).toHaveCount(4);
    await expect(benefits).toContainText('Free to use');
    await expect(benefits).toContainText('No watermark');
    await expect(benefits).toContainText('No signup');
    await expect(benefits).toContainText('Data stays in your browser');
  });
}

for (const route of toolRoutes) {
  test(`tool pages have distinct related-tool links and valid breadcrumb schema — ${route}`, async ({ page }) => {
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
    if (['/stacked-bar-graph-maker/', '/horizontal-bar-graph-maker/', '/grouped-bar-chart-maker/'].includes(route)) {
      expect(schema.itemListElement[1]).toMatchObject({ name: 'Bar Graph Maker', item: productionOrigin + '/bar-graph-maker/' });
      await expect(page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).getByRole('link', { name: 'Bar Graph Maker', exact: true })).toHaveAttribute('href', '/bar-graph-maker/');
      const webpage = schemas.find((item: Record<string, unknown>) => item['@type'] === 'WebPage');
      expect(webpage.isPartOf).toEqual({ '@id': productionOrigin + '/bar-graph-maker/#webpage' });
    }
    expect(new URL(schema.itemListElement[2].item).pathname).toBe(route);
  });
}

for (const route of allLinkedRoutes) {
  test(`homepage shows chart icons, specialist pages use a compact selector, and footers link all tools — ${route}`, async ({ page }) => {
    await openPage(page, route);
    for (const toolRoute of toolRoutes) await expect(page.locator(`footer a[href="${toolRoute}"]`)).toHaveCount(1);
    if (route === '/' || toolRoutes.includes(route as typeof toolRoutes[number])) {
      if (route === '/') {
        const tabs = page.getByRole('radiogroup', { name: 'Choose a graph type' });
        await expect(tabs.locator('button')).toHaveCount(12);
        const icons = await tabs.locator('[data-chart-icon]').allTextContents();
        expect(new Set(icons).size, route).toBe(12);
        await expect(tabs.getByRole('radio', { name: 'Supply & Demand', exact: true })).toBeVisible();
      } else {
        await expect(page.getByRole('radiogroup', { name: 'Choose a graph type' })).toHaveCount(0);
        const selector = page.getByRole('combobox', { name: 'Change chart type' });
        await expect(selector).toBeVisible();
        await expect(selector.locator('option')).toHaveCount(12);
      }
    }
  });
}

test('sitemap and robots expose only intended production URLs', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const route of indexableRoutes) {
    expect(sitemap).toContain(`<loc>${new URL(route, productionOrigin).href}</loc>`);
  }
  for (const excluded of ['/404/', '/privacy/', '/terms/', '/guides/', '/use-cases/']) {
    expect(sitemap).not.toMatch(new RegExp(`<loc>https?://[^<]+${excluded.replaceAll('/', '\\/')}</loc>`));
  }
  expect((sitemap.match(/<url>/g) ?? [])).toHaveLength(indexableRoutes.length);
  const dates = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  expect(dates).toHaveLength(indexableRoutes.length);
  for (const date of dates) {
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(date).toISOString().slice(0, 10)).toBe(date);
    expect(Date.parse(date)).toBeLessThanOrEqual(Date.now());
  }

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('User-agent: *');
  expect(robots).toContain('Allow: /');
  expect(robots).toContain(`Sitemap: ${productionOrigin}/sitemap.xml`);
  expect(robots).not.toContain('Disallow:');
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
      await page.locator('script[src]').evaluateAll(scripts => scripts.filter(script => new URL((script as HTMLScriptElement).src).origin === window.location.origin).length),
      route,
    ).toBe(1); // Shared consent controls; static pages still have no editor island.
    await expect(page.locator('astro-island')).toHaveCount(0);
    const unsizedImages = await page.locator('img:not([width]), img:not([height])').count();
    expect(unsizedImages, route).toBe(0);
  }
});

test('Google Analytics uses the production GA4 measurement ID with privacy limits', async ({ page }) => {
  await mockCmp(page);
  await openPage(page, '/');
  const analyticsScript = page.locator('script[src^="https://www.googletagmanager.com/gtag/js?id="]');
  await expect(analyticsScript).toHaveCount(0);
  expect(JSON.parse(await page.locator('#google-privacy-config').textContent() ?? '{}').analyticsId).toBe('G-JM5S5JGFJJ');
  const inlineScripts = await page.locator('head script:not([src])').evaluateAll((scripts) => (
    scripts.map((script) => script.textContent ?? '').join('\n')
  ));
  expect(inlineScripts).toContain("gtag('consent', 'default'");
  expect(inlineScripts).toContain("analytics_storage: 'denied'");
});

test('advertising disclosures and ads.txt use the configured publisher', async ({ page, request }) => {
  await mockCmp(page);
  await openPage(page, '/privacy/');
  await expect(page.getByRole('heading', { name: 'Google advertising services' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My Ad Center', exact: true })).toHaveAttribute('href', 'https://myadcenter.google.com/');
  await expect(page.getByRole('link', { name: 'YourAdChoices', exact: true })).toHaveAttribute('href', 'https://www.aboutads.info/choices/');
  const script = page.locator('head script[src*="adsbygoogle.js"]');
  await expect(script).toHaveCount(0);
  expect(JSON.parse(await page.locator('#google-privacy-config').textContent() ?? '{}').publisherId).toBe('pub-8860671021606762');
  const ads = await request.get('/ads.txt');
  expect(ads.status()).toBe(200);
  expect(ads.headers()['content-type']).toContain('text/plain');
  expect((await ads.text()).trim()).toBe('google.com, pub-8860671021606762, DIRECT, f08c47fec0942fa0');
});

test('graph and chart wording matches homepage and tool schema', async ({ page }) => {
  await openPage(page, '/');
  await expect(page).toHaveTitle('Free Online Graph & Chart Maker | GraphMaker');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /graphs and charts online/);
  await expect(page.locator('main')).toContainText('Create bar charts, line graphs, pie charts');
  const homeSchemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '[]');
  expect(homeSchemas.find((item: Record<string, unknown>) => item['@type'] === 'WebSite').name).toBe('GraphMaker');
  expect(homeSchemas.find((item: Record<string, unknown>) => item['@type'] === 'Organization').name).toBe('GraphMaker');
  const app = homeSchemas.find((item: Record<string, unknown>) => item['@type'] === 'WebApplication');
  expect(app.alternateName).toBe('Free Online Chart Maker');
  expect(app.description).toBe(await page.locator('main p').first().innerText());
  for (const [route, alias] of [
    ['/bar-graph-maker/', 'Bar Chart Maker'],
    ['/line-graph-maker/', 'Line Chart Maker'],
    ['/grouped-bar-chart-maker/', 'Grouped Bar Chart Maker'],
  ]) {
    await openPage(page, route);
    const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '[]');
    expect(schemas.find((item: Record<string, unknown>) => item['@type'] === 'WebApplication').alternateName).toContain(alias);
    expect((await page.locator('main').innerText()).toLowerCase()).toContain(alias.toLowerCase());
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://graphmaker.site${route}`);
  }
});

test('homepage schema connects the page, tool, website, publisher and image', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  expect(match).not.toBeNull();
  const schemas = JSON.parse(match![1]);
  const byType = Object.fromEntries(schemas.map((item: Record<string, unknown>) => [item['@type'], item]));
  const ids = schemas.map((item: Record<string, unknown>) => item['@id']);
  expect(ids.every((id: unknown) => typeof id === 'string' && id.startsWith('https://graphmaker.site/#'))).toBe(true);
  expect(new Set(ids).size).toBe(5);
  const { WebPage: webpage, WebSite: website, Organization: publisher, WebApplication: app, ImageObject: image } = byType;
  expect(webpage.mainEntity['@id']).toBe(app['@id']);
  expect(app.mainEntityOfPage['@id']).toBe(webpage['@id']);
  expect(webpage.isPartOf['@id']).toBe(website['@id']);
  for (const item of [webpage, website, app]) expect(item.publisher['@id']).toBe(publisher['@id']);
  expect(app.creator['@id']).toBe(publisher.founder['@id']);
  expect(webpage.primaryImageOfPage['@id']).toBe(image['@id']);
  expect(image).toMatchObject({ width: 1200, height: 630 });
  expect((await request.get(new URL(image.contentUrl).pathname)).ok()).toBe(true);
  expect(webpage.isAccessibleForFree).toBe(true);
  expect(app).toMatchObject({ isAccessibleForFree: true, operatingSystem: 'Any', inLanguage: 'en' });
  expect(app.browserRequirements).toContain('JavaScript');
  expect(app.featureList).toHaveLength(5);
  expect(app.offers.price).toBe(0);
  expect(webpage.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(app.aggregateRating).toBeUndefined();
  expect(app.review).toBeUndefined();
});


test('bar directory and footer group workflow pages under their parent', async ({ page }) => {
  await openPage(page, '/tools/');
  const routes=['/stacked-bar-graph-maker/','/horizontal-bar-graph-maker/','/grouped-bar-chart-maker/'];
  const children=page.getByRole('navigation',{name:'Bar graph makers',exact:true});
  await expect(children).toHaveCount(1);
  const footer=page.locator('footer ul[aria-label="Bar graph makers"]');
  for(const route of routes){
    await expect(children.locator(`a[href="${route}"]`)).toBeVisible();
    await expect(footer.locator(`a[href="${route}"]`)).toBeVisible();
  }
  await expect(footer.locator('..').locator(':scope > a')).toHaveAttribute('href','/bar-graph-maker/');
  await openPage(page, '/bar-graph-maker/');
  for(const route of routes)await expect(page.getByRole('navigation',{name:'Bar graph types',exact:true}).locator(`a[href="${route}"]`)).toBeVisible();
  const schemas=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent()??'[]');
  const parent=schemas.find((item:Record<string,unknown>)=>item['@type']==='WebPage');
  expect(parent.hasPart.map((item:{'@id':string})=>item['@id']).sort()).toEqual(routes.map(route=>productionOrigin+route+'#webpage').sort());
});
