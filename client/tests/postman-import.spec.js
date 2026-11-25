import { test, expect } from '@playwright/test';

const BASE_URL = process.env.APIFORGE_URL || 'http://localhost:5173';
const V21 = JSON.stringify({
  info: {
    name: 'Pets collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [{
    name: 'List pets',
    event: [{ listen: 'test', script: { exec: ['pm.environment.set("leak", "yes")'] } }],
    request: {
      method: 'GET',
      header: [{ key: 'X-API-Key', value: '{{apiKey}}' }],
      url: '{{baseUrl}}/pets?limit=5'
    }
  }]
});

test('imports a Postman v2.1 request without running scripts', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Import Postman' }).click();
  await page.locator('#postman-source').fill(V21);
  await page.getByRole('button', { name: 'Read collection' }).click();

  await expect(page.getByRole('button', { name: 'Use request' })).toBeVisible();
  await page.getByRole('button', { name: 'Use request' }).click();

  await expect(page.getByLabel('Target Endpoint URL')).toHaveValue('{{baseUrl}}/pets?limit=5');
  await expect(page.getByText(/scripts were not executed/i)).toBeVisible();
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.includes('leak')).toBe(false);
});

test('rejects a Postman v1.0 collection with a clear message', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Import Postman' }).click();
  await page.locator('#postman-source').fill(JSON.stringify({
    info: { name: 'Legacy', schema: 'https://schema.getpostman.com/json/collection/v1.0.0/collection.json' },
    item: []
  }));
  await page.getByRole('button', { name: 'Read collection' }).click();
  await expect(page.getByRole('alert')).toContainText('Postman Collection v1.0 is not supported');
});
