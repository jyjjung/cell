import { expect, test } from '@playwright/test';
import { login, requireTestUser } from './helpers';

test.describe('smoke: chat', () => {
  test('login, home, then chat UI', async ({ page }) => {
    requireTestUser();

    await login(page);

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening),/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByRole('button', { name: /New chat/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
