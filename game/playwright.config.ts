import { defineConfig, devices } from '@playwright/test';

const launchOptions = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', launchOptions },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, launchOptions } },
    { name: 'mobile-portrait', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, launchOptions } },
    { name: 'mobile-landscape', use: { ...devices['Pixel 7'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, launchOptions } },
  ],
});
