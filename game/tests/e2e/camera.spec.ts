import { CAMERA_MOVE_MS } from '../../src/render/animMath';
import { expect, fixture, loadFixture, startGame, tapEdge, test, waitIdle } from './helpers';
import type { Page } from '@playwright/test';
import type { HangTestHooks } from '../../src/testHooks';

type H = HangTestHooks;
const cam = (page: Page) => page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.getCamera());
const camAnims = (page: Page) => page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.lastAnimations().filter((a) => a.kind === 'camera'));
const projectName = () => test.info().project.name;

test('E14 camera: phone = top-down for the turn (1.2s), desktop = oblique', async ({ page }) => {
  await startGame(page, 2);
  const c = await cam(page);
  if (projectName().startsWith('mobile')) {
    expect(c.mode).toBe('top');
    expect(c.elevationDeg).toBeCloseTo(90, 5);
    // 移動時間 1.2 秒(許容: ±40ms + 描画フレーム 150ms。ソフトウェア GL のため実機の値ではない)
    const a = (await camAnims(page)).at(-1)!;
    expect(a.endedAt).not.toBeNull();
    const dur = a.endedAt! - a.startedAt;
    console.log(`[E14] camera move: ${dur.toFixed(0)}ms (software GL, not representative of devices)`);
    expect(dur).toBeGreaterThanOrEqual(CAMERA_MOVE_MS - 40);
    expect(dur).toBeLessThanOrEqual(CAMERA_MOVE_MS + 40 + 150);
    // 盤の外周が余白 8px 以上で、可能な限り大きく(幅または高さの 90% 以上)表示される
    const m = await page.evaluate(() => {
      const hk = (window as unknown as { __HANG__: H }).__HANG__;
      const r = document.querySelector('canvas')!.getBoundingClientRect();
      const cs = hk.getBoardCorners();
      const xs = cs.map((p) => p.x), ys = cs.map((p) => p.y);
      return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), cw: r.width, ch: r.height };
    });
    expect(Math.max(m.w / m.cw, m.h / m.ch)).toBeGreaterThanOrEqual(0.9);
    if (projectName() === 'mobile-portrait') expect(m.w / m.cw).toBeGreaterThanOrEqual(0.9); // 縦長は横幅いっぱい
  } else {
    expect(c.mode).toBe('oblique');
    expect(c.elevationDeg).toBeCloseTo(58, 5);
    expect(await camAnims(page)).toHaveLength(0);
  }
});

test('E14 camera: returns to the oblique view when the game ends (phone)', async ({ page }) => {
  test.skip(!projectName().startsWith('mobile'), 'phone only');
  await loadFixture(page, fixture('near-end.json'));
  expect((await cam(page)).mode).toBe('top');
  await tapEdge(page, { o: 'V', x: 3, y: 8 });
  await page.getByTestId('confirm-button').click();
  await waitIdle(page);
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await page.waitForFunction(() => !(window as unknown as { __HANG__: H }).__HANG__.getCamera().moving);
  const c = await cam(page);
  expect(c.mode).toBe('oblique');
  expect(c.elevationDeg).toBeCloseTo(58, 5);
});
