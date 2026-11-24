import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const [src, shot] = process.argv.slice(2);
// 公開時の骨格(charset + viewport)を模して包む
writeFileSync(src + '.full.html', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${readFileSync(src, 'utf8')}</body></html>`);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })).newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('file://' + src + '.full.html');
await p.click('[data-testid="start-button"]');
await p.waitForTimeout(2500);
console.log('canvas:', await p.evaluate(() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; }), 'errors:', errs);
await p.screenshot({ path: shot });
await b.close();
