import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4317',
    trace: 'off',
    // En local (conteneur), on réutilise le Chromium préinstallé ; en CI, celui de Playwright.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: 'npx vite preview --port 4317 --strictPort', port: 4317, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
