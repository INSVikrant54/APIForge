import test from 'node:test';
import assert from 'node:assert/strict';
import { demoStore } from '../services/demoStore.js';
import { evaluateTestAssertions } from '../services/assertionEngine.js';
import { validateTargetUrl } from '../middleware/ssrfGuard.js';

test('Stage 2: Demo API Safe vs Vulnerable Modes', async (t) => {
  await t.test('Safe mode rejects quantity <= 0 with 400', () => {
    demoStore.setMode('safe');
    const result = demoStore.createOrder({
      productId: 101,
      quantity: -1,
      unitPrice: 500
    });
    assert.strictEqual(result.status, 400);
    assert.match(result.body.error, /Quantity must be greater than zero/);
  });

  await t.test('Vulnerable mode accepts quantity -1 with 201 (reproducible defect)', () => {
    demoStore.setMode('vulnerable');
    const result = demoStore.createOrder({
      productId: 101,
      quantity: -1,
      unitPrice: 500
    });
    assert.strictEqual(result.status, 201);
    assert.strictEqual(result.body.order.quantity, -1);
    assert.strictEqual(result.body.order.totalPrice, -500);
  });

  await t.test('Both modes accept valid orders with 201', () => {
    demoStore.setMode('safe');
    const result = demoStore.createOrder({
      productId: 101,
      quantity: 2,
      unitPrice: 500
    });
    assert.strictEqual(result.status, 201);
    assert.strictEqual(result.body.order.totalPrice, 1000);
  });
});

test('Stage 2: Deterministic Assertion Engine', async (t) => {
  await t.test('Correctly identifies passing status code', () => {
    const actual = { status: 201, body: { success: true } };
    const expected = { statusCodes: [201], description: 'Order should be created' };
    const res = evaluateTestAssertions(actual, expected);
    assert.strictEqual(res.passed, true);
    assert.strictEqual(res.assertions.length, 1);
  });

  await t.test('Correctly identifies failing status code (e.g. vulnerable defect)', () => {
    const actual = { status: 201, body: { success: true } };
    const expected = { statusCodes: [400], description: 'Negative quantity must be rejected' };
    const res = evaluateTestAssertions(actual, expected);
    assert.strictEqual(res.passed, false);
    assert.match(res.primaryFailure, /Expected HTTP 400, but received 201/);
  });

  await t.test('Evaluates declarative field equality and math invariants', () => {
    const actual = {
      status: 201,
      body: {
        order: {
          quantity: 2,
          unitPrice: 500,
          totalPrice: 1000
        }
      }
    };
    const expected = {
      statusCodes: [201],
      assertions: [
        { target: 'body.order.quantity', operator: 'equals', value: 2 },
        { target: 'body.order.totalPrice', operator: 'greaterThan', value: 0 }
      ]
    };
    const res = evaluateTestAssertions(actual, expected);
    assert.strictEqual(res.passed, true);
  });
});

test('Stage 2: SSRF Guard Security', async (t) => {
  await t.test('Blocks cloud metadata IP 169.254.169.254', () => {
    const check = validateTargetUrl('http://169.254.169.254/latest/meta-data/');
    assert.strictEqual(check.safe, false);
    assert.match(check.error, /SSRF Guard blocked access/);
  });

  await t.test('Blocks local/private 10.0.0.1 and 192.168.1.1', () => {
    assert.strictEqual(validateTargetUrl('http://10.0.0.1/admin').safe, false);
    assert.strictEqual(validateTargetUrl('http://192.168.1.1/router').safe, false);
  });

  await t.test('Allows safe public URLs', () => {
    const check = validateTargetUrl('https://api.example.com/v1/orders');
    assert.strictEqual(check.safe, true);
  });

  await t.test('Allows internal demo endpoint /api/demo/orders', () => {
    const check = validateTargetUrl('/api/demo/orders', 5000);
    assert.strictEqual(check.safe, true);
    assert.strictEqual(check.isInternalDemo, true);
  });
});
