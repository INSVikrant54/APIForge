import { test, expect } from '@playwright/test';

const BASE_URL = process.env.APIFORGE_URL || 'http://localhost:5173';

test('demo run exposes durations and opens failure details', async ({ page }) => {
  page.on('console', message => console.log(`BROWSER CONSOLE ${message.type()}: ${message.text()}`));
  page.on('pageerror', error => console.log(`PAGE ERROR: ${error.message}`));
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /find out how your api really behaves/i })).toBeVisible();

  await page.getByRole('button', { name: 'Run the demo' }).click();
  await expect(page.getByText(/test plan|tests/i).first()).toBeVisible({ timeout: 30000 });

  await page.getByRole('button', { name: /run .*tests/i }).click();
  await expect(page.getByRole('button', { name: /inspect failure/i }).first()).toBeVisible({ timeout: 30000 });

  const inspectButton = page.getByRole('button', { name: /^Inspect failure:/i }).first();
  await inspectButton.click();
  await page.waitForTimeout(500);
  console.log('DIALOG COUNT AFTER INSPECT:', await page.getByRole('dialog').count());
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('RESPONSE TIME')).toBeVisible();
  await expect(page.getByText(/ms$/).first()).toBeVisible();

  await page.screenshot({ path: 'test-results/dark-failure-modal.png', fullPage: true });
  await page.getByRole('button', { name: /close/i }).click();

  await page.getByRole('switch', { name: /switch to light theme/i }).click();
  await page.screenshot({ path: 'test-results/light-demo.png', fullPage: true });
});

test('mobile start screen remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Run the demo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test my API' })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-start.png', fullPage: true });
});
