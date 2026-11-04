import { describe, expect, it } from 'vitest';
import { deniedConsent, mayLoadAds, resolveConsent, type GoogleConsentValues, type TcfData } from '../../src/lib/analytics/consent';

const granted: GoogleConsentValues = { analyticsStoragePurposeConsentStatus: 1, adStoragePurposeConsentStatus: 1, adUserDataPurposeConsentStatus: 1, adPersonalizationPurposeConsentStatus: 1 };
const ready: TcfData = { gdprApplies: true, cmpStatus: 'loaded', eventStatus: 'useractioncomplete', purpose: { consents: { '1': true } }, vendor: { consents: { '755': true } } };

describe('purpose-specific consent policy', () => {
  it.each([undefined, {}, { cmpStatus: 'error' }, { ...ready, gdprApplies: undefined }, { ...ready, eventStatus: 'cmpuishown' }])('fails closed for unresolved CMP state %j', data => {
    expect(resolveConsent(granted, data)).toEqual(deniedConsent);
  });
  it.each([0, 2, 4, 99])('does not treat enum %s as consent', value => {
    expect(resolveConsent({ analyticsStoragePurposeConsentStatus: value }, ready)).toEqual(deniedConsent);
  });
  it('maps purposes independently and requires Google vendor consent for ads', () => {
    const analyticsOnly = resolveConsent({ ...granted, adStoragePurposeConsentStatus: 2 }, ready);
    expect(analyticsOnly.analytics_storage).toBe('granted');
    expect(mayLoadAds(analyticsOnly, ready)).toBe(false);
    const nonPersonalized = resolveConsent({ ...granted, analyticsStoragePurposeConsentStatus: 2, adPersonalizationPurposeConsentStatus: 2 }, ready);
    expect(nonPersonalized.analytics_storage).toBe('denied');
    expect(nonPersonalized.ad_personalization).toBe('denied');
    expect(mayLoadAds(nonPersonalized, ready)).toBe(true);
    expect(mayLoadAds(nonPersonalized, { ...ready, vendor: {} })).toBe(false);
  });
  it('accepts inapplicability only with an explicit matching regional result', () => {
    const regional = Object.fromEntries(Object.keys(granted).map(key => [key, 3]));
    expect(resolveConsent(regional, ready)).toEqual(deniedConsent);
    // Google's live non-applicable callback omits eventStatus outside its region.
    const outside = { cmpStatus: 'loaded', gdprApplies: false };
    const result = resolveConsent(regional, outside);
    expect(Object.values(result)).toEqual(['granted', 'granted', 'granted', 'granted']);
    expect(mayLoadAds(result, outside)).toBe(true);
  });
  it('rejects inconsistent storage permission and retains explicit local refusal', () => {
    expect(resolveConsent(granted, { ...ready, purpose: {} }).analytics_storage).toBe('denied');
    expect(resolveConsent(granted, ready, true)).toEqual(deniedConsent);
    expect(resolveConsent(undefined, ready)).toEqual(deniedConsent);
  });
});
