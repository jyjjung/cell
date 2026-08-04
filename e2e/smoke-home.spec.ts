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

    // Agenda list (month groups) or empty schedule — section header was removed
    await expect(
      page
        .getByText(
          /Clear schedule|Nothing scheduled|일정 없음|예정된 일정이 없|January|February|March|April|May|June|July|August|September|October|November|December|1월|2월|3월|4월|5월|6월|7월|8월|9월|10월|11월|12월/i,
        )
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
