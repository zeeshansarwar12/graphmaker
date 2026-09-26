const googleAnalyticsIdPattern = /^G-[A-Z0-9]+$/;

export function normalizeGoogleAnalyticsId(value: string | undefined): string | null {
  const candidate = value?.trim().toUpperCase();
  return candidate
    && candidate !== 'G-XXXXXXXXXX'
    && googleAnalyticsIdPattern.test(candidate)
    ? candidate
    : null;
}
