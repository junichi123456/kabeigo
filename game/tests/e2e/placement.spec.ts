import { expect, getState, placeSquareAt, shot, startGame, test } from './helpers';

test('E2 placement: 1 square each (2 pieces per player) then move phase', async ({ page }) => {
  await startGame(page, 2);
  await expect(page.getByTestId('hud-phase')).toContainText('□を置くマス');
  await shot(page, 'initial');
  const cells = [{ x: 0, y: 0 }, { x: 8, y: 0 }];
  for (const c of cells) await placeSquareAt(page, c);
  const s = await getState(page);
  expect(s.phase).toBe('move');
  expect(s.currentPlayer).toBe(0);
  const sq = s.pieces.filter((p) => p.kind === 'square').sort((a, b) => a.id.localeCompare(b.id));
  expect(sq.map((p) => p.id)).toEqual(['p0-s0', 'p1-s0']);
  expect(sq.map((p) => p.pos)).toEqual([cells[0], cells[1]]);
  expect(s.pieces).toHaveLength(4);   // 各プレイヤー 〇1 + □1
  for (const o of [0, 1]) expect(s.pieces.filter((p) => p.owner === o).map((p) => p.kind).sort()).toEqual(['circle', 'square']);
});

test('E10 three players: circles and score rows', async ({ page }) => {
  await startGame(page, 3);
  const s = await getState(page);
  const circles = s.pieces.filter((p) => p.kind === 'circle').map((p) => `${p.owner}:${p.pos.x},${p.pos.y}`).sort();
  expect(circles).toEqual(['0:2,6', '1:6,2', '2:6,6']);
  expect(s.pieces).toHaveLength(3);
  for (const p of [0, 1, 2]) await expect(page.getByTestId(`hud-score-${p}`)).toBeVisible();
  await expect(page.getByTestId('hud-score-3')).toHaveCount(0);
  await shot(page, 'three');
});
