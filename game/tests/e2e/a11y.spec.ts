import type { Page } from '@playwright/test';
import { expect, openApp, placeSquareAt, startGame, tapAt, tapCell, test } from './helpers';
import type { HangTestHooks } from '../../src/testHooks';

type H = HangTestHooks;
const SQ = [{ x: 0, y: 0 }, { x: 8, y: 0 }];
const size = async (page: Page, id: string) => (await page.getByTestId(id).boundingBox())!;

test('E15 touch targets: buttons are at least 44x44 CSS px (title and in-game)', async ({ page }) => {
  await openApp(page);
  for (const id of ['player-count-2', 'player-count-3', 'start-button', 'rules-button']) {
    const b = await size(page, id);
    expect(b.height, `${id} height`).toBeGreaterThanOrEqual(44);
    expect(b.width, `${id} width`).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByTestId('player-count-2')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => !!(window as unknown as { __HANG__?: unknown }).__HANG__);
  for (const id of ['menu-button', 'confirm-button']) {
    const b = await size(page, id);
    expect(b.height, `${id} height`).toBeGreaterThanOrEqual(44);
    expect(b.width, `${id} width`).toBeGreaterThanOrEqual(44);
  }
  await page.getByTestId('menu-button').click();
  for (const id of ['menu-rules', 'menu-title']) expect((await size(page, id)).height, id).toBeGreaterThanOrEqual(44);
  await expect(page.getByTestId('hud-phase')).toHaveAttribute('role', 'status');
});

test('E15 snapping: a tap just outside a highlighted target still selects it', async ({ page }) => {
  await startGame(page, 2);
  for (const c of SQ) await placeSquareAt(page, c);
  await tapCell(page, { x: 2, y: 6 });             // 〇を選択 → (6,1) などが移動先
  const pos = await page.evaluate(() => {
    const h = (window as unknown as { __HANG__: H }).__HANG__;
    return { t: h.cellToScreen(2, 5), above: h.cellToScreen(2, 4), cells: h.getHighlights().cells };
  });
  expect(pos.cells.some((c) => c.x === 2 && c.y === 5)).toBe(true);
  expect(pos.cells.some((c) => c.x === 2 && c.y === 4)).toBe(false);   // (2,4) は移動先ではない
  // (2,5) の中心から (2,4) 方向へ 0.6 マス分ずらした点(= 隣の非候補セルの内側)をタップ
  await tapAt(page, { x: pos.t.x + (pos.above.x - pos.t.x) * 0.6, y: pos.t.y + (pos.above.y - pos.t.y) * 0.6 });
  const sel = await page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.getSelection());
  expect(sel.pieceId).toBe('p0-c0');
  expect(sel.target).toEqual({ x: 2, y: 5 });
});

test('E15 wall edge: tapping on the far side of the moved piece still picks the nearest candidate', async ({ page }) => {
  await startGame(page, 2);
  for (const c of SQ) await placeSquareAt(page, c);
  await tapCell(page, { x: 2, y: 6 });
  await tapCell(page, { x: 2, y: 5 });
  await page.getByTestId('confirm-button').click();
  await page.waitForFunction(() => (window as unknown as { __HANG__: H }).__HANG__.getState().phase === 'wall');
  await page.waitForFunction(() => !(window as unknown as { __HANG__: H }).__HANG__.isBusy() && !(window as unknown as { __HANG__: H }).__HANG__.getCamera().moving);
  const p = await page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.cellToScreen(2, 5));
  await tapAt(page, p); // 駒のマスの中心(どの辺にも触れていない場所)
  const sel = await page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.getSelection());
  expect(sel.edge).not.toBeNull();
});

test('E15 reduced motion: no looping animation on the confirm button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startGame(page, 2);
  for (const c of SQ) await placeSquareAt(page, c);
  await tapCell(page, { x: 2, y: 6 });
  await tapCell(page, { x: 2, y: 5 });
  await expect(page.getByTestId('confirm-button')).toBeEnabled();
  const name = await page.evaluate(() => getComputedStyle(document.querySelector('#confirm-button img')!).animationName);
  expect(name).toBe('none');
});
