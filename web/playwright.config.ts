import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 15000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3132',
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium',
    timezoneId: 'Asia/Tehran',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: 'http://127.0.0.1:3132/enter',
    reuseExistingServer: false,
    timeout: 60000,
  },
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }]],
  outputDir: 'test-results/browser',
});
