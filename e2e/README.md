# Playwright e2e

Smoke tests that sign in with a real Firebase test user and exercise a few authenticated routes.

## Credentials

Create `.env.e2e.local` in the repo root (gitignored — never commit it):

```bash
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
```

`playwright.config.ts` loads `.env.e2e.local` first, then `.env.local` for any missing keys.

Use a dedicated non-admin account when possible. Do not put passwords in tracked files or CI logs.

Forms admin coverage (`e2e/forms.spec.ts` admin test) needs an **admin** `TEST_USER_*` — otherwise that test is skipped.

## Run

```bash
# First time (or after Playwright upgrades)
npx playwright install chromium

# Headless (starts `npm run dev` on :9002 unless one is already running)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui
```

Tests skip automatically if `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` are missing.
