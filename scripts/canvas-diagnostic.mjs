import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const output = 'canvas-diagnostic-evidence';
const previews = [
  { name: 'pr21', sha: '1293c0e2e4c36e86b46dd22898eff665faf9182b', url: 'https://e64dfccb.graphmaker-5k0.pages.dev' },
  { name: 'pr25', sha: '74ccbbbad40d4652259ee6fff44fec285c1c7ca3', url: 'https://1505c2a8.graphmaker-5k0.pages.dev' },
];

// Scratch browser instrumentation only; deployed code and tests are never modified.
function instrument() {
  const host = globalThis;
  const { document, performance, MutationObserver, ResizeObserver: NativeRO } = host;
  const events = [];
  const record = (type, data = {}) => {
    if (events.length < 2000) events.push({ t: performance.now(), type, ...data });
  };
  const box = element => {
    if (!element) return null;
    const style = host.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName, class: element.className, inlineStyle: element.getAttribute('style'),
      width: rect.width, height: rect.height, clientWidth: element.clientWidth, clientHeight: element.clientHeight,
      css: Object.fromEntries(['display', 'visibility', 'contentVisibility', 'position', 'width', 'height', 'minHeight', 'maxHeight', 'overflow', 'boxSizing'].map(key => [key, style[key]])),
    };
  };
  const sheets = () => [...document.styleSheets].map(sheet => {
    let rules, error;
    const heightRules = [];
    try {
      rules = sheet.cssRules.length;
      const inspect = list => {
        for (const rule of list) {
          if (rule.selectorText && /h-72|h-80/.test(rule.selectorText)) heightRules.push(rule.cssText);
          if (rule.cssRules) inspect(rule.cssRules);
        }
      };
      inspect(sheet.cssRules);
    } catch (caught) { error = String(caught); }
    return { href: sheet.href, disabled: sheet.disabled, media: sheet.media.mediaText, rules, heightRules, error };
  });
  const snapshot = () => {
    const container = document.querySelector('[data-chart-canvas]');
    const canvas = container?.querySelector('canvas');
    const ancestors = [];
    for (let parent = container?.parentElement; parent && ancestors.length < 6; parent = parent.parentElement) ancestors.push(box(parent));
    return {
      readyState: document.readyState, visibility: document.visibilityState,
      viewport: { width: host.innerWidth, height: host.innerHeight, dpr: host.devicePixelRatio },
      hydrating: !!document.querySelector('astro-island[ssr]'),
      inert: !!document.querySelector('section[aria-labelledby="editor-heading"][inert]'),
      status: document.querySelector('[data-chart-status]')?.getAttribute('data-chart-status'),
      instance: container?.getAttribute('_echarts_instance_'), container: box(container), canvas: box(canvas),
      bitmap: canvas ? { width: canvas.width, height: canvas.height } : null,
      ancestors, spacingToken: document.documentElement ? host.getComputedStyle(document.documentElement).getPropertyValue('--spacing') : null,
    };
  };
  let last = '';
  const sample = () => {
    const data = snapshot();
    const key = JSON.stringify(data);
    if (key !== last) { last = key; record('layout', data); }
  };
  let observerId = 0;
  host.ResizeObserver = class extends NativeRO {
    constructor(callback) {
      const id = ++observerId;
      super((entries, observer) => {
        record('resize-observer-callback', { id, entries: entries.map(entry => ({ chart: entry.target.hasAttribute('data-chart-canvas'), tag: entry.target.tagName, width: entry.contentRect.width, height: entry.contentRect.height })) });
        callback.call(observer, entries, observer);
      });
      this.diagnosticId = id;
      record('resize-observer-created', { id });
    }
    observe(target, options) {
      record('resize-observer-observe', { id: this.diagnosticId, target: box(target) });
      return super.observe(target, options);
    }
    disconnect() {
      record('resize-observer-disconnect', { id: this.diagnosticId });
      return super.disconnect();
    }
  };
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      const target = mutation.target;
      if (mutation.type === 'attributes' && target.matches?.('[data-chart-canvas],canvas,[data-chart-status],astro-island')) {
        record('chart-dom-attribute', { tag: target.tagName, attribute: mutation.attributeName, value: target.getAttribute(mutation.attributeName) });
      }
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-chart-status', '_echarts_instance_', 'width', 'height', 'style', 'class', 'ssr'] });
  for (const type of ['load', 'error']) document.addEventListener(type, event => {
    if (event.target?.tagName === 'LINK' && event.target.rel === 'stylesheet') record(`stylesheet-${type}`, { href: event.target.href });
  }, true);
  document.addEventListener('DOMContentLoaded', () => record('dom-content-loaded', { sheets: sheets() }));
  document.addEventListener('visibilitychange', () => record('visibility', { state: document.visibilityState }));
  host.addEventListener('resize', () => record('window-resize'));
  const timer = host.setInterval(sample, 25);
  host.__issue27 = {
    finish: () => {
      host.clearInterval(timer);
      sample();
      return { timeOrigin: performance.timeOrigin, events, final: snapshot(), sheets: sheets(), paint: performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTime: entry.startTime })) };
    },
  };
}

