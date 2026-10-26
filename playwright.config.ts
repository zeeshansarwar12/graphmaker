import { defineConfig, devices } from '@playwright/test';

const deployedBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: deployedBaseURL ? undefined : './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: deployedBaseURL ?? 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'seo-snapshots',
      testMatch: 'seo-snapshots.spec.ts',
      outputDir: './test-results/seo-snapshots',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'seo-aggregate',
      testMatch: 'seo-aggregate.spec.ts',
      dependencies: ['seo-snapshots'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: ['seo-snapshots.spec.ts', 'seo-aggregate.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
