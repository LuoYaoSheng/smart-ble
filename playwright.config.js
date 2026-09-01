// playwright.config.js — Smart BLE Page E4 (ENV-PLAYWRIGHT + TEST-PAGE-DRIVER)
// Chromium only. Fake Runtime Driver 不依赖 TARGET_PAGE_BASE_URL。

import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.TARGET_PAGE_BASE_URL || undefined;

export default defineConfig({
  testDir: 'tests/target/pages/specs',
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
