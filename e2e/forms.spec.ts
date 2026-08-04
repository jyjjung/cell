import { expect, test } from '@playwright/test';
import { apiJson, captureAuthToken, login, requireTestUser } from './helpers';

test.describe('forms', () => {
  test('member forms page loads', async ({ page }) => {
    requireTestUser();
    await login(page);
    await captureAuthToken(page);

    await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Available forms')).toBeVisible();
    await expect(page.getByText('Your submissions')).toBeVisible();
  });

  test('admin: create form, field export picker, delete own response', async ({ page }) => {
    const { email } = requireTestUser();
    await login(page);
    const token = await captureAuthToken(page);

    const adminList = await apiJson(page, '/api/forms/admin/definitions', { token });
    test.skip(adminList.status === 403, 'TEST_USER is not an admin — set an admin account in .env.e2e.local to cover this.');
    expect(adminList.status).toBe(200);

    const stamp = Date.now();
    const title = `E2E Forms ${stamp}`;
    const fieldA = `e2e_q_a_${stamp}`;
    const fieldB = `e2e_q_b_${stamp}`;

    const created = await apiJson(page, '/api/forms/admin/definitions', {
      token,
      method: 'POST',
      body: {
        title,
        description: 'Playwright temporary form — safe to delete',
        status: 'published',
        allowedRoleIds: [],
        allowedUserIds: [],
        fields: [
          { id: fieldA, label: 'E2E Question A', type: 'text', order: 0, required: true },
          { id: fieldB, label: 'E2E Question B', type: 'text', order: 1, required: false },
        ],
      },
    });
    expect(created.status, JSON.stringify(created.data)).toBe(200);
    const formId = created.data.formId as string;
    const publicToken = created.data.publicToken as string;
    expect(formId).toBeTruthy();
    expect(publicToken).toBeTruthy();

    try {
      const submit = await apiJson(page, `/api/forms/public/${encodeURIComponent(publicToken)}/responses`, {
        token,
        method: 'POST',
        body: {
          email,
          answers: {
            [fieldA]: 'answer-a',
            [fieldB]: 'answer-b',
          },
        },
      });
      expect(submit.status, JSON.stringify(submit.data)).toBe(200);
      expect(submit.data.responseId).toBeTruthy();

      await page.goto('/forms', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });

      const submissions = page.locator('section').filter({ hasText: 'Your submissions' });
      await expect(submissions.getByText(title).first()).toBeVisible({ timeout: 30_000 });
      await submissions.getByRole('button', { name: 'Delete submission' }).first().click();
      await expect(page.getByRole('heading', { name: 'Delete this submission?' })).toBeVisible();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByText('Response deleted')).toBeVisible({ timeout: 15_000 });
      await expect(submissions.getByText(title)).toHaveCount(0, { timeout: 15_000 });

      const submit2 = await apiJson(page, `/api/forms/public/${encodeURIComponent(publicToken)}/responses`, {
        token,
        method: 'POST',
        body: {
          email,
          answers: {
            [fieldA]: 'answer-a-2',
            [fieldB]: 'answer-b-2',
          },
        },
      });
      expect(submit2.status, JSON.stringify(submit2.data)).toBe(200);

      await page.goto(`/admin/forms/${encodeURIComponent(formId)}/responses`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(email).first()).toBeVisible({ timeout: 30_000 });

      await page.getByRole('button', { name: 'Download…' }).first().click();
      await expect(page.getByRole('heading', { name: 'Download responses' })).toBeVisible();
      await expect(page.getByText('E2E Question A')).toBeVisible();
      await expect(page.getByText('E2E Question B')).toBeVisible();

      const qB = page.locator('label').filter({ hasText: 'E2E Question B' });
      await qB.getByRole('checkbox').click();
      await expect(qB.getByRole('checkbox')).not.toBeChecked();

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
      await page.getByRole('button', { name: 'Download CSV' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      const csvPath = await download.path();
      expect(csvPath).toBeTruthy();
      const fs = await import('node:fs/promises');
      const csv = await fs.readFile(csvPath!, 'utf8');
      expect(csv).toContain('E2E Question A');
      expect(csv).not.toContain('E2E Question B');
      expect(csv).toMatch(/answer-a-2|answer-a/);
    } finally {
      await apiJson(page, `/api/forms/admin/definitions/${encodeURIComponent(formId)}`, {
        token,
        method: 'DELETE',
      });
    }
  });
});
