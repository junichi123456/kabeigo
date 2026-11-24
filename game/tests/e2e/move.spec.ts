import { applyMove, legalMovesForPiece, representativeMoves } from '../../src/logic';
import { expect, getState, placeSquareAt, shot, startGame, tapCell, tapEdge, test, waitIdle } from './helpers';
import type { Page } from '@playwright/test';

const SQ = [{ x: 0, y: 0 }, { x: 8, y: 0 }];
async function toMovePhase(page: Page) {
  await startGame(page, 2);
  for (const c of SQ) await placeSquareAt(page, c);
}
const sel = (page: Page) => page.evaluate(() => (window as unknown as { __HANG__: import('../../src/testHooks').HangTestHooks }).__HANG__.getSelection());
const hl = (page: Page) => page.evaluate(() => (window as unknown as { __HANG__: import('../../src/testHooks').HangTestHooks }).__HANG__.getHighlights());
const anims = (page: Page) => page.evaluate(() => (window as unknown as { __HANG__: import('../../src/testHooks').HangTestHooks }).__HANG__.lastAnimations());

test('E3 select circle: highlights match representative moves', async ({ page }) => {
  await toMovePhase(page);
  const s = await getState(page);
  await tapCell(page, { x: 2, y: 6 });
  expect((await sel(page)).pieceId).toBe('p0-c0');
  const reps = representativeMoves(legalMovesForPiece(s, 'p0-c0'));
  const expected = reps.map((m) => `${m.path.at(-1)!.x},${m.path.at(-1)!.y}`).sort();
  const h = await hl(page);
  expect(h.cells.map((c) => `${c.x},${c.y}`).sort()).toEqual(expected);
  expect(h.breakCells).toEqual([]);
  await shot(page, 'selected');
});

test('E4/E5/E6 move animation, input lock, wall placement', async ({ page }) => {
  await toMovePhase(page);
  await tapCell(page, { x: 2, y: 6 });
  await tapCell(page, { x: 2, y: 5 }); // 移動先を選択(1 回目)
  expect((await sel(page)).target).toEqual({ x: 2, y: 5 });
  await page.getByTestId('confirm-button').click();
  // E5: アニメ中は入力を無視し、確定ボタンは disabled
  expect(await page.evaluate(() => (window as unknown as { __HANG__: { isBusy(): boolean } }).__HANG__.isBusy())).toBe(true);
  await expect(page.getByTestId('confirm-button')).toBeDisabled();
  const before = await getState(page);
  await tapCell(page, { x: 2, y: 6 });
  await tapCell(page, { x: 5, y: 5 });
  expect(await getState(page)).toEqual(before);
  expect((await sel(page)).pieceId).toBeNull();
  await waitIdle(page);
  // E4: 移動 0.8 秒(許容 ±40ms + 描画フレーム 150ms)
  const mv = (await anims(page)).filter((a) => a.kind === 'move').at(-1)!;
  expect(mv.endedAt).not.toBeNull();
  const dur = mv.endedAt! - mv.startedAt;
  console.log(`[E4] move animation: ${dur.toFixed(0)}ms (software GL, not representative of devices)`);
  expect(dur).toBeGreaterThanOrEqual(700 - 40);
  expect(dur).toBeLessThanOrEqual(900 + 40 + 150);
  // E6: 壁フェーズ
  let s = await getState(page);
  expect(s.phase).toBe('wall');
  await expect(page.getByTestId('hud-phase')).toContainText('壁を建てる辺');
  const h = await hl(page);
  expect(h.edges.length).toBeGreaterThan(0);
  await shot(page, 'wall-phase');
  const wallsBefore = s.hWalls.filter((w) => w !== -1).length + s.vWalls.filter((w) => w !== -1).length;
  await tapEdge(page, h.edges[0]!);
  expect((await sel(page)).edge).toEqual(h.edges[0]);
  await page.getByTestId('confirm-button').click();
  await expect(page.getByTestId('turn-banner')).toContainText('プレイヤー2のターン'); // 手番交代バナー(約0.9秒)
  await waitIdle(page);
  s = await getState(page);
  const wallsAfter = s.hWalls.filter((w) => w !== -1).length + s.vWalls.filter((w) => w !== -1).length;
  expect(wallsAfter).toBe(wallsBefore + 1);
  expect([...s.hWalls, ...s.vWalls].filter((w) => w === 0)).toHaveLength(1);
  expect(s.currentPlayer).toBe(1);
  expect(s.phase).toBe('move');
  await expect(page.getByTestId('hud-current-player')).toHaveText('プレイヤー2');
  void applyMove;
});

test('cancel clears the selection', async ({ page }) => {
  await toMovePhase(page);
  await tapCell(page, { x: 2, y: 6 });
  await expect(page.getByTestId('cancel-button')).toBeVisible();
  await page.getByTestId('cancel-button').click();
  expect((await sel(page)).pieceId).toBeNull();
});
