import { expect, startGame, test } from './helpers';

const SIZES = [[360, 640], [390, 844], [844, 390], [1280, 720], [1920, 1080]] as const;

test('E11 layout: board fits, HUD does not overlap canvas, no page scroll', async ({ page }) => {
  await startGame(page, 3);
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const info = await page.evaluate(() => {
      const hk = (window as unknown as { __HANG__: import('../../src/testHooks').HangTestHooks }).__HANG__;
      const box = (sel: string) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      return {
        corners: hk.getBoardCorners(), canvas: box('canvas'), hud: box('[data-testid="hud"]'), confirm: box('[data-testid="confirm-button"]'),
        sw: document.documentElement.scrollWidth, iw: window.innerWidth, sh: document.documentElement.scrollHeight, ih: window.innerHeight,
      };
    });
    const tag = `${w}x${h}`;
    for (const c of info.corners) {
      expect(c.x, `corner x ${tag}`).toBeGreaterThanOrEqual(info.canvas.l + 8);
      expect(c.x, `corner x ${tag}`).toBeLessThanOrEqual(info.canvas.r - 8);
      expect(c.y, `corner y ${tag}`).toBeGreaterThanOrEqual(info.canvas.t + 8);
      expect(c.y, `corner y ${tag}`).toBeLessThanOrEqual(info.canvas.b - 8);
    }
    const overlap = (a: typeof info.hud, b: typeof info.hud) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    expect(overlap(info.hud, info.canvas), `hud/canvas overlap ${tag}`).toBe(false);
    expect(overlap(info.confirm, info.canvas), `confirm/canvas overlap ${tag}`).toBe(false);
    expect(overlap(info.confirm, info.hud), `confirm/hud overlap ${tag}`).toBe(false);
    expect(info.sw).toBeLessThanOrEqual(info.iw);
    expect(info.sh).toBeLessThanOrEqual(info.ih);
    // 確定ボタンが盤面の下部中央にある
    const cx = (info.confirm.l + info.confirm.r) / 2, canvasCx = (info.canvas.l + info.canvas.r) / 2;
    expect(Math.abs(cx - canvasCx), `confirm centered ${tag}`).toBeLessThan(6);
    expect(info.confirm.t).toBeGreaterThanOrEqual(info.canvas.b - 1);
    await page.screenshot({ path: `test-results/screens/layout-${tag}-${test.info().project.name}.png` });
  }
});
