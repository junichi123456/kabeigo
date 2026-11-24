import { expect, fixture, getState, loadFixture, shot, tapEdge, test, waitIdle } from './helpers';

test('E8/E9 finish by separation, result screen, restart and back to title', async ({ page }) => {
  await loadFixture(page, fixture('near-end.json'));
  await expect(page.getByTestId('hud-phase')).toContainText('壁を建てる辺');
  await tapEdge(page, { o: 'V', x: 3, y: 8 });
  await page.getByTestId('confirm-button').click();
  await waitIdle(page);
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await expect(page.getByTestId('result-winner')).toContainText('プレイヤー2の勝利');
  await expect(page.getByTestId('result-row-0')).toContainText('36');
  await expect(page.getByTestId('result-row-1')).toContainText('45');
  const s = await getState(page);
  expect(s.phase).toBe('finished');
  expect(s.result!.reason).toBe('separated');
  await shot(page, 'result');
  // 盤面を見る / 戻す
  await page.getByTestId('result-toggle').click();
  await expect(page.getByTestId('result-winner')).toBeHidden();
  await shot(page, 'result-board');
  await page.getByTestId('result-toggle').click();
  await expect(page.getByTestId('result-winner')).toBeVisible();
  // もう一度
  await page.getByTestId('restart-button').click();
  await expect(page.getByTestId('result-screen')).toBeHidden();
  const s2 = await getState(page);
  expect(s2.phase).toBe('placement');
  expect(s2.placementQueue).toEqual([0, 1]);
  expect(s2.pieces).toHaveLength(2);
  // タイトルへ(メニュー経由 + 確認ダイアログ)
  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-title').click();
  await expect(page.getByTestId('confirm-quit')).toBeVisible();
  await page.getByTestId('quit-yes').click();
  await expect(page.getByTestId('title-screen')).toBeVisible();
});

test('result: back to title button', async ({ page }) => {
  await loadFixture(page, fixture('near-end.json'));
  await tapEdge(page, { o: 'V', x: 3, y: 8 });
  await page.getByTestId('confirm-button').click();
  await waitIdle(page);
  await page.getByTestId('to-title-button').click();
  await expect(page.getByTestId('title-screen')).toBeVisible();
});
