import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    browserName: 'chromium',
    channel: 'chrome',
    baseURL: 'http://localhost:3000',
    headless: process.env.CI_PIPELINE === 'true' ? true : false,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run start:dev',
    reuseExistingServer: true,
  },
  testDir: 'public/tests',
});