import { test, expect } from '@playwright/test';

test.describe('Achievements API', () => {
  test('rejects missing payloads with a structured 400 response', async ({ request }) => {
    const response = await request.post('/api/achievements', {
      data: {},
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Missing achievement payload',
    });
  });

  test('rejects achievement creates without a Firebase ID token', async ({ request }) => {
    const response = await request.post('/api/achievements', {
      data: {
        achievement: {
          title: 'Playwright probe achievement',
          category: 'Work',
          story: 'This probe verifies the production achievement proxy accepts a valid payload.',
          impact: 'It proves the server-side proxy can create an achievement without the browser talking directly to Firestore.',
          achievementDate: '2026-03-31',
        },
        auth: {
          uid: 'playwright-probe',
          displayName: 'Playwright Probe',
          photoURL: null,
        },
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Missing Firebase ID token',
    });
  });

  test('accepts a valid achievement payload through the proxy when a Firebase ID token is provided', async ({ request }) => {
    const idToken = process.env.PLAYWRIGHT_FIREBASE_ID_TOKEN;

    test.skip(!idToken, 'Set PLAYWRIGHT_FIREBASE_ID_TOKEN to exercise the authenticated create path.');

    const response = await request.post('/api/achievements', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      data: {
        achievement: {
          title: 'Playwright probe achievement',
          category: 'Work',
          story: 'This probe verifies the production achievement proxy accepts a valid payload.',
          impact: 'It proves the same-origin proxy can create an achievement with a Firebase user token.',
          achievementDate: '2026-03-31',
        },
        auth: {
          uid: 'playwright-probe',
          displayName: 'Playwright Probe',
          photoURL: null,
        },
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      id: expect.any(String),
    });
  });
});
