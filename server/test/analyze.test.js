import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndNormalizeTestPlan } from '../utils/schemaValidator.js';
import { generateTestPlan } from '../services/gemmaService.js';

test('Stage 3: Gemma 4 Schema Validator & Normalizer', async (t) => {
  await t.test('Validates and normalizes raw test plan', () => {
    const raw = {
      suiteName: 'Test Suite',
      summary: 'Summary description',
      assumptions: ['Assumption 1'],
      tests: [
        {
          id: 't-1',
          name: 'Valid Request',
          category: 'happy_path',
          severity: 'low',
          request: {
            method: 'POST',
            path: '/api/demo/orders',
            body: { productId: 101, quantity: 2, unitPrice: 500 }
          },
          expected: {
            statusCodes: [201],
            description: 'Order created'
          }
        }
      ]
    };

    const validated = validateAndNormalizeTestPlan(raw);
    assert.strictEqual(validated.suiteName, 'Test Suite');
    assert.strictEqual(validated.tests.length, 1);
    assert.strictEqual(validated.tests[0].request.method, 'POST');
    assert.strictEqual(validated.tests[0].expected.statusCodes[0], 201);
  });

  await t.test('Rejects empty or non-object plan', () => {
    assert.throws(() => validateAndNormalizeTestPlan(null), /valid JSON object/);
    assert.throws(() => validateAndNormalizeTestPlan({ tests: [] }), /at least one valid test case/);
  });
});

test('Stage 3: Offline Demo Fallback Generation', async (t) => {
  await t.test('Generates structured offline demo suite when key is absent', async () => {
    const plan = await generateTestPlan({
      method: 'POST',
      path: '/api/demo/orders',
      useOfflineDemo: true
    });

    assert.strictEqual(plan.isPredefinedDemo, true);
    assert.strictEqual(plan.tests.length, 8);
    // Find the negative quantity test that triggers the demo defect
    const defectTest = plan.tests.find(t => t.id === 'demo-004');
    assert.ok(defectTest, 'Must contain demo-004 negative quantity test');
    assert.strictEqual(defectTest.request.body.quantity, -1);
    assert.strictEqual(defectTest.expected.statusCodes[0], 400);
  });
});
