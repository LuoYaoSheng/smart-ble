// playwright.config.js — Smart BLE Page E4 environment (ENV-PLAYWRIGHT-001)
// Chromium only. Does not imply Page Driver readiness.
// TARGET_PAGE_BASE_URL must be set for live runs; missing → BLOCKED_BY_TARGET_DRIVER (runner).

import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.TARGET_PAGE_BASE_URL || undefined;

export default defineConfig({
  testDir: 'tests/target/pages',
  testMatch: /.*\.spec\.js$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: undefined,
      },
    },
  ],
});
