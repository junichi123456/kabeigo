// 手動確認用: node scripts/shot.mjs <name> <width> <height> [state.json]
import { chromium } from '@playwright/test';
const [name = 'shot', w = '1280', h = '720', stateFile] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, serviceWorkers: 'block' });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto('http://localhost:4173/?test=1');
await p.screenshot({ path: `test-results/${name}-title.png` });
await p.click('[data-testid="start-button"]');
await p.waitForTimeout(2500);
await p.screenshot({ path: `test-results/${name}-game.png` });
await b.close();
