import { test as base } from './browser-test';

export { expect } from '@playwright/test';

export const test = base.extend({
  context: async ({ context, baseURL }, use, testInfo) => {
    const origin = new URL(baseURL!).origin;
    const requests: Record<string, unknown>[] = [];
    const loads: Record<string, unknown>[] = [];
    await context.exposeBinding('__captureLoadTiming', ({ frame, page }, timing) => {
      if (page.mainFrame() === frame) loads.push(timing);
    });
    await context.addInitScript(() => {
      if (window !== window.top) return;
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!navigation) return;
        void (window as unknown as { __captureLoadTiming: (value: unknown) => Promise<void> }).__captureLoadTiming({
          url: location.href,
          start: performance.timeOrigin,
          loadMs: navigation.loadEventStart,
        });
      });
    });
    context.on('request', request => {
      const url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === origin) return;
      const row: Record<string, unknown> = { url: request.url(), resourceType: request.resourceType() };
      requests.push(row);
      const record = () => Object.assign(row, request.timing(), { failure: request.failure()?.errorText });
      record();
      request.existingResponse()?.finished().then(record);
    });
    for (const event of ['requestfinished', 'requestfailed'] as const) {
      context.on(event, request => {
        const url = new URL(request.url());
        if (!['http:', 'https:'].includes(url.protocol) || url.origin === origin) return;
        const row = requests.findLast(item => item.url === request.url() && item.responseEnd === -1);
        if (row) Object.assign(row, request.timing(), { failure: request.failure()?.errorText });
      });
    }
    await use(context);
    await testInfo.attach('network-timings', {
      contentType: 'application/json',
      body: JSON.stringify({ title: testInfo.title, file: testInfo.file, repeat: testInfo.repeatEachIndex, requests, loads }),
    });
  },
});
