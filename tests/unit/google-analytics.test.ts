import { describe, expect, it } from 'vitest';

import { normalizeGoogleAnalyticsId } from '../../src/lib/analytics/googleAnalytics';

describe('Google Analytics configuration', () => {
  it('normalizes a valid GA4 measurement ID', () => {
    expect(normalizeGoogleAnalyticsId('  g-abc123xyz  ')).toBe('G-ABC123XYZ');
  });

  it('rejects missing, placeholder, and legacy IDs', () => {
    expect(normalizeGoogleAnalyticsId(undefined)).toBeNull();
    expect(normalizeGoogleAnalyticsId('')).toBeNull();
    expect(normalizeGoogleAnalyticsId('G-XXXXXXXXXX')).toBeNull();
    expect(normalizeGoogleAnalyticsId('UA-12345-1')).toBeNull();
    expect(normalizeGoogleAnalyticsId('not-an-id')).toBeNull();
  });
});
