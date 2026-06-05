import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config. Drives the real app in headless Chromium against the Vite dev
 * server (the service worker is disabled in dev, which keeps tests
 * deterministic). Each test gets a fresh browser context, so IndexedDB starts
 * empty and the app re-seeds its routines/exercises on load.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    // Mobile-first app: emulate a phone viewport.
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
