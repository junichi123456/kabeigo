import { chromium } from '@playwright/test';
const [w, h, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, serviceWorkers: 'block' })).newPage();
await p.goto('http://localhost:4173/?test=1');
await p.click('[data-testid="mode-cpu"]');
await p.screenshot({ path: `test-results/screens/title-cpu-${out}.png` });
await b.close();
