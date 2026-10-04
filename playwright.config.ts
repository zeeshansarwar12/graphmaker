import { defineConfig, devices } from '@playwright/test';

const deployedBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: deployedBaseURL ? undefined : './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: deployedBaseURL ?? 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
