import { expect, test } from '@playwright/test';
import { login, requireTestUser } from './helpers';

test.describe('smoke: schedule', () => {
  test('login, home, then events schedule loads', async ({ page }) => {
    requireTestUser();

    await login(page);

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening),/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/);
    await expect(page.getByRole('tab', { name: /Upcoming/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('tab', { name: /Past/i })).toBeVisible();
  });
});
