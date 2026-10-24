import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCurlCommand } from '../utils/curlGenerator.js';
import { demoStore } from '../services/demoStore.js';
import { explainFailure } from '../services/gemmaService.js';

test('Stage 4: cURL Reproduction Generator', async (t) => {
  await t.test('Generates formatted cURL command and redacts Authorization header', () => {
    const curl = generateCurlCommand('POST', 'https://api.example.com/orders', {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer supersecrettoken123'
    }, { productId: 101, quantity: 2 });

    assert.ok(curl.startsWith('curl -X POST "https://api.example.com/orders"'));
    assert.ok(curl.includes('-H "Content-Type: application/json"'));
    assert.ok(curl.includes('-H "Authorization: REDACTED_FOR_SECURITY"'));
    assert.ok(!curl.includes('supersecrettoken123'));
    assert.ok(curl.includes('-d "{\\"productId\\":101,\\"quantity\\":2}"'));
  });
});

test('Stage 4: Local Failure Diagnosis Engine', async (t) => {
  await t.test('Produces actionable remediation suggestion for negative quantity failure', async () => {
    const testCase = {
      name: 'Negative quantity rejected',
      category: 'business_rule',
      request: { method: 'POST', path: '/api/demo/orders', body: { quantity: -1 } },
      expected: { statusCodes: [400], description: 'Must reject negative quantity' }
    };
    const actual = {
      status: 201,
      body: { success: true, order: { quantity: -1, totalPrice: -500 } }
    };

    const explanation = await explainFailure({
      test: testCase,
      actual,
      businessRules: 'Quantity must be greater than zero.'
    });

    assert.ok(explanation.observedIssue);
    assert.ok(explanation.recommendedFix);
    assert.ok(explanation.suggestedCodeSnippet);
  });
});
