import { deniedConsent, mayLoadAds, resolveConsent, type GoogleConsentValues, type TcfData } from './consent';

type Callback = Record<string, () => void>;
interface GoogleCmp {
  callbackQueue: Callback[];
  getGoogleConsentModeValues?: () => GoogleConsentValues;
  showRevocationMessage?: () => void;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    googlefc: GoogleCmp;
    __tcfapi?: (command: 'addEventListener', version: number, callback: (data: TcfData, success: boolean) => void) => void;
    adsbygoogle?: unknown[] & { pauseAdRequests?: number; requestNonPersonalizedAds?: number };
    [key: `ga-disable-${string}`]: boolean;
  }
}

const config = document.querySelector<HTMLScriptElement>('#google-privacy-config');
if (config) startPrivacy(JSON.parse(config.textContent ?? '{}') as { analyticsId: string; publisherId: string });

function startPrivacy({ analyticsId, publisherId }: { analyticsId: string; publisherId: string }) {
  const refusalKey = 'graphmaker-privacy-refusal-v1';
  let refused = false;
  let persistent = true;
  try { refused = localStorage.getItem(refusalKey) === 'denied'; } catch { persistent = false; }
  let tcf: TcfData | undefined;
  let values: GoogleConsentValues | undefined;
  let apiReady = false;
  let listening = false;
  let failed = false;
  let changingChoices = false;
  let analyticsLoaded = false;
  let adsLoaded = false;
  let analyticsAllowed = false;
  let adsAllowed = false;
  const cmp = window.googlefc = window.googlefc || { callbackQueue: [] };
  cmp.callbackQueue = cmp.callbackQueue || [];
  const dialog = document.querySelector<HTMLDialogElement>('#privacy-settings');
  const status = document.querySelector<HTMLElement>('[data-privacy-status]');
  const manage = document.querySelector<HTMLButtonElement>('[data-privacy-manage]');
  const withdraw = document.querySelector<HTMLButtonElement>('[data-privacy-withdraw]');

  function rememberRefusal(next: boolean) {
    refused = next;
    try {
      if (next) localStorage.setItem(refusalKey, 'denied');
      else localStorage.removeItem(refusalKey);
    } catch { persistent = false; }
  }

  function clearAnalyticsCookies() {
    const names = ['_ga', `_ga_${analyticsId.slice(2)}`];
    // Only our analytics cookies. Never clear CMP records, localStorage or IndexedDB.
    const parts = location.hostname.split('.');
    const domains = ['', ...parts.slice(0, -1).map((_, index) => parts.slice(index).join('.'))];
    for (const name of names) for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${location.protocol === 'https:' ? '; Secure' : ''}`;
    }
  }

  function script(id: string, src: string) {
    if (document.getElementById(id)) return;
    const tag = document.createElement('script');
    tag.id = id; tag.async = true; tag.src = src;
    if (id === 'google-adsense') tag.crossOrigin = 'anonymous';
    document.head.appendChild(tag);
  }

  function renderStatus() {
    if (!status) return;
    const message = refused ? 'Analytics and advertising are paused on this device.'
      : failed ? 'Google privacy settings are unavailable. Analytics and advertising remain paused.'
      : !tcf || !values ? 'Waiting for Google privacy settings. Analytics and advertising remain paused.'
      : `Analytics: ${analyticsAllowed ? 'allowed' : 'paused'}. Advertising: ${adsAllowed ? 'allowed' : 'paused'}.`;
    status.textContent = `${message} Your graph data and local drafts are unaffected.${persistent ? '' : ' This browser could not remember your restriction; use Google’s consent settings to withdraw it for future visits.'}`;
    if (manage) {
      const outside = tcf?.gdprApplies === false;
      manage.hidden = outside && !refused;
      manage.disabled = !apiReady || (!outside && typeof cmp.showRevocationMessage !== 'function');
      manage.textContent = refused && outside ? 'Resume analytics and advertising' : 'Manage Google consent';
    }
  }

  function apply() {
    const state = failed ? { ...deniedConsent } : resolveConsent(values, tcf, refused);
    const nextAnalytics = state.analytics_storage === 'granted';
    const nextAds = !failed && mayLoadAds(state, tcf);
    window.gtag('consent', 'update', state);
    window[`ga-disable-${analyticsId}`] = !nextAnalytics;
    const ads = window.adsbygoogle = window.adsbygoogle || [];
    ads.pauseAdRequests = nextAds ? 0 : 1;
    ads.requestNonPersonalizedAds = state.ad_personalization === 'granted' ? 0 : 1;
    if ((analyticsAllowed && !nextAnalytics) || refused) clearAnalyticsCookies();
    analyticsAllowed = nextAnalytics;
    adsAllowed = nextAds;
    if (nextAnalytics && !analyticsLoaded) {
      analyticsLoaded = true;
      window.gtag('js', new Date());
      window.gtag('config', analyticsId, { allow_ad_personalization_signals: false, allow_google_signals: false, anonymize_ip: true });
      script('google-analytics', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`);
    }
    if (nextAds && !adsLoaded) {
      adsLoaded = true;
      script('google-adsense', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${publisherId}`);
    }
    renderStatus();
  }

  function refresh() {
    cmp.callbackQueue.push({ CONSENT_MODE_DATA_READY: () => {
      try { values = cmp.getGoogleConsentModeValues?.(); } catch { values = undefined; }
      apply();
    } });
  }

  cmp.callbackQueue.push({ CONSENT_API_READY: () => {
    apiReady = true;
    if (!listening && window.__tcfapi) {
      listening = true;
      window.__tcfapi('addEventListener', 2, (data, success) => {
        tcf = success ? data : undefined;
        values = undefined;
        if (changingChoices && success && data.eventStatus === 'useractioncomplete') {
          rememberRefusal(false);
          changingChoices = false;
        }
        // Fail closed immediately while the message is open or data is invalid.
        apply();
        queueMicrotask(refresh);
      });
    }
    renderStatus();
  } });
  refresh();

  for (const opener of document.querySelectorAll<HTMLButtonElement>('[data-privacy-open]')) {
    opener.hidden = false;
    opener.addEventListener('click', () => { renderStatus(); dialog?.showModal(); });
  }
  document.querySelector('[data-privacy-close]')?.addEventListener('click', () => dialog?.close());
  withdraw?.addEventListener('click', () => {
    rememberRefusal(true);
    apply();
  });
  manage?.addEventListener('click', () => {
    if (!apiReady) return;
    // A regional inapplicability result can restore the existing non-EU behavior;
    // it is never manufactured from language, a missing callback or a timeout.
    if (tcf?.gdprApplies === false && refused) { rememberRefusal(false); apply(); return; }
    if (!cmp.showRevocationMessage) return;
    rememberRefusal(true);
    changingChoices = true;
    apply();
    dialog?.close();
    cmp.callbackQueue.push({ CONSENT_API_READY: () => cmp.showRevocationMessage?.() });
  });
  window.addEventListener('storage', event => {
    if (event.key !== refusalKey) return;
    refused = event.newValue === 'denied';
    apply();
  });
  apply();

  // Account-generated messaging tag, same publisher. No recovery message or
  // error-protection wall is created. The existing European message stays in control.
  if (!document.querySelector('iframe[name="googlefcPresent"]')) {
    const signal = document.createElement('iframe');
    signal.name = 'googlefcPresent'; signal.title = 'Google consent messaging'; signal.hidden = true;
    document.body.appendChild(signal);
  }
  script('google-cmp', `https://fundingchoicesmessages.google.com/i/${publisherId}?ers=1`);
  document.getElementById('google-cmp')?.addEventListener('error', () => { failed = true; apply(); });
}
