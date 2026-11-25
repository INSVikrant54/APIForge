import { test, expect } from '@playwright/test';

const BASE_URL = process.env.APIFORGE_URL || 'http://localhost:5173';
const SECRET = 'browser-only-secret-value';

test('selects a named environment without persisting secret values', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Test my API' }).click();

  const selector = page.getByLabel('Environment', { exact: true });
  await expect(selector).toBeVisible();
  await expect(selector).toHaveValue('development');
  await selector.selectOption('staging');
  await expect(selector).toHaveValue('staging');

  await page.getByText('Environment variables').click();
  const baseUrl = page.getByLabel('Value for baseUrl');
  const apiKey = page.getByLabel('Value for apiKey');
  await baseUrl.fill('https://staging.example.com');
  await apiKey.fill(SECRET);
  await expect(apiKey).toHaveAttribute('type', 'password');

  await page.getByLabel('Target Endpoint URL').fill('{{baseUrl}}/pets');
  await expect(page.getByText('Resolved endpoint: https://staging.example.com/pets')).toBeVisible();

  const stored = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  expect(stored.includes(SECRET)).toBe(false);

  await selector.selectOption('production');
  await expect(apiKey).toHaveValue('');
  await selector.selectOption('staging');
  await expect(apiKey).toHaveValue(SECRET);
});