await mkdir(output, { recursive: true });
const report = {
  checkout: process.env.GITHUB_SHA ?? 'local-uncommitted-diagnostic',
  started: new Date().toISOString(), platform: os.platform(), release: os.release(),
  cpu: { count: os.cpus().length, model: os.cpus()[0]?.model }, totalMemory: os.totalmem(), node: process.version,
  policy: 'One attempt per URL/viewport, fresh browser/context, DPR 1, default CPU/network, original 30s navigation and 5s assertions; no reloads/retries.',
  limitations: 'Instrumentation can perturb timing. DOM instance/canvas transitions approximate initialization; no direct ECharts init hook or measured first-useful-graph paint. Mobile width uses the original desktop Chromium context, not a real mobile device. Historical URL-to-SHA mapping is supplied by exact-head CI/Cloudflare evidence, not an in-page commit marker.',
  sessions: [],
};
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  for (const preview of previews) {
    const stem = `${preview.name}-${viewport.width}`;
    const session = { ...preview, viewport, started: new Date().toISOString(), network: [], console: [], errors: [], failedRequests: [] };
    const browser = await chromium.launch({ headless: true });
    session.browserVersion = browser.version();
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    const pendingBodies = [];
    page.on('console', message => session.console.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => session.errors.push(String(error)));
    page.on('requestfailed', request => session.failedRequests.push({ url: request.url(), failure: request.failure() }));
    page.on('response', response => {
      if (new URL(response.url()).origin !== new URL(preview.url).origin) return;
      const headers = response.headers();
      const row = { url: response.url(), status: response.status(), resourceType: response.request().resourceType(), headers: Object.fromEntries(['content-type', 'cache-control', 'etag', 'cf-cache-status', 'cf-ray'].map(key => [key, headers[key]])) };
      session.network.push(row);
      if (row.resourceType === 'stylesheet') pendingBodies.push((async () => {
        try {
          const body = await response.body();
          row.sha256 = createHash('sha256').update(body).digest('hex');
          row.savedBody = `${stem}-${row.sha256}.css`;
          await writeFile(join(output, row.savedBody), body);
        } catch (error) { row.bodyError = String(error); }
      })());
    });
    try {
      await page.addInitScript(instrument);
      const response = await page.goto(preview.url, { timeout: 30000 });
      session.documentStatus = response?.status();
      session.finalUrl = page.url();
      // Preserve the original homepage shell/hydration/visibility assertion order.
      await expect(page.getByRole('heading', { level: 1, name: 'Free Online Graph Maker' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('heading', { level: 2, name: 'Graph editor' })).toBeVisible({ timeout: 5000 });
      await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 5000 });
      await expect(page.locator('section[aria-labelledby="editor-heading"][inert]')).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByRole('region', { name: 'Graph preview' })).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible({ timeout: 5000 });
      session.result = 'PASS';
    } catch (error) {
      session.result = 'FAIL';
      session.assertionError = String(error);
      process.exitCode = 1;
    } finally {
      session.diagnostic = await page.evaluate(() => globalThis.__issue27?.finish()).catch(error => ({ captureError: String(error) }));
      await page.screenshot({ path: join(output, `${stem}.png`), fullPage: true }).catch(error => { session.screenshotError = String(error); });
      await Promise.allSettled(pendingBodies);
      await context.tracing.stop({ path: join(output, `${stem}-trace.zip`) });
      await context.close();
      await browser.close();
      report.sessions.push(session);
      await writeFile(join(output, `${stem}.json`), JSON.stringify(session, null, 2));
      await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ preview: preview.name, sha: preview.sha, viewport, result: session.result, final: session.diagnostic?.final, assertionError: session.assertionError }));
    }
  }
}
report.finished = new Date().toISOString();
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
