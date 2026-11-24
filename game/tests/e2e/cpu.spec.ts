import { expect, getState, openApp, tapAt, tapCell, test, waitIdle, shot } from './helpers';
import type { Page } from '@playwright/test';
import type { HangTestHooks } from '../../src/testHooks';

type H = HangTestHooks;
const waitHuman = async (page: Page) => { await waitIdle(page); };

async function startCpu(page: Page, players: 2 | 3): Promise<void> {
  await openApp(page, '&seed=7');
  await page.getByTestId('mode-cpu').click();
  await page.getByTestId(`player-count-${players}`).click();
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => !!(window as unknown as { __HANG__?: unknown }).__HANG__);
  await waitHuman(page);
}

test('E16 title: CPU mode shows a hint and only the human name input', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('mode-pvp')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('mode-cpu').click();
  await expect(page.getByTestId('mode-cpu')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('cpu-hint')).toContainText('CPU');
  await expect(page.getByTestId('name-input-0')).toBeVisible();
  await expect(page.getByTestId('name-input-1')).toHaveCount(0);
  await page.getByTestId('player-count-3').click();
  await expect(page.getByTestId('cpu-hint')).toContainText('CPU1・CPU2');
  await page.getByTestId('mode-pvp').click();
  await expect(page.getByTestId('name-input-2')).toBeVisible();
});

test('E16 single player (1 human vs CPU): placement, move, wall, then the CPU plays by itself', async ({ page }) => {
  await startCpu(page, 2);
  let s = await getState(page);
  expect(s.phase).toBe('placement');
  expect(s.config.playerNames).toEqual(['プレイヤー1', 'CPU']);
  await expect(page.getByTestId('hud-score-1')).toBeVisible();

  // 人間(P0)が □ を置く → CPU(P1)が自動で □ を置く → 人間の手番に戻る
  await tapCell(page, { x: 0, y: 0 });
  await tapCell(page, { x: 0, y: 0 });
  await expect(page.getByTestId('hud-phase')).toContainText('考えています'); // CPU の手番表示
  await waitHuman(page);
  s = await getState(page);
  expect(s.phase).toBe('move');
  expect(s.currentPlayer).toBe(0);
  expect(s.pieces).toHaveLength(4);
  expect(s.pieces.find((p) => p.id === 'p1-s0')).toBeDefined();   // CPU が置いた □
  await shot(page, 'cpu-after-placement');

  // 人間の移動と壁
  await tapCell(page, { x: 2, y: 6 });
  await tapCell(page, { x: 2, y: 5 });
  await page.getByTestId('confirm-button').click();
  await page.waitForFunction(() => (window as unknown as { __HANG__: H }).__HANG__.getState().phase === 'wall' || (window as unknown as { __HANG__: H }).__HANG__.getState().currentPlayer !== 0);
  await waitIdle(page);
  const edge = await page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.getHighlights().edges[0]!);
  const p = await page.evaluate((e) => (window as unknown as { __HANG__: H }).__HANG__.edgeToScreen(e), edge);
  await tapAt(page, p);
  await page.getByTestId('confirm-button').click();
  // CPU の手番中は入力を受け付けない
  await expect(page.getByTestId('confirm-button')).toBeDisabled();
  const mid = await getState(page);
  await tapCell(page, { x: 6, y: 2 });
  expect((await page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.getSelection())).pieceId).toBeNull();
  void mid;
  // CPU が移動と壁を自動で行い、人間の手番に戻る
  await waitHuman(page);
  s = await getState(page);
  expect(s.currentPlayer).toBe(0);
  expect(s.phase).toBe('move');
  const kinds = s.log.map((l) => `${l.t}:${'player' in l ? l.player : ''}`);
  expect(kinds).toContain('move:1');   // CPU が駒を動かした
  expect(kinds).toContain('wall:1');   // CPU が壁を建てた
  expect(s.turnCount).toBe(2);
  await expect(page.getByTestId('hud-current-player')).toHaveText('プレイヤー1');
  await shot(page, 'cpu-after-turn');
});

test('E16 3 players: one human and two CPUs place their squares automatically', async ({ page }) => {
  await startCpu(page, 3);
  await tapCell(page, { x: 0, y: 0 });
  await tapCell(page, { x: 0, y: 0 });
  await waitHuman(page);
  const s = await getState(page);
  expect(s.config.playerNames).toEqual(['プレイヤー1', 'CPU1', 'CPU2']);
  expect(s.phase).toBe('move');
  expect(s.pieces).toHaveLength(6);
  for (let o = 0; o < 3; o++) expect(s.pieces.filter((x) => x.owner === o).map((x) => x.kind).sort()).toEqual(['circle', 'square']);
  await expect(page.getByTestId('hud-score-2')).toBeVisible();
});
