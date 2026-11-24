import { chromium } from '@playwright/test';
const [w, h] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' })).newPage();
await p.goto('http://localhost:4173/?test=1');
await p.click('[data-testid="start-button"]');
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)]; };
  return { inner: innerHeight, game: r('#game-screen'), hud: r('#hud'), stage: r('#stage'), wrap: r('#canvas-wrap'), bar: r('#actionbar'), btn: r('#confirm-button'), cancel: r('#cancel-button') };
})));
await b.close();
