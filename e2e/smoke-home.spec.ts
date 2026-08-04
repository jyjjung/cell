import { expect, test } from '@playwright/test';
import { login, requireTestUser } from './helpers';

test.describe('smoke: home spine', () => {
  test('home shows reading hub and upcoming section', async ({ page }) => {
    requireTestUser();

    await login(page);

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening),|님/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Bible reading section (EN or KO)
    await expect(
      page.getByText(/Reading|Bible|읽기|성경/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    // Upcoming agenda section title
    await expect(
      page.getByText(/Upcoming events|다가오는 이벤트/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
