import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'dev-hub.spec.ts',
  workers: 1,
  use: {
    browserName: 'chromium',
    headless: true,
  },
});
