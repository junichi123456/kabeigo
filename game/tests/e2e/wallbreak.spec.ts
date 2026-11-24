import { expect, fixture, getState, loadFixture, shot, tapCell, test, waitIdle } from './helpers';

test('E7 wall break: orange highlight, wall removed, count updated', async ({ page }) => {
  await loadFixture(page, fixture('wallbreak.json'));
  await expect(page.getByTestId('hud-break-0')).toHaveText('壁破り 1');
  await tapCell(page, { x: 4, y: 4 });
  const h = await page.evaluate(() => (window as unknown as { __HANG__: import('../../src/testHooks').HangTestHooks }).__HANG__.getHighlights());
  expect(h.breakCells.map((c) => `${c.x},${c.y}`).sort()).toEqual(['4,2', '4,3']);
  expect(h.cells.length).toBeGreaterThan(0);
  await shot(page, 'break-highlight');
  await tapCell(page, { x: 4, y: 3 });
  await expect(page.getByTestId('confirm-button')).toHaveText('壁破りして移動');
  await expect(page.getByTestId('hud-phase')).toContainText('壁破りを使用します');
  await shot(page, 'break-preview');
  await page.getByTestId('confirm-button').click();
  await waitIdle(page);
  const s = await getState(page);
  expect(s.hWalls[3 * 9 + 4]).toBe(-1);
  expect(s.wallBreakUsed[0]).toBe(true);
  await expect(page.getByTestId('hud-break-0')).toHaveText('壁破り 0');
  const anims = await page.evaluate(() => (window as unknown as { __HANG__: import('../../src/testHooks').HangTestHooks }).__HANG__.lastAnimations());
  expect(anims.some((a) => a.kind === 'wallBreak' && a.endedAt !== null)).toBe(true);
});
