import { test, expect } from '@playwright/test';

test.describe('Achievements API', () => {
  test('rejects missing payloads with a structured 400 response', async ({ request }) => {
    const response = await request.post('/api/achievements', {
      data: {},
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Missing achievement payload or auth token',
    });
  });
});
