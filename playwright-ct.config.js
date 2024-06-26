import { defineConfig, devices } from '@playwright/experimental-ct-react';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: 'playwright/ct-tests',
  fullyParallel: true,
  retries: 3,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'blob' : 'html',

  use: {
    trace: 'on',
    ctPort: 3100,
    ctTemplateDir: 'playwright/ct-tests',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
