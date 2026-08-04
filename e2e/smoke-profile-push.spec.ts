import { test, expect } from '@playwright/test';
import { login, requireTestUser } from './helpers';

test.describe('smoke: profile push health', () => {
  test('settings shows push health card', async ({ page }) => {
    requireTestUser();

    await login(page);
    await page.goto('/profile?tab=settings');
    await expect(page.getByText(/Push notifications|푸시 알림/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/This device|이 기기/i).first()).toBeVisible();
    await expect(page.getByText(/Permission|권한/i).first()).toBeVisible();
    await expect(page.getByText(/Token on this account|계정 토큰/i).first()).toBeVisible();
  });
});
