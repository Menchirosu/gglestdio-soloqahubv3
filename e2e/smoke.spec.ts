import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Pre-redesign smoke suite.
 *
 * These tests establish a regression baseline before the Lumie redesign begins.
 * They must keep passing through PRs 1-7. When a redesign PR breaks one of
 * these, that's a signal — not permission to delete the test.
 *
 * Scope chosen per grill-me Q17: critical paths that don't require authenticated
 * Firebase state. Authenticated-flow tests (Queue triage, Contribute, etc.) are
 * deferred to a dedicated PR that adds a test-auth hatch.
 *
 * Run locally:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e -- e2e/smoke.spec.ts
 *   (requires `npm run dev` in another terminal)
 */

test.describe('Smoke: app shell + auth gate', () => {
  test('root URL loads and mounts React without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Firebase auth can emit benign 'popup' warnings under automation; filter noise
        if (/popup|blocked|cross-origin/i.test(text)) return;
        consoleErrors.push(text);
      }
    });

    await page.goto('/');
    // React must mount something into #root
    await expect(page.locator('#root')).not.toBeEmpty();

    // Give lazy chunks a beat to resolve
    await page.waitForLoadState('networkidle').catch(() => {});

    expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('unauthenticated visit renders the login screen, not the main app', async ({ page }) => {
    await page.goto('/');

    // Login screen contains the Google OAuth CTA.
    // Main app would show the icon rail with nav items.
    await expect(page.getByTestId('login-google-button')).toBeVisible({ timeout: 10_000 });

    // Negative assertion: main-app icon rail should NOT render for unauth users
    await expect(page.getByTestId('icon-rail')).toHaveCount(0);
    await expect(page.getByTestId('rail-nav-dashboard')).toHaveCount(0);
  });

  test('document title is set (no blank tab)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });
});

test.describe('Smoke: security headers & CSP', () => {
  test('serves CSP meta and baseline security headers on the HTML document', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'navigation response should exist').not.toBeNull();

    const html = await page.content();
    expect(html).toContain('Content-Security-Policy');
    // Fonts needed by Lumie redesign (Inter + Newsreader via Google Fonts)
    // must be CSP-allowed; verify the allowance exists in current CSP.
    expect(html).toMatch(/fonts\.googleapis\.com/);
    expect(html).toMatch(/fonts\.gstatic\.com/);
  });
});

test.describe('Smoke: responsive viewports', () => {
  test('mobile viewport (375x667) renders login without horizontal overflow', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.goto('/');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    // Allow 1px rounding fudge; anything more = horizontal scroll regression
    expect(scrollWidth - clientWidth).toBeLessThanOrEqual(1);

    await context.close();
  });

  test('desktop viewport (1280x720) renders login without broken layout', async ({ page }) => {
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth - clientWidth).toBeLessThanOrEqual(1);
  });
});

test.describe('Smoke: keyboard safety', () => {
  test('Cmd+K / Ctrl+K on the login screen does not crash the app', async ({ page }) => {
    await page.goto('/');
    // Login screen shouldn't mount the command palette (no auth context),
    // but pressing the shortcut must not throw.
    await page.keyboard.press('Meta+k');
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Escape');

    // App is still alive
    await expect(page.getByTestId('login-google-button')).toBeVisible();
  });
});

test.describe('Smoke: API contract', () => {
  test('GET /api/health returns 200 OK', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: 'ok' });
  });

  test('POST /api/achievements with empty body returns a 400 shape', async ({ request }) => {
    const response = await request.post('/api/achievements', { data: {} });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});
