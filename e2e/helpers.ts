import { test, type Page } from '@playwright/test';

export function requireTestUser() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    test.skip(
      true,
      'Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.e2e.local (see e2e/README.md).',
    );
  }
  return {
    email: email as string,
    password: password as string,
  };
}

export async function login(page: Page) {
  const { email, password } = requireTestUser();

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Logged-in home shows a greeting + Bible reading hub.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 60_000,
  });
}
