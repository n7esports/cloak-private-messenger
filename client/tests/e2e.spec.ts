import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://uqzera.vercel.app';

test.describe('Cloak E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[BROWSER ERROR] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      console.error(`[PAGE ERROR] ${err.message}`);
    });
  });

  test('signup and navigate all pages without 404s', async ({ page }) => {
    await page.goto(`${BASE}/auth/sign-up`);

    await page.getByLabel(/alias/i).fill('TestUser');
    await page.getByLabel(/pin/i).fill('123456');
    await page.getByRole('button', { name: /sign up|create/i }).click();

    await page.waitForURL(`${BASE}/chats`, { timeout: 15000 });

    const pages = [
      '/chats',
      '/chats/channels',
      '/chats/settings',
      '/settings',
      '/legal/privacy',
      '/legal/terms',
      '/legal/cookies',
      '/legal/cookie-settings',
      '/legal/contact',
      '/legal/data-request',
      '/legal/dpa',
      '/legal/licenses',
      '/legal/security',
      '/legal/status',
      '/legal/subprocessors',
      '/legal/unsubscribe',
    ];

    for (const p of pages) {
      const res = await page.goto(`${BASE}${p}`);
      expect(res?.status(), `Expected 200 on ${p}`).toBe(200);
    }

    await page.screenshot({ path: 'client/tests/final-state.png', fullPage: true });
  });
});
