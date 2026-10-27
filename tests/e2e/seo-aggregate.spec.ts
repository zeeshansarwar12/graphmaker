import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';
import { allLinkedRoutes, indexableRoutes } from './seo-routes';

interface Snapshot {
  route: string;
  metadata?: { title: string; description: string; h1Text: string };
  internalPaths: string[];
}

async function readSnapshots(testInfo: TestInfo) {
  const project = testInfo.config.projects.find(project => project.name === 'seo-snapshots');
  if (!project) throw new Error('The hydrated SEO snapshot project is required.');
  const directory = join(project.outputDir, 'records');
  const files = await readdir(directory);
  const snapshots: Snapshot[] = await Promise.all(files.map(async file => JSON.parse(await readFile(join(directory, file), 'utf8'))));
  expect(snapshots.map(snapshot => snapshot.route).sort()).toEqual([...allLinkedRoutes].sort());
  return snapshots;
}

// Project dependency ensures every route was freshly hydrated in this invocation.
test('all 18 hydrated indexable pages have unique titles, descriptions and H1s', async () => {
  const testInfo = test.info();
  const snapshots = (await readSnapshots(testInfo)).filter(snapshot => snapshot.metadata);
  expect(snapshots.map(snapshot => snapshot.route).sort()).toEqual([...indexableRoutes].sort());
  expect(snapshots).toHaveLength(18);
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const h1Texts = new Set<string>();
  for (const { metadata } of snapshots) {
    const { title, description, h1Text } = metadata!;
    expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
    expect(descriptions.has(description), `duplicate description: ${description}`).toBe(false);
    expect(h1Texts.has(h1Text), `duplicate H1: ${h1Text}`).toBe(false);
    titles.add(title);
    descriptions.add(description);
    h1Texts.add(h1Text);
  }
});

test('all internal links resolve and no production page is orphaned', async ({ request }, testInfo) => {
  const snapshots = await readSnapshots(testInfo);
  const linkedPaths = new Set(snapshots.flatMap(snapshot => snapshot.internalPaths));
  // Route HTTP 200 and same-page anchor assertions ran in each hydrated collector.
  for (const route of allLinkedRoutes) {
    if (route !== '/') expect(linkedPaths.has(route), `${route} is orphaned`).toBe(true);
  }
  for (const path of linkedPaths) {
    expect((await request.get(path)).status(), `broken internal link: ${path}`).toBeLessThan(400);
  }
});
