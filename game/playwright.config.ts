import { defineConfig } from '@playwright/test';

// コンテナの Chromium(ソフトウェア GL)用。実機の性能を示すものではない。
const launchOptions = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
const common = { launchOptions, deviceScaleFactor: 1, serviceWorkers: 'block' as const };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/artifacts',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', ...common },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 }, ...common } },
    { name: 'mobile-portrait', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...common } },
    { name: 'mobile-landscape', use: { browserName: 'chromium', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, ...common } },
  ],
});
