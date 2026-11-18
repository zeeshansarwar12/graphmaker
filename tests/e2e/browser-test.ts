import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Page, TestInfo } from '@playwright/test';

const googleHosts = new Set([
  'fundingchoicesmessages.google.com',
  'googletagmanager.com',
  'www.googletagmanager.com',
  'pagead2.googlesyndication.com',
]);

export const test = base.extend({
  context: async ({ context, baseURL }, runTest) => {
    if (!baseURL) throw new Error('Browser tests require a configured baseURL.');
    const appOrigin = new URL(baseURL).origin;
    const unexpected = new Set<string>();
    const isExternal = (url: URL) =>
      (url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== appOrigin;

    // Page routes run first, so consent tests can still fulfill or abort the CMP.
    await context.route(isExternal, async route => {
      const url = new URL(route.request().url());
      if (googleHosts.has(url.hostname)) {
        await route.fulfill({ contentType: 'application/javascript', body: '' });
        return;
      }
      unexpected.add(`${route.request().method()} ${url.origin}${url.pathname}`);
      await route.abort('blockedbyclient');
    });

    // Playwright routes the first URL of a redirect chain. Flag external redirects too.
    context.on('request', request => {
      if (!request.redirectedFrom()) return;
      const url = new URL(request.url());
      if (isExternal(url)) unexpected.add(`${request.method()} ${url.origin}${url.pathname}`);
    });

    await runTest(context);

    if (unexpected.size > 0) {
      throw new Error(`Unstubbed external browser requests:\n${[...unexpected].join('\n')}`);
    }
  },
});
