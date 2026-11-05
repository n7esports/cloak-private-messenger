# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> Cloak E2E >> signup and navigate all pages without 404s
- Location: tests/e2e.spec.ts:17:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "https://uqzera.vercel.app/chats" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "UQZERA" [level=1] [ref=e6]
      - paragraph [ref=e7]: Create your account
    - generic [ref=e8]:
      - paragraph [ref=e9]: Invalid credentials
      - generic [ref=e10]:
        - generic [ref=e11]: Alias
        - textbox "Alias" [ref=e12]: TestUser
      - generic [ref=e13]:
        - generic [ref=e14]: PIN
        - textbox "PIN" [ref=e15]:
          - /placeholder: ••••••
          - text: "123456"
      - generic [ref=e16]:
        - generic [ref=e17]: Profile name (optional)
        - textbox "Profile name (optional)" [ref=e18]:
          - /placeholder: Shown only to you
      - button "Sign up" [ref=e19] [cursor=pointer]
    - paragraph [ref=e20]:
      - text: Already have an account?
      - link "Sign in" [ref=e21] [cursor=pointer]:
        - /url: /auth/sign-in
  - generic [ref=e23]:
    - paragraph [ref=e24]: This site uses cookies. Essential cookies are always enabled.
    - generic [ref=e25]:
      - button "Accept all" [ref=e26] [cursor=pointer]
      - button "Reject non-essential" [ref=e27] [cursor=pointer]
      - button "Preferences" [ref=e28] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE = process.env.BASE_URL || 'https://uqzera.vercel.app';
  4  | 
  5  | test.describe('Cloak E2E', () => {
  6  |   test.beforeEach(async ({ page }) => {
  7  |     page.on('console', (msg) => {
  8  |       if (msg.type() === 'error') {
  9  |         console.error(`[BROWSER ERROR] ${msg.text()}`);
  10 |       }
  11 |     });
  12 |     page.on('pageerror', (err) => {
  13 |       console.error(`[PAGE ERROR] ${err.message}`);
  14 |     });
  15 |   });
  16 | 
  17 |   test('signup and navigate all pages without 404s', async ({ page }) => {
  18 |     await page.goto(`${BASE}/auth/sign-up`);
  19 | 
  20 |     await page.getByLabel(/alias/i).fill('TestUser');
  21 |     await page.getByLabel(/pin/i).fill('123456');
  22 |     await page.getByRole('button', { name: /sign up|create/i }).click();
  23 | 
> 24 |     await page.waitForURL(`${BASE}/chats`, { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  25 | 
  26 |     const pages = [
  27 |       '/chats',
  28 |       '/chats/channels',
  29 |       '/chats/settings',
  30 |       '/settings',
  31 |       '/legal/privacy',
  32 |       '/legal/terms',
  33 |       '/legal/cookies',
  34 |       '/legal/cookie-settings',
  35 |       '/legal/contact',
  36 |       '/legal/data-request',
  37 |       '/legal/dpa',
  38 |       '/legal/licenses',
  39 |       '/legal/security',
  40 |       '/legal/status',
  41 |       '/legal/subprocessors',
  42 |       '/legal/unsubscribe',
  43 |     ];
  44 | 
  45 |     for (const p of pages) {
  46 |       const res = await page.goto(`${BASE}${p}`);
  47 |       expect(res?.status(), `Expected 200 on ${p}`).toBe(200);
  48 |     }
  49 | 
  50 |     await page.screenshot({ path: 'client/tests/final-state.png', fullPage: true });
  51 |   });
  52 | });
  53 | 
```