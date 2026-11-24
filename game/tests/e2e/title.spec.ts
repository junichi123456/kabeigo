import { expect, openApp, test } from './helpers';

test('E1 title: count toggle and rules modal', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('player-count-2')).toBeVisible();
  await expect(page.getByTestId('name-input-1')).toBeVisible();
  await expect(page.getByTestId('name-input-2')).toHaveCount(0);
  await page.getByTestId('player-count-3').click();
  await expect(page.getByTestId('name-input-2')).toBeVisible();
  await page.getByTestId('player-count-2').click();
  await expect(page.getByTestId('name-input-2')).toHaveCount(0);
  await page.getByTestId('rules-button').click();
  await expect(page.getByTestId('rules-modal')).toBeVisible();
  await page.getByTestId('rules-close').click();
  await expect(page.getByTestId('rules-modal')).toBeHidden();
  await expect(page.getByTestId('start-button')).toBeVisible();
});
