import { test, expect } from '@playwright/test';

const BASE_URL = process.env.APIFORGE_URL || 'http://localhost:5173';
const paths = Object.fromEntries(
  Array.from({ length: 6 }, (_, i) => [`/resource-${i}`, {
    get: {
      summary: `Read resource ${i}`,
      operationId: `getResource${i}`,
      responses: { '200': { description: 'OK' } }
    }
  }])
);
const SPEC = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Batch API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
  paths
});

test('multi-select is bounded to five endpoints before a batch starts', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Import OpenAPI' }).click();
  await page.locator('#openapi-source').fill(SPEC);
  await page.getByRole('button', { name: 'Read specification' }).click();

  await expect(page.getByLabel('Select all operations')).toBeVisible();
  await page.getByLabel('Select all operations').check();
  await expect(page.getByText(/6 selected/)).toBeVisible();
  const runBatch = page.getByRole('button', { name: 'Run selected batch' });
  await expect(runBatch).toBeDisabled();

  await page.getByLabel('Select GET /resource-5').uncheck();
  await expect(page.getByText(/5 selected/)).toBeVisible();
  await expect(runBatch).toBeEnabled();
});
