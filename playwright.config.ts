import { defineConfig, devices } from '@playwright/test';

// Port réglable (machine partagée, plusieurs serveurs en parallèle) : PW_PORT=5643 npm run e2e
const port = Number(process.env.PW_PORT ?? 4317);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'off',
    // En local (conteneur), on réutilise le Chromium préinstallé ; en CI, celui de Playwright.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: `npx vite preview --port ${port} --strictPort`, port, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
