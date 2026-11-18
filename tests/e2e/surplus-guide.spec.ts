import { expect, test } from './browser-test';
import { openPage } from './navigation';

const guide = '/guides/consumer-and-producer-surplus/';
const tool = '/supply-and-demand-graph-maker/';

test('surplus guide connects worked charts and practice to the graph maker', async ({ page, request }) => {
  await openPage(page, guide);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Consumer and Producer Surplus on a Supply and Demand Graph');
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(breadcrumb.getByRole('link', { name: 'Supply and Demand Graph Maker' })).toHaveAttribute('href', tool);
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '[]');
  expect(schema.map((item: { '@type': string }) => item['@type'])).toEqual(['Article', 'BreadcrumbList']);
  expect(schema[0]).toMatchObject({
    author: {
      '@type': 'Person', '@id': 'https://graphmaker.site/about/#creator',
      name: 'Zeeshan Sarwar', url: 'https://graphmaker.site/about/',
    },
    publisher: {
      '@type': 'Organization', '@id': 'https://graphmaker.site/#organization',
      name: 'GraphMaker', url: 'https://graphmaker.site/',
      logo: { '@type': 'ImageObject', url: 'https://graphmaker.site/images/graphmaker-logo.svg' },
    },
    datePublished: '2026-11-17', dateModified: '2026-11-17',
    image: 'https://graphmaker.site/images/guides/consumer-and-producer-surplus-social.png',
  });
  expect(schema[1].itemListElement.map((item: { item: string }) => item.item)).toEqual(
    ['/', tool, guide].map(route => 'https://graphmaker.site' + route),
  );
  const charts = page.locator('article figure img');
  await expect(charts).toHaveCount(5);
  for (const image of await charts.all()) {
    await expect(image).toHaveAttribute('width', '800');
    await expect(image).toHaveAttribute('height', '500');
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('alt', /\w/);
    const path = await image.getAttribute('src');
    expect((await request.get(path!)).ok()).toBe(true);
  }
  const links = page.getByRole('link', { name: 'Make this graph' });
  await expect(links).toHaveCount(5);
  for (const link of await links.all()) await expect(link).toHaveAttribute('href', tool + '#editor');
  const answers = page.locator('article details');
  await expect(answers).toHaveCount(4);
  await answers.first().locator('summary').click();
  await expect(answers.first()).toContainText('56 units trade');
  await openPage(page, tool);
  await expect(page.getByRole('link', { name: 'Consumer and Producer Surplus' })).toHaveAttribute('href', guide);
  await expect(page.locator('#editor')).toHaveCount(1);
  for (const anchor of ['equilibrium', 'supply-quick-help', 'supply-shift-guide']) {
    await expect(page.locator('#' + anchor)).toHaveCount(1);
  }
});
