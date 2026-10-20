import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke e2e for the web app. Runs against a production build and needs no
 * backend: it covers i18n/RTL, locale switching and the auth gate.
 * The full login → checkout flow is exercised manually against Stripe test mode
 * (see README), since it depends on live Supabase and Stripe accounts.
 */
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
