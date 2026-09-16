import { defineConfig, devices } from '@playwright/test';

/**
 * ForAntigravity Playwright E2E Configuration
 * Tests progressive lockout (3 -> 10s -> 3 -> 1h), OTP auth, and admin workflows.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // sequential execution required for stateful lockout progression
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start --prefix server',
      url: 'http://localhost:5000/api/system/health',
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      command: 'npm run dev --prefix client',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 15000,
    },
  ],
});
