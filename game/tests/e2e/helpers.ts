import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Cell, Edge, GameState } from '../../src/logic';
import type { HangTestHooks } from '../../src/testHooks';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

type H = HangTestHooks;

/** E13: すべてのテストでコンソールエラーを収集し、終了時に 0 件を要求する */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [async ({ page }, use) => {
    const errs: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    await use(errs);
    expect(errs, 'console errors').toEqual([]);
  }, { auto: true }],
});
export { expect };

export const fixture = (name: string): string => readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', name), 'utf8');

export async function openApp(page: Page, extraQuery = ''): Promise<void> {
  await page.goto(`/?test=1${extraQuery}`);
  await expect(page.getByTestId('title-screen')).toBeVisible();
}

export async function startGame(page: Page, players: 2 | 3 = 2): Promise<void> {
  await openApp(page);
  await page.getByTestId(`player-count-${players}`).click();
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => !!(window as unknown as { __HANG__?: unknown }).__HANG__ && (window as unknown as { __HANG__: H }).__HANG__.getState().phase !== undefined);
  await waitIdle(page);
}

export async function loadFixture(page: Page, json: string): Promise<void> {
  await openApp(page);
  await page.getByTestId('start-button').click(); // ランタイム初期化(WebGL)
  await page.waitForFunction(() => !!(window as unknown as { __HANG__?: unknown }).__HANG__);
  await page.evaluate((j) => (window as unknown as { __HANG__: H }).__HANG__.loadState(j), json);
  await waitIdle(page);
}

export const getState = (page: Page): Promise<GameState> => page.evaluate(() => (window as unknown as { __HANG__: H }).__HANG__.getState());
/** アニメ(入力ロック)とカメラ移動の完了を待つ */
export const waitIdle = (page: Page) => page.waitForFunction(() => { const h = (window as unknown as { __HANG__: H }).__HANG__; return !h.isBusy() && !h.getCamera().moving; }, undefined, { timeout: 30_000 });

export async function tapAt(page: Page, p: { x: number; y: number }): Promise<void> {
  if (test.info().project.name.startsWith('mobile')) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
export async function tapCell(page: Page, c: Cell): Promise<void> {
  const p = await page.evaluate(({ x, y }) => (window as unknown as { __HANG__: H }).__HANG__.cellToScreen(x, y), c);
  await tapAt(page, p);
}
export async function tapEdge(page: Page, e: Edge): Promise<void> {
  const p = await page.evaluate((ed) => (window as unknown as { __HANG__: H }).__HANG__.edgeToScreen(ed), e);
  await tapAt(page, p);
}

/** □を置く(2 回タップ=選択→確定) */
export async function placeSquareAt(page: Page, c: Cell): Promise<void> {
  await tapCell(page, c);
  await tapCell(page, c);
  await waitIdle(page);
}

export async function shot(page: Page, name: string): Promise<void> {
  mkdirSync('test-results/screens', { recursive: true });
  await page.screenshot({ path: `test-results/screens/${name}-${test.info().project.name}.png` });
}
