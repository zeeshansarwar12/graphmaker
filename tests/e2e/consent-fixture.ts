import type { Page } from '@playwright/test';
import type { GoogleConsentValues, TcfData } from '../../src/lib/analytics/consent';

export const consented: TcfData = { gdprApplies: true, cmpStatus: 'loaded', eventStatus: 'useractioncomplete', purpose: { consents: { '1': true } }, vendor: { consents: { '755': true } } };
export const allGranted: GoogleConsentValues = { analyticsStoragePurposeConsentStatus: 1, adStoragePurposeConsentStatus: 1, adUserDataPurposeConsentStatus: 1, adPersonalizationPurposeConsentStatus: 1 };

// Simulated API contracts only. This fixture cannot verify Google message delivery
// or legal/geographic applicability. Never used by the application bundle.
export async function mockCmp(page: Page, initial?: { data: TcfData; values: GoogleConsentValues }) {
  await page.route('https://fundingchoicesmessages.google.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `
    (() => {
      let state = ${JSON.stringify(initial ?? { data: { cmpStatus: 'loaded', gdprApplies: true, eventStatus: 'cmpuishown' }, values: {} })};
      let listener;
      const cmp = window.googlefc;
      const callbacks = cmp.callbackQueue.slice();
      const invoke = entry => Object.values(entry).forEach(callback => callback());
      cmp.getGoogleConsentModeValues = () => state.values;
      cmp.showRevocationMessage = () => { window.__consentFixture.set({ ...state.data, eventStatus: 'cmpuishown' }, {}); };
      cmp.callbackQueue.push = entry => { invoke(entry); return 0; };
      window.__tcfapi = (command, version, callback) => { listener = callback; callback(state.data, true); };
      window.__consentFixture = { set: (data, values, success = true) => {
        state = { data, values }; listener?.(data, success);
      } };
      callbacks.forEach(invoke);
    })();
  ` }));
  // Do not send test impressions or analytics to Google's live services.
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: "document.cookie='_ga=synthetic-test; Path=/; SameSite=Lax';" }));
  await page.route('https://pagead2.googlesyndication.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
}

export async function setConsent(page: Page, data: TcfData, values: GoogleConsentValues, success = true) {
  await page.evaluate(({ data, values, success }) => {
    (window as unknown as { __consentFixture: { set: (data: TcfData, values: GoogleConsentValues, success: boolean) => void } }).__consentFixture.set(data, values, success);
  }, { data, values, success });
}
