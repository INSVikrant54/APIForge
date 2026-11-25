import { test, expect } from '@playwright/test';

const BASE_URL = process.env.APIFORGE_URL || 'http://localhost:5173';

const SPECIFICATION = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Pets API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com/v1' }],
  paths: {
    '/pets': {
      post: {
        summary: 'Create a pet',
        operationId: 'createPet',
        parameters: [{
          name: 'dryRun',
          in: 'query',
          required: false,
          description: 'Validate without saving',
          schema: { type: 'boolean' },
          example: true,
        }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
                example: { name: 'Miso' },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Invalid input' },
        },
      },
    },
  },
});

test('imports an OpenAPI operation into the request workspace', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Import OpenAPI' }).click();
  await page.getByRole('textbox', { name: 'Specification' }).fill(SPECIFICATION);
  await page.getByRole('button', { name: 'Read specification' }).click();

  const operation = page.getByRole('article').filter({ hasText: 'Create a pet' });
  await expect(operation).toBeVisible();
  await expect(operation).toContainText('Expected: 201');
  await page.screenshot({ path: 'test-results/openapi-import-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/openapi-import-mobile.png', fullPage: true });
  await operation.getByRole('button', { name: 'Use endpoint' }).click();

  await expect(page.getByLabel('Target Endpoint URL')).toHaveValue('https://api.example.com/v1/pets?dryRun=true');
  await expect(page.getByLabel('Expected Success Status Code')).toHaveValue('201');
  await expect(page.getByText('Imported success responses: 201. These are used when generating tests.')).toBeVisible();
  await expect(page.getByLabel('Request Body JSON payload')).toContainText('Miso');
  await expect(page.getByLabel('API Contract Business Rules')).toContainText('Pets API');
  await expect(page.getByLabel('API Contract Business Rules')).toContainText('dryRun');
});

test('substitutes explicit path and query examples from the specification', async ({ page }) => {
  const spec = JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Pets API', version: '1.0.0' },
    servers: [{ url: 'https://api.example.com/v1' }],
    paths: {
      '/pets/{petId}': {
        get: {
          summary: 'Get a pet',
          operationId: 'getPet',
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'pet-42',
            },
            {
              name: 'verbose',
              in: 'query',
              required: false,
              schema: { type: 'boolean' },
              example: true,
            },
          ],
          responses: {
            '200': { description: 'OK' },
          },
        },
      },
    },
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Import OpenAPI' }).click();
  await page.getByRole('textbox', { name: 'Specification' }).fill(spec);
  await page.getByRole('button', { name: 'Read specification' }).click();
  await page
    .getByRole('article')
    .filter({ hasText: 'Get a pet' })
    .getByRole('button', { name: 'Use endpoint' })
    .click();

  await expect(page.getByLabel('Target Endpoint URL')).toHaveValue(
    'https://api.example.com/v1/pets/pet-42?verbose=true'
  );
  await expect(page.getByLabel('API Contract Business Rules')).toContainText('pet-42');
});

test('flags required path parameters that have no explicit example', async ({ page }) => {
  const spec = JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Pets API', version: '1.0.0' },
    servers: [{ url: 'https://api.example.com/v1' }],
    paths: {
      '/pets/{petId}': {
        get: {
          summary: 'Get a pet',
          operationId: 'getPet',
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'OK' },
          },
        },
      },
    },
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Import OpenAPI' }).click();
  await page.getByRole('textbox', { name: 'Specification' }).fill(spec);
  await page.getByRole('button', { name: 'Read specification' }).click();
  await page
    .getByRole('article')
    .filter({ hasText: 'Get a pet' })
    .getByRole('button', { name: 'Use endpoint' })
    .click();

  await expect(page.getByLabel('Target Endpoint URL')).toHaveValue(
    'https://api.example.com/v1/pets/{petId}'
  );
  await expect(page.getByLabel('API Contract Business Rules')).toContainText(
    'Unresolved path parameters: petId'
  );
});
