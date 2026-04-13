const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './spec',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    baseURL: 'http://127.0.0.1:8080',
    video: 'on-first-retry', // Record videos on failure to debug pipeline
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    // Serve the electron generic H5 output wrapper
    command: 'npx http-server ../../apps/desktop/electron/public -a 127.0.0.1 -p 8080 -c-1',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
});
