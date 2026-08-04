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

/** Capture a Firebase ID token from an authenticated API call after login. */
export async function captureAuthToken(page: Page): Promise<string> {
  const tokenPromise = page.waitForRequest(
    (req) => {
      const auth = req.headers()['authorization'] || req.headers()['Authorization'];
      return !!auth && auth.startsWith('Bearer ') && req.url().includes('/api/');
    },
    { timeout: 60_000 },
  );

  await page.goto('/forms', { waitUntil: 'domcontentloaded' });
  const req = await tokenPromise;
  const auth = req.headers()['authorization'] || req.headers()['Authorization'];
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Could not capture auth token');
  return token;
}

export async function apiJson(
  page: Page,
  path: string,
  options: { method?: string; token: string; body?: unknown },
) {
  return page.evaluate(
    async ({ path, method, token, body }) => {
      const res = await fetch(path, {
        method: method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    },
    { path, method: options.method, token: options.token, body: options.body },
  );
}
