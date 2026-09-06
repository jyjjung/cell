import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Prefer e2e-specific credentials, then fall back to local app env.
loadEnvFile(path.resolve(__dirname, '.env.e2e.local'));
loadEnvFile(path.resolve(__dirname, '.env.local'));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:9002',
    trace: 'on-first-retry',
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true npm run dev',
    url: 'http://localhost:9002',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
