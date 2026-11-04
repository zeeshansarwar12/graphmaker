export type ConsentValue = 'granted' | 'denied';
export type ConsentState = Record<'analytics_storage' | 'ad_storage' | 'ad_user_data' | 'ad_personalization', ConsentValue>;

export interface GoogleConsentValues {
  analyticsStoragePurposeConsentStatus?: number;
  adStoragePurposeConsentStatus?: number;
  adUserDataPurposeConsentStatus?: number;
  adPersonalizationPurposeConsentStatus?: number;
}

export interface TcfData {
  gdprApplies?: boolean;
  cmpStatus?: string;
  eventStatus?: string;
  purpose?: { consents?: Record<string, boolean> };
  vendor?: { consents?: Record<string, boolean> };
}

export const deniedConsent: ConsentState = {
  analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
};

// Google's documented enums: unknown=0, granted=1, denied=2,
// not applicable=3, not configured=4. Availability is not permission.
export function resolveConsent(values: GoogleConsentValues | undefined, tcf: TcfData | undefined, refused = false): ConsentState {
  // The live CMP omits eventStatus when gdprApplies=false. Only that explicit
  // result may omit it; a consent-required visitor still needs a settled event.
  if (refused || !values || tcf?.cmpStatus !== 'loaded'
    || typeof tcf.gdprApplies !== 'boolean'
    || !(tcf.gdprApplies === false && tcf.eventStatus === undefined
      || ['tcloaded', 'useractioncomplete'].includes(tcf.eventStatus ?? ''))) return { ...deniedConsent };
  const choice = (value: number | undefined): ConsentValue => (
    value === 1 || (value === 3 && tcf.gdprApplies === false) ? 'granted' : 'denied'
  );
  const state: ConsentState = {
    analytics_storage: choice(values.analyticsStoragePurposeConsentStatus),
    ad_storage: choice(values.adStoragePurposeConsentStatus),
    ad_user_data: choice(values.adUserDataPurposeConsentStatus),
    ad_personalization: choice(values.adPersonalizationPurposeConsentStatus),
  };
  if (tcf.gdprApplies && tcf.purpose?.consents?.['1'] !== true) {
    state.analytics_storage = 'denied';
    state.ad_storage = 'denied';
  }
  return state;
}

export function mayLoadAds(state: ConsentState, tcf: TcfData | undefined): boolean {
  return state.ad_storage === 'granted' && state.ad_user_data === 'granted'
    && (tcf?.gdprApplies === false || tcf?.vendor?.consents?.['755'] === true);
}
