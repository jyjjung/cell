import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: process.env.RUN_FIRESTORE_RULES
      ? ['tests/firestore/**/*.test.ts']
      : ['src/**/*.test.ts'],
  },
});
