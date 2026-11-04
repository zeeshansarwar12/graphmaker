import { expect, test } from '@playwright/test';
import { allGranted, consented, mockCmp, setConsent } from './consent-fixture';
import { openPage, reloadPage } from './navigation';

for (const width of [1440, 390]) for (const route of ['/', '/privacy/']) {
  test(`consent is denied before choice; purpose grants and withdrawal persist ${width} ${route}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockCmp(page);
    await openPage(page, route);
    await expect(page.locator('#google-cmp')).toHaveCount(1);
    await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(0);
    const first = await page.evaluate(() => Array.from(window.dataLayer[0] as ArrayLike<unknown>));
    expect(first).toEqual(['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
    await expect(page.getByRole('button', { name: 'Privacy and cookie settings', exact: true })).toBeVisible();
    await setConsent(page, consented, { ...allGranted, adStoragePurposeConsentStatus: 2 });
    await expect(page.locator('#google-analytics')).toHaveAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=G-JM5S5JGFJJ');
    await expect(page.locator('#google-adsense')).toHaveCount(0);
    await setConsent(page, consented, { ...allGranted, adPersonalizationPurposeConsentStatus: 2 });
    await expect(page.locator('#google-adsense')).toHaveAttribute('src', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8860671021606762');
    expect(await page.evaluate(() => window.adsbygoogle?.requestNonPersonalizedAds)).toBe(1);
    const configuration = await page.evaluate(() => Array.from(window.dataLayer.find(entry => (entry as ArrayLike<unknown>)[0] === 'config') as ArrayLike<unknown>));
    expect(configuration[2]).toEqual({ allow_ad_personalization_signals: false, allow_google_signals: false, anonymize_ip: true });
    await setConsent(page, { ...consented, eventStatus: 'cmpuishown' }, allGranted);
    expect(await page.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(true);
    expect(await page.evaluate(() => window.adsbygoogle?.pauseAdRequests)).toBe(1);
    await setConsent(page, consented, Object.fromEntries(Object.keys(allGranted).map(key => [key, 2])));
    expect(await page.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(true);
    expect(await page.evaluate(() => window.adsbygoogle?.pauseAdRequests)).toBe(1);
    await setConsent(page, consented, allGranted);
    await page.getByRole('button', { name: 'Privacy and cookie settings', exact: true }).click();
    await page.getByRole('button', { name: 'Pause analytics and advertising', exact: true }).click();
    await expect(page.locator('[data-privacy-status]')).toContainText('paused on this device');
    expect(await page.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(true);
    expect(await page.evaluate(() => window.adsbygoogle?.pauseAdRequests)).toBe(1);
    expect((await page.context().cookies()).some(cookie => cookie.name === '_ga')).toBe(false);
    await reloadPage(page);
    await setConsent(page, consented, allGranted);
    await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(0);
    await page.getByRole('button', { name: 'Privacy and cookie settings', exact: true }).click();
    await page.getByRole('button', { name: 'Manage Google consent', exact: true }).click();
    await expect(page.locator('#privacy-settings')).not.toBeVisible();
    await setConsent(page, consented, allGranted);
    await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(2);
    await setConsent(page, consented, allGranted);
    expect(await page.evaluate(() => window.dataLayer.filter(entry => (entry as ArrayLike<unknown>)[0] === 'config').length)).toBe(1);
  });
}

test('unknown, invalid, failed, and inconsistent CMP results never grant permission', async ({ page }) => {
  await mockCmp(page);
  await openPage(page, '/');
  for (const value of [0, 3, 4, 99]) {
    await setConsent(page, consented, Object.fromEntries(Object.keys(allGranted).map(key => [key, value])));
    await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(0);
  }
  await setConsent(page, { ...consented, purpose: {}, vendor: {} }, allGranted);
  await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(0);
  await setConsent(page, consented, allGranted, false);
  await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(0);
  await setConsent(page, { cmpStatus: 'loaded', gdprApplies: false }, Object.fromEntries(Object.keys(allGranted).map(key => [key, 3])));
  await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(2);
  await page.getByRole('button', { name: 'Privacy and cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Pause analytics and advertising', exact: true }).click();
  expect(await page.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(true);
  await page.getByRole('button', { name: 'Resume analytics and advertising', exact: true }).click();
  expect(await page.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(false);
});

test('unavailable CMP does not block graph editing', async ({ page }) => {
  await page.route('https://fundingchoicesmessages.google.com/**', route => route.abort());
  await openPage(page, '/');
  await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(0);
  await page.getByRole('button', { name: 'Privacy and cookie settings', exact: true }).click();
  await expect(page.locator('[data-privacy-status]')).toContainText('unavailable');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('denial and withdrawal preserve editing, saving, reloading, and all exports', async ({ page }) => {
  await mockCmp(page);
  await openPage(page, '/');
  await page.getByLabel('Sales, row 1', { exact: true }).fill('99');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.', { exact: true })).toBeVisible();
  await setConsent(page, consented, allGranted);
  await page.getByRole('button', { name: 'Privacy and cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Pause analytics and advertising', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await reloadPage(page);
  await expect(page.getByLabel('Sales, row 1', { exact: true })).toHaveValue('99');
  await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible();
  for (const format of ['PNG', 'SVG', 'CSV']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: format, exact: true }).click();
    expect((await download).suggestedFilename().toLowerCase()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
  }
  await expect(page.locator('#google-analytics, #google-adsense')).toHaveCount(0);
});

test('another tab receives withdrawal without losing its editor state', async ({ page, context }) => {
  await mockCmp(page, { data: consented, values: allGranted });
  await openPage(page, '/');
  const other = await context.newPage();
  await mockCmp(other, { data: consented, values: allGranted });
  await openPage(other, '/');
  await other.getByLabel('Sales, row 1', { exact: true }).fill('88');
  await expect(other.locator('#google-analytics')).toHaveCount(1);
  await page.getByRole('button', { name: 'Privacy and cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Pause analytics and advertising', exact: true }).click();
  await expect.poll(() => other.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(true);
  expect(await other.evaluate(() => window.adsbygoogle?.pauseAdRequests)).toBe(1);
  await expect(other.getByLabel('Sales, row 1', { exact: true })).toHaveValue('88');
  await other.evaluate(() => window.addEventListener('storage', event => {
    if (event.key === 'graphmaker-privacy-refusal-v1' && event.newValue === null) {
      document.documentElement.dataset.consentRestrictionCleared = 'true';
    }
  }));
  await page.getByRole('button', { name: 'Manage Google consent', exact: true }).click();
  await setConsent(page, consented, Object.fromEntries(Object.keys(allGranted).map(key => [key, 2])));
  await expect(other.locator('html')).toHaveAttribute('data-consent-restriction-cleared', 'true');
  expect(await page.evaluate(() => localStorage.getItem('graphmaker-privacy-refusal-v1'))).toBeNull();
  // This tab still has an earlier CMP grant cached. A restriction being removed
  // in another tab is not evidence of a fresh grant here.
  expect(await other.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(true);
  expect(await other.evaluate(() => window.adsbygoogle?.pauseAdRequests)).toBe(1);
});

test('blocked preference storage keeps page-only refusal and the editor available', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await mockCmp(page, { data: consented, values: allGranted });
  await openPage(page, '/');
  await page.getByRole('button', { name: 'Privacy and cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Pause analytics and advertising', exact: true }).click();
  await expect(page.locator('[data-privacy-status]')).toContainText('could not remember');
  expect(await page.evaluate(() => window['ga-disable-G-JM5S5JGFJJ'])).toBe(true);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByLabel('Sales, row 1', { exact: true }).fill('77');
  await expect(page.getByLabel('Sales, row 1', { exact: true })).toHaveValue('77');
});
