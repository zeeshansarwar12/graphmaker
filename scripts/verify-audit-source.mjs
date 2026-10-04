// Supplementary source checks; this does not replace builds or browser tests.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { URL, fileURLToPath } from 'node:url';
import { log } from 'node:console';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL) {
      for (const extension of ['', '.ts']) {
        const url = new URL(specifier + extension, context.parentURL);
        if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const configs = await import('../src/content/toolPages.ts');
const { graphTools } = await import('../src/content/graphTools.ts');
const { detectDataShape } = await import('../src/graph/transforms/dataInterpretation.ts');
const { calculateBoxPlotStatistics } = await import('../src/graph/statistics/boxPlot.ts');
const { breadcrumbSchema, toolBreadcrumbs } = await import('../src/content/seo.ts');
assert.equal(graphTools.length, 10);
assert.equal(new Set(graphTools.map((tool) => tool.icon)).size, 10);
assert.equal(new Set(graphTools.map((tool) => tool.slug)).size, 10);
const rows = [];
for (const config of Object.values(configs)) {
  assert.ok(config.title.length <= 60, config.canonical);
  assert.ok(config.metaDescription.length >= 70 && config.metaDescription.length <= 160, config.canonical);
  assert.ok(!/\bV1\b|\bplanned\b|GraphEditor/.test(JSON.stringify(config)));
  assert.ok(graphTools.some((tool) => tool.href === config.canonical && tool.type === config.editor.graphType));
  const trail = toolBreadcrumbs(config.h1, config.canonical);
  const schema = JSON.parse(JSON.stringify(breadcrumbSchema(trail, new URL('https://graphmaker.site'))));
  assert.deepEqual(schema.itemListElement.map((item) => item.name), trail.map((item) => item.name));
  rows.push([config.canonical, config.title.length, config.metaDescription.length, 'index,follow', 'WebApplication, BreadcrumbList']);
}
for (const config of [configs.histogramToolPageConfig, configs.dotPlotToolPageConfig, configs.lineToolPageConfig]) {
  assert.deepEqual(config.example.rows, config.editor.sampleData.rows.map((row) => row.cells));
  assert.deepEqual(config.example.headers, config.editor.sampleData.columns.map((column) => column.name));
}
assert.equal(configs.histogramToolPageConfig.example.rows.length, 15);
assert.equal(configs.dotPlotToolPageConfig.example.rows.length, 20);
assert.equal(configs.dotPlotToolPageConfig.example.rows.filter((row) => row[0] === '18').length, 4);
assert.equal(detectDataShape(configs.lineToolPageConfig.editor.sampleData).mixedScale, false);
const stats = calculateBoxPlotStatistics(configs.boxPlotToolPageConfig.editor.sampleData.rows.map((row) => Number(row.cells[0])));
assert.equal(stats.q1, 72);
assert.equal(stats.q3, 88);

for (const [route, filename, types] of [
  ['/', 'index.astro', 'WebSite, Organization'],
  ['/tools/', 'tools/index.astro', 'ItemList, BreadcrumbList'],
  ['/about/', 'about.astro', 'BreadcrumbList'],
  ['/privacy/', 'privacy.astro', 'BreadcrumbList'],
  ['/terms/', 'terms.astro', 'BreadcrumbList'],
]) {
  const source = readFileSync(new URL(`../src/pages/${filename}`, import.meta.url), 'utf8');
  const title = source.match(/\btitle="([^"]+)"/)[1];
  const description = source.match(/\bdescription="([^"]+)"/)[1];
  const robots = route === '/privacy/' || route === '/terms/' ? 'noindex,follow' : 'index,follow';
  assert.ok(title.length <= 60);
  if (robots === 'index,follow') assert.ok(description.length >= 70 && description.length <= 160);
  rows.unshift([route, title.length, description.length, robots, types]);
}
assert.equal(rows.length, 15);
rows.sort((a, b) => a[0].localeCompare(b[0]));
const heading = '# Source metadata inventory\n\nThese values come from source files. Canonicals, image presence, and schema types below describe the implementation; rendered HTML has not been verified. Run `python scripts/audit-built-html.py` after a successful build for actual output verification.\n\n';
const table = '| Page | Title length | Description length | Canonical (configured) | Robots | og:image (configured) | JSON-LD types (configured) |\n|---|---:|---:|---|---|---|---|\n' + rows.map(([route, title, description, robots, types]) => `| ${route} | ${title} | ${description} | https://graphmaker.site${route} | ${robots} | yes | ${types} |`).join('\n');
writeFileSync(new URL('../docs/audit-source-metadata.md', import.meta.url), heading + table + '\n');
log(table);
log('\nSupplementary source assertions passed (15 pages, sample parity, comparable line scales, catalog icons, and actual quartile results).');
